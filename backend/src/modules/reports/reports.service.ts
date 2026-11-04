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
    const from = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = endDate ? new Date(endDate) : now;
    if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new BadRequestException('Datas inválidas.');
    if (from > to) throw new BadRequestException('Data inicial não pode ser superior à data final.');
    return { from, to };
  }

  async getSummary(pharmacyId: string, query: ReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);

    const [salesAgg, expensesAgg, returnsAgg, refundsAgg, expiredLotsCount, lowStockResult] =
      await this.prisma.$transaction([
        this.prisma.sale.aggregate({
          where: { pharmacyId, status: 'CONFIRMED', createdAt: { gte: from, lte: to } },
          _count: true, _sum: { total: true },
        }),
        this.prisma.expense.aggregate({
          where: { pharmacyId, status: 'CONFIRMED', expenseDate: { gte: from, lte: to } },
          _count: true, _sum: { amount: true },
        }),
        this.prisma.saleReturn.aggregate({
          where: { pharmacyId, status: 'CONFIRMED', createdAt: { gte: from, lte: to } },
          _count: true, _sum: { totalRefund: true },
        }),
        this.prisma.returnRefund.aggregate({
          where: { returnLine: { return: { pharmacyId } }, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
          _count: true, _sum: { amount: true },
        }),
        this.prisma.stockLot.count({
          where: { pharmacyId, expiryDate: { lt: new Date() }, quantityAvailable: { gt: 0 } },
        }),
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM (
            SELECT p.id FROM products p
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
      sales: { count: salesAgg._count, total: (salesAgg._sum.total ?? new Decimal(0)).toFixed(2) },
      expenses: { count: expensesAgg._count, total: (expensesAgg._sum.amount ?? new Decimal(0)).toFixed(2) },
      returns: { count: returnsAgg._count, total: (returnsAgg._sum.totalRefund ?? new Decimal(0)).toFixed(2) },
      refunds: { count: refundsAgg._count, total: (refundsAgg._sum.amount ?? new Decimal(0)).toFixed(2) },
      stock: { lowStockCount: Number(lowStock), expiredLotsCount },
    };
  }

  async getSalesReport(pharmacyId: string, query: ReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);
    const status = (query.status ?? 'CONFIRMED') as 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

    const sales = await this.prisma.sale.findMany({
      where: {
        pharmacyId,
        status,
        createdAt: { gte: from, lte: to },
        ...(query.method ? { payments: { some: { method: query.method } } } : {}),
      },
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
        id: s.id, saleNumber: s.saleNumber, status: s.status,
        total: s.total.toFixed(2), paid: paid.toFixed(2), pending: s.total.sub(paid).toFixed(2),
        createdAt: s.createdAt.toISOString(), user: s.user.fullName, operatorName: s.operatorName ?? null,
        payments: s.payments.map((p) => ({ method: p.method, amount: p.amount.toFixed(2) })),
      };
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        count: sales.length, totalSold: totalSold.toFixed(2),
        totalPaid: totalPaid.toFixed(2), totalPending: totalSold.sub(totalPaid).toFixed(2),
      },
      byPaymentMethod: Array.from(byMethod.entries()).map(([method, data]) => ({
        method, count: data.count, total: data.total.toFixed(2),
      })),
      sales: salesResult,
    };
  }

  async getExpensesReport(pharmacyId: string, query: ExpenseReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);
    const status = (query.status ?? 'CONFIRMED') as 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

    let whereClause = Prisma.sql`e."pharmacyId" = ${pharmacyId}::uuid AND e.status = ${status}::"ExpenseStatus" AND e."expenseDate" >= ${from} AND e."expenseDate" <= ${to}`;
    if (query.category) whereClause = Prisma.sql`${whereClause} AND e.category = ${query.category}::"ExpenseCategory"`;
    if (query.method) whereClause = Prisma.sql`${whereClause} AND e.method = ${query.method}::"PaymentMethod"`;
    if (query.paidFrom) whereClause = Prisma.sql`${whereClause} AND e."paidFrom" = ${query.paidFrom}::"ExpensePaidFrom"`;

    const [expenses, byPaidFromRaw, byCategoryRaw, byMethodRaw] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where: {
          pharmacyId, status, expenseDate: { gte: from, lte: to },
          ...(query.category ? { category: query.category } : {}),
          ...(query.method ? { method: query.method } : {}),
          ...(query.paidFrom ? { paidFrom: query.paidFrom } : {}),
        },
        include: { user: { select: { fullName: true } } },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.$queryRaw<Array<{ paidFrom: string, count: bigint, total: any }>>`
        SELECT e."paidFrom" AS "paidFrom", COUNT(*)::bigint as count, SUM(e.amount) as total
        FROM expenses e WHERE ${whereClause} GROUP BY e."paidFrom"
      `,
      this.prisma.$queryRaw<Array<{ category: string, count: bigint, total: any }>>`
        SELECT e.category, COUNT(*)::bigint as count, SUM(e.amount) as total
        FROM expenses e WHERE ${whereClause} GROUP BY e.category
      `,
      this.prisma.$queryRaw<Array<{ method: string, count: bigint, total: any }>>`
        SELECT e.method, COUNT(*)::bigint as count, SUM(e.amount) as total
        FROM expenses e WHERE ${whereClause} GROUP BY e.method
      `,
    ]);

    let total = new Decimal(0);
    let cashTotal = new Decimal(0);
    let digitalTotal = new Decimal(0);
    for (const e of expenses) {
      total = total.add(e.amount);
      if (e.paidFrom === 'PHARMACY_CASH') cashTotal = cashTotal.add(e.amount);
      else digitalTotal = digitalTotal.add(e.amount);
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: { count: expenses.length, total: total.toFixed(2), cashTotal: cashTotal.toFixed(2), digitalTotal: digitalTotal.toFixed(2) },
      byCategory: byCategoryRaw.map((g) => ({ category: g.category, count: Number(g.count), total: new Decimal(g.total || 0).toFixed(2) })),
      byPaidFrom: byPaidFromRaw.map((g) => ({ paidFrom: g.paidFrom, count: Number(g.count), total: new Decimal(g.total || 0).toFixed(2) })),
      byMethod: byMethodRaw.map((g) => ({ method: g.method, count: Number(g.count), total: new Decimal(g.total || 0).toFixed(2) })),
      expenses: expenses.map((e) => ({
        id: e.id, description: e.description, category: e.category, method: e.method, paidFrom: e.paidFrom,
        amount: e.amount.toFixed(2), status: e.status, expenseDate: e.expenseDate.toISOString(), user: e.user.fullName,
      })),
    };
  }

  async getCashReport(pharmacyId: string, query: ReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);
    const sessions = await this.prisma.cashSession.findMany({
      where: { pharmacyId, openedAt: { gte: from, lte: to } },
      include: { payments: true, movements: true, user: { select: { fullName: true } } },
      orderBy: { openedAt: 'desc' },
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      sessions: sessions.map((s) => {
        const cashSalePayments = s.payments.filter((p) => p.method === 'CASH').reduce((acc, p) => acc.add(p.amount), new Decimal(0));
        const cashIn = s.movements.filter((m) => m.type === 'IN').reduce((acc, m) => acc.add(m.amount), new Decimal(0));
        const cashOutTotal = s.movements.filter((m) => m.type === 'OUT' && m.method === 'CASH').reduce((acc, m) => acc.add(m.amount), new Decimal(0));
        const expensesCash = s.movements.filter((m) => m.type === 'OUT' && m.method === 'CASH' && m.expenseId !== null).reduce((acc, m) => acc.add(m.amount), new Decimal(0));
        const refundsCash = s.movements.filter((m) => m.type === 'OUT' && m.method === 'CASH' && m.expenseId === null && m.reason.startsWith('Reembolso')).reduce((acc, m) => acc.add(m.amount), new Decimal(0));
        const manualOut = cashOutTotal.sub(expensesCash).sub(refundsCash);
        const expected = new Decimal(s.openingBalance).add(cashSalePayments).add(cashIn).sub(cashOutTotal);

        return {
          id: s.id, status: s.status, openedAt: s.openedAt.toISOString(), closedAt: s.closedAt?.toISOString() ?? null,
          user: s.user.fullName, openingBalance: s.openingBalance.toFixed(2),
          cashSalePayments: cashSalePayments.toFixed(2), cashIn: cashIn.toFixed(2), cashOut: cashOutTotal.toFixed(2),
          breakdown: { expensesCash: expensesCash.toFixed(2), refundsCash: refundsCash.toFixed(2), manualOut: manualOut.toFixed(2) },
          expectedBalance: expected.toFixed(2), countedBalance: s.countedBalance?.toFixed(2) ?? null,
          difference: s.difference?.toFixed(2) ?? null,
        };
      }),
    };
  }

  private async financePeriod(pharmacyId: string, from: Date, to: Date) {
    const n = (v: any) => Number(v ?? 0);
    const [rows, exp, ret] = await Promise.all([
      this.prisma.$queryRaw<Array<{ revenue: any; revenue_costed: any; cogs: any; lines_total: bigint; lines_no_cost: bigint }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(sl.subtotal), 0) AS revenue,
          COALESCE(SUM(sl.subtotal) FILTER (WHERE c.has_cost), 0) AS revenue_costed,
          COALESCE(SUM(c.cost) FILTER (WHERE c.has_cost), 0) AS cogs,
          COUNT(*)::bigint AS lines_total,
          (COUNT(*) FILTER (WHERE NOT c.has_cost))::bigint AS lines_no_cost
        FROM sales s
        JOIN sale_lines sl ON sl."saleId" = s.id
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(x.quantity * x."unitCost"), 0) AS cost,
                 (COUNT(*) > 0 AND BOOL_AND(x."unitCost" IS NOT NULL)) AS has_cost
          FROM sale_line_lots x WHERE x."saleLineId" = sl.id
        ) c ON true
        WHERE s."pharmacyId" = ${pharmacyId}::uuid AND s.status = 'CONFIRMED'
          AND s."createdAt" >= ${from} AND s."createdAt" <= ${to}
      `),
      this.prisma.expense.aggregate({
        where: { pharmacyId, status: 'CONFIRMED', expenseDate: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      this.prisma.saleReturn.aggregate({
        where: { pharmacyId, status: 'CONFIRMED', createdAt: { gte: from, lte: to } },
        _sum: { totalRefund: true },
      }),
    ]);
    const r = rows[0];
    const revenue = n(r?.revenue);
    const revenueCosted = n(r?.revenue_costed);
    const cogs = n(r?.cogs);
    const expenses = n(exp._sum.amount);
    const returns = n(ret._sum.totalRefund);
    const grossProfit = revenueCosted - cogs;
    const netProfit = grossProfit - expenses - returns;
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10000) / 100 : null);
    return {
      revenue, revenueCosted, cogs, grossProfit, expenses, returns, netProfit,
      marginGross: pct(grossProfit, revenueCosted),
      marginNet: pct(netProfit, revenueCosted),
      expensesOnSales: pct(expenses, revenue),
      returnRate: pct(returns, revenue),
      excluded: { lines: Number(r?.lines_no_cost ?? 0), linesTotal: Number(r?.lines_total ?? 0), revenue: Math.round((revenue - revenueCosted) * 100) / 100 },
    };
  }

  async getFinanceDetails(pharmacyId: string, query: ReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);
    const days = (to.getTime() - from.getTime()) / 86400000;
    const g = Prisma.raw(days > 62 ? "'month'" : "'day'");
    const n = (v: any) => Number(v ?? 0);
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const costJoin = Prisma.sql`LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(x.quantity * x."unitCost"), 0) AS cost,
             (COUNT(*) > 0 AND BOOL_AND(x."unitCost" IS NOT NULL)) AS has_cost
      FROM sale_line_lots x WHERE x."saleLineId" = sl.id
    ) c ON true`;
    const [salesSeries, expSeries, ranking, stockRows, stale, expRep, salesRep] = await Promise.all([
      this.prisma.$queryRaw<Array<{ k: string; revenue: any; revenue_costed: any; cogs: any }>>(Prisma.sql`
        SELECT to_char(date_trunc(${g}, s."createdAt"), 'YYYY-MM-DD') AS k,
          COALESCE(SUM(sl.subtotal), 0) AS revenue,
          COALESCE(SUM(sl.subtotal) FILTER (WHERE c.has_cost), 0) AS revenue_costed,
          COALESCE(SUM(c.cost) FILTER (WHERE c.has_cost), 0) AS cogs
        FROM sales s JOIN sale_lines sl ON sl."saleId" = s.id ${costJoin}
        WHERE s."pharmacyId" = ${pharmacyId}::uuid AND s.status = 'CONFIRMED' AND s."createdAt" >= ${from} AND s."createdAt" <= ${to}
        GROUP BY 1 ORDER BY 1`),
      this.prisma.$queryRaw<Array<{ k: string; total: any }>>(Prisma.sql`
        SELECT to_char(date_trunc(${g}, e."expenseDate"), 'YYYY-MM-DD') AS k, COALESCE(SUM(e.amount), 0) AS total
        FROM expenses e
        WHERE e."pharmacyId" = ${pharmacyId}::uuid AND e.status = 'CONFIRMED'::"ExpenseStatus" AND e."expenseDate" >= ${from} AND e."expenseDate" <= ${to}
        GROUP BY 1 ORDER BY 1`),
      this.prisma.$queryRaw<Array<{ id: string; name: string; units: bigint; revenue: any; profit: any; lines_no_cost: bigint }>>(Prisma.sql`
        SELECT sl."productId" AS id, p.name, SUM(sl.quantity)::bigint AS units, SUM(sl.subtotal) AS revenue,
          COALESCE(SUM(sl.subtotal - c.cost) FILTER (WHERE c.has_cost), 0) AS profit,
          (COUNT(*) FILTER (WHERE NOT c.has_cost))::bigint AS lines_no_cost
        FROM sales s JOIN sale_lines sl ON sl."saleId" = s.id JOIN products p ON p.id = sl."productId" ${costJoin}
        WHERE s."pharmacyId" = ${pharmacyId}::uuid AND s.status = 'CONFIRMED' AND s."createdAt" >= ${from} AND s."createdAt" <= ${to}
        GROUP BY sl."productId", p.name ORDER BY units DESC LIMIT 50`),
      this.prisma.$queryRaw<Array<{ value: any; units_no_cost: any; expiring_value: any; expiring_lots: bigint }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(l."quantityAvailable" * l."realUnitCost") FILTER (WHERE l."realUnitCost" IS NOT NULL), 0) AS value,
          COALESCE(SUM(l."quantityAvailable") FILTER (WHERE l."realUnitCost" IS NULL), 0) AS units_no_cost,
          COALESCE(SUM(l."quantityAvailable" * l."realUnitCost") FILTER (WHERE l."realUnitCost" IS NOT NULL AND l."expiryDate" IS NOT NULL AND l."expiryDate" > NOW() AND l."expiryDate" <= NOW() + INTERVAL '60 days'), 0) AS expiring_value,
          (COUNT(*) FILTER (WHERE l."expiryDate" IS NOT NULL AND l."expiryDate" > NOW() AND l."expiryDate" <= NOW() + INTERVAL '60 days'))::bigint AS expiring_lots
        FROM stock_lots l WHERE l."pharmacyId" = ${pharmacyId}::uuid AND l."quantityAvailable" > 0 AND l.status = 'ACTIVE'`),
      this.prisma.$queryRaw<Array<{ id: string; name: string; units: any }>>(Prisma.sql`
        SELECT p.id, p.name, SUM(l."quantityAvailable") AS units
        FROM products p JOIN stock_lots l ON l."productId" = p.id AND l."quantityAvailable" > 0 AND l.status = 'ACTIVE'
        WHERE p."pharmacyId" = ${pharmacyId}::uuid AND p.status = 'ACTIVE'
          AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m."productId" = p.id AND m.type = 'SALE' AND m."createdAt" >= ${from} AND m."createdAt" <= ${to})
        GROUP BY p.id, p.name ORDER BY units DESC LIMIT 50`),
      this.getExpensesReport(pharmacyId, query as any),
      this.getSalesReport(pharmacyId, query),
    ]);
    const map = new Map<string, { k: string; revenue: number; grossProfit: number; expenses: number }>();
    for (const r of salesSeries) map.set(r.k, { k: r.k, revenue: n(r.revenue), grossProfit: r2(n(r.revenue_costed) - n(r.cogs)), expenses: 0 });
    for (const e of expSeries) { const cur = map.get(e.k) ?? { k: e.k, revenue: 0, grossProfit: 0, expenses: 0 }; cur.expenses = n(e.total); map.set(e.k, cur); }
    const st = stockRows[0];
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      granularity: days > 62 ? 'month' : 'day',
      series: Array.from(map.values()).sort((a, b) => a.k.localeCompare(b.k)),
      byPaymentMethod: salesRep.byPaymentMethod,
      expensesByCategory: expRep.byCategory,
      expensesByOrigin: expRep.byPaidFrom,
      products: ranking.map((p) => ({ id: p.id, name: p.name, units: Number(p.units), revenue: n(p.revenue), profit: r2(n(p.profit)), linesNoCost: Number(p.lines_no_cost) })),
      stock: { valueAtCost: r2(n(st?.value)), unitsNoCost: n(st?.units_no_cost), expiringValue: r2(n(st?.expiring_value)), expiringLots: Number(st?.expiring_lots ?? 0), expiringDays: 60 },
      noMovement: stale.map((p) => ({ id: p.id, name: p.name, units: n(p.units) })),
    };
  }
  async getFinance(pharmacyId: string, query: ReportQueryDto) {
    const { from, to } = this.validateDateRange(query.startDate, query.endDate);
    const span = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - span);
    const [current, previous] = await Promise.all([
      this.financePeriod(pharmacyId, from, to),
      this.financePeriod(pharmacyId, prevFrom, prevTo),
    ]);
    const change = (a: number, b: number) => (b !== 0 ? Math.round(((a - b) / Math.abs(b)) * 1000) / 10 : null);
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      previousPeriod: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
      current,
      previous,
      change: {
        revenue: change(current.revenue, previous.revenue),
        grossProfit: change(current.grossProfit, previous.grossProfit),
        expenses: change(current.expenses, previous.expenses),
        netProfit: change(current.netProfit, previous.netProfit),
      },
    };
  }

  async getStockReport(pharmacyId: string, _query: ReportQueryDto) {
    const products = await this.prisma.product.findMany({
      where: { pharmacyId, status: 'ACTIVE' },
      include: { stockLots: { where: { quantityAvailable: { gt: 0 } }, orderBy: { expiryDate: 'asc' } } },
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
        if (l.expiryDate && l.expiryDate < now) { status = 'EXPIRED'; expiredLotsCount++; }
        else if (l.expiryDate && l.expiryDate < thirtyDaysFromNow) { status = 'NEAR_EXPIRY'; nearExpiryLotsCount++; }
        productStockValue = productStockValue.add(new Decimal(l.unitCost).mul(l.quantityAvailable));
        totalStockValue = totalStockValue.add(new Decimal(l.unitCost).mul(l.quantityAvailable));
        return { id: l.id, lotNumber: l.lotNumber, quantityAvailable: l.quantityAvailable, expiryDate: l.expiryDate ? l.expiryDate.toISOString() : null, unitCost: l.unitCost.toFixed(2), status };
      });

      return { productId: p.id, productName: p.name, sku: p.sku, totalAvailable, totalValue: productStockValue.toFixed(2), lots };
    });

    return {
      summary: { totalProducts, totalLots, expiredLotsCount, nearExpiryLotsCount, totalStockValue: totalStockValue.toFixed(2) },
      products: productsResult.filter((p) => p.totalAvailable > 0),
    };
  }
}
