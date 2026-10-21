import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { ReportQueryDto, ExpenseReportQueryDto } from './dto/report-query.dto';

const LOW_STOCK_THRESHOLD = 10;
const NEAR_EXPIRY_DAYS = 30;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateDateRange(startDate?: string, endDate?: string): { from: Date; to: Date } {
    const now = new Date();
    const from = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = endDate ? new Date(endDate) : now;

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Datas inválidas.');
    }
    if (from > to) {
      throw new BadRequestException('Data inicial não pode ser superior à data final.');
    }
    return { from, to };
  }

  async getSummary(pharmacyId: string, query: ReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);

    const [salesAgg, expensesAgg, returnsAgg, refundsAgg, expiredLotsCount, lowStockResult] =
      await this.prisma.$transaction([
        this.prisma.sale.aggregate({
          where: { pharmacyId, status: 'CONFIRMED', createdAt: { gte: from, lte: to } },
          _count: true,
          _sum: { total: true },
        }),
        this.prisma.expense.aggregate({
          where: { pharmacyId, status: 'CONFIRMED', expenseDate: { gte: from, lte: to } },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.saleReturn.aggregate({
          where: { pharmacyId, status: 'CONFIRMED', createdAt: { gte: from, lte: to } },
          _count: true,
          _sum: { totalRefund: true },
        }),
        this.prisma.returnRefund.aggregate({
          where: {
            returnLine: { return: { pharmacyId } },
            status: 'COMPLETED',
            createdAt: { gte: from, lte: to },
          },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.stockLot.count({
          where: { pharmacyId, expiryDate: { lt: new Date() }, quantityAvailable: { gt: 0 } },
        }),
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM (
            SELECT p.id
            FROM products p
            LEFT JOIN stock_lots l ON l."productId" = p.id
            WHERE p."pharmacyId" = ${pharmacyId}::uuid AND p.status = 'ACTIVE'
            GROUP BY p.id
            HAVING COALESCE(SUM(l."quantityAvailable"), 0) < ${LOW_STOCK_THRESHOLD}
          ) AS low_stock
        `,
      ]);

    const lowStock = lowStockResult[0]?.count ?? BigInt(0);

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      sales: {
        count: salesAgg._count,
        total: (salesAgg._sum.total ?? new Decimal(0)).toFixed(2),
      },
      expenses: {
        count: expensesAgg._count,
        total: (expensesAgg._sum.amount ?? new Decimal(0)).toFixed(2),
      },
      returns: {
        count: returnsAgg._count,
        total: (returnsAgg._sum.totalRefund ?? new Decimal(0)).toFixed(2),
      },
      refunds: {
        count: refundsAgg._count,
        total: (refundsAgg._sum.amount ?? new Decimal(0)).toFixed(2),
      },
      stock: {
        lowStockCount: Number(lowStock),
        expiredLotsCount,
      },
    };
  }

  async getSalesReport(pharmacyId: string, query: ReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);
    const status = (query.status ?? 'CONFIRMED') as 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

    const sales = await this.prisma.sale.findMany({
      where: { pharmacyId, status, createdAt: { gte: from, lte: to } },
      include: { payments: true, user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let totalSold = new Decimal(0);
    let totalPaid = new Decimal(0);
    const byMethod = new Map<string, { count: number; total: Decimal }>();

    const salesResult = sales.map((s) => {
      const paid = s.payments.reduce((acc, p) => acc.add(p.amount), new Decimal(0));
      totalSold = totalSold.add(s.total);
      totalPaid = totalPaid.add(paid);

      for (const p of s.payments) {
        const current = byMethod.get(p.method) ?? { count: 0, total: new Decimal(0) };
        current.count += 1;
        current.total = current.total.add(p.amount);
        byMethod.set(p.method, current);
      }

      return {
        id: s.id,
        saleNumber: s.saleNumber,
        status: s.status,
        total: s.total.toFixed(2),
        paid: paid.toFixed(2),
        pending: s.total.sub(paid).toFixed(2),
        createdAt: s.createdAt.toISOString(),
        user: s.user.fullName,
        payments: s.payments.map((p) => ({ method: p.method, amount: p.amount.toFixed(2) })),
      };
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        count: sales.length,
        totalSold: totalSold.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalPending: totalSold.sub(totalPaid).toFixed(2),
      },
      byPaymentMethod: Array.from(byMethod.entries()).map(([method, data]) => ({
        method,
        count: data.count,
        total: data.total.toFixed(2),
      })),
      sales: salesResult,
    };
  }

  async getExpensesReport(pharmacyId: string, query: ExpenseReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);
    const status = (query.status ?? 'CONFIRMED') as 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

    let whereClause = Prisma.sql`e."pharmacyId" = ${pharmacyId}::uuid AND e.status = ${status}::"ExpenseStatus" AND e."expenseDate" >= ${from} AND e."expenseDate" <= ${to}`;
    
    if (query.category) {
      whereClause = Prisma.sql`${whereClause} AND e.category = ${query.category}::"ExpenseCategory"`;
    }
    if (query.method) {
      whereClause = Prisma.sql`${whereClause} AND e.method = ${query.method}::"PaymentMethod"`;
    }

    const [expenses, byCategoryRaw, byMethodRaw] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where: {
          pharmacyId,
          status,
          expenseDate: { gte: from, lte: to },
          ...(query.category ? { category: query.category } : {}),
          ...(query.method ? { method: query.method } : {}),
        },
        include: { user: { select: { fullName: true } } },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.$queryRaw<Array<{ category: string, count: bigint, total: any }>>`
        SELECT e.category, COUNT(*)::bigint as count, SUM(e.amount) as total
        FROM expenses e
        WHERE ${whereClause}
        GROUP BY e.category
      `,
      this.prisma.$queryRaw<Array<{ method: string, count: bigint, total: any }>>`
        SELECT e.method, COUNT(*)::bigint as count, SUM(e.amount) as total
        FROM expenses e
        WHERE ${whereClause}
        GROUP BY e.method
      `,
    ]);

    let total = new Decimal(0);
    let cashTotal = new Decimal(0);
    let digitalTotal = new Decimal(0);

    for (const e of expenses) {
      total = total.add(e.amount);
      if (e.method === 'CASH') cashTotal = cashTotal.add(e.amount);
      else digitalTotal = digitalTotal.add(e.amount);
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        count: expenses.length,
        total: total.toFixed(2),
        cashTotal: cashTotal.toFixed(2),
        digitalTotal: digitalTotal.toFixed(2),
      },
      byCategory: byCategoryRaw.map((g) => ({
        category: g.category,
        count: Number(g.count),
        total: new Decimal(g.total || 0).toFixed(2),
      })),
      byMethod: byMethodRaw.map((g) => ({
        method: g.method,
        count: Number(g.count),
        total: new Decimal(g.total || 0).toFixed(2),
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        method: e.method,
        amount: e.amount.toFixed(2),
        status: e.status,
        expenseDate: e.expenseDate.toISOString(),
        user: e.user.fullName,
      })),
    };
  }

  async getCashReport(pharmacyId: string, query: ReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);

    const sessions = await this.prisma.cashSession.findMany({
      where: { pharmacyId, openedAt: { gte: from, lte: to } },
      include: {
        payments: true,
        movements: true,
        user: { select: { fullName: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      sessions: sessions.map((s) => {
        const cashSalePayments = s.payments
          .filter((p) => p.method === 'CASH')
          .reduce((acc, p) => acc.add(p.amount), new Decimal(0));

        const cashIn = s.movements
          .filter((m) => m.type === 'IN')
          .reduce((acc, m) => acc.add(m.amount), new Decimal(0));

        const cashOutTotal = s.movements
          .filter((m) => m.type === 'OUT')
          .reduce((acc, m) => acc.add(m.amount), new Decimal(0));

        const expensesCash = s.movements
          .filter((m) => m.type === 'OUT' && m.expenseId !== null)
          .reduce((acc, m) => acc.add(m.amount), new Decimal(0));

        const refundsCash = s.movements
          .filter((m) => m.type === 'OUT' && m.expenseId === null && m.reason.startsWith('Reembolso'))
          .reduce((acc, m) => acc.add(m.amount), new Decimal(0));

        const manualOut = cashOutTotal.sub(expensesCash).sub(refundsCash);

        const expected = new Decimal(s.openingBalance)
          .add(cashSalePayments)
          .add(cashIn)
          .sub(cashOutTotal);

        return {
          id: s.id,
          status: s.status,
          openedAt: s.openedAt.toISOString(),
          closedAt: s.closedAt?.toISOString() ?? null,
          user: s.user.fullName,
          openingBalance: s.openingBalance.toFixed(2),
          cashSalePayments: cashSalePayments.toFixed(2),
          cashIn: cashIn.toFixed(2),
          cashOut: cashOutTotal.toFixed(2),
          breakdown: {
            expensesCash: expensesCash.toFixed(2),
            refundsCash: refundsCash.toFixed(2),
            manualOut: manualOut.toFixed(2),
          },
          expectedBalance: expected.toFixed(2),
          countedBalance: s.countedBalance?.toFixed(2) ?? null,
          difference: s.difference?.toFixed(2) ?? null,
        };
      }),
    };
  }

  async getStockReport(pharmacyId: string, _query: ReportQueryDto) {
    const products = await this.prisma.product.findMany({
      where: { pharmacyId, status: 'ACTIVE' },
      include: {
        stockLots: { where: { quantityAvailable: { gt: 0 } }, orderBy: { expiryDate: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    let totalProducts = 0;
    let totalLots = 0;
    let expiredLotsCount = 0;
    let nearExpiryLotsCount = 0;
    let totalStockValue = new Decimal(0);

    const productsResult = products.map((p) => {
      const totalAvailable = p.stockLots.reduce((acc, l) => acc + l.quantityAvailable, 0);
      if (totalAvailable > 0) totalProducts++;
      totalLots += p.stockLots.length;

      let productStockValue = new Decimal(0);

      const lots = p.stockLots.map((l) => {
        let status: 'OK' | 'NEAR_EXPIRY' | 'EXPIRED' = 'OK';
        if (l.expiryDate < now) {
          status = 'EXPIRED';
          expiredLotsCount++;
        } else if (l.expiryDate < thirtyDaysFromNow) {
          status = 'NEAR_EXPIRY';
          nearExpiryLotsCount++;
        }
        
        // Cálculo exato por lote (Decimal)
        productStockValue = productStockValue.add(new Decimal(l.unitCost).mul(l.quantityAvailable));
        totalStockValue = totalStockValue.add(new Decimal(l.unitCost).mul(l.quantityAvailable));
        
        return {
          id: l.id,
          lotNumber: l.lotNumber,
          quantityAvailable: l.quantityAvailable,
          expiryDate: l.expiryDate.toISOString(),
          unitCost: l.unitCost.toFixed(2),
          status,
        };
      });

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        totalAvailable,
        totalValue: productStockValue.toFixed(2),
        lots,
      };
    });

    return {
      summary: {
        totalProducts,
        totalLots,
        expiredLotsCount,
        nearExpiryLotsCount,
        totalStockValue: totalStockValue.toFixed(2),
      },
      products: productsResult.filter((p) => p.totalAvailable > 0),
    };
  }
}