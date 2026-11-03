// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { calcOf, purchaseCalcInclude } from '../purchases/purchase-calc';

const METHODS_FOR: Record<string, string[]> = {
  PHARMACY_CASH: ['CASH'],
  OWNER_CASH: ['CASH'],
  BANK: ['TRANSFER', 'CARD'],
  MPESA: ['MPESA'],
  EMOLA: ['EMOLA'],
  OTHER: ['OTHER'],
};

@Injectable()
export class SupplierPaymentsService {
  constructor(private prisma: PrismaService) {}

  async pay(tx: any, pharmacyId: string, userId: string, purchase: any, amount: number, paidFrom: string, method: string, notes?: string | null) {
    if (!METHODS_FOR[paidFrom]) throw new BadRequestException('Origem do pagamento inválida.');
    if (!METHODS_FOR[paidFrom].includes(method)) throw new BadRequestException('Método inválido para a origem escolhida.');

    let cashSessionId: string | null = null;
    let cashMovementId: string | null = null;

    if (paidFrom === 'PHARMACY_CASH') {
      const st = await tx.pharmacySettings.findUnique({ where: { pharmacyId } });
      if (st && st.allowCashExpenses === false) {
        throw new BadRequestException('Pagar pela caixa da farmácia está desligado em Definições.');
      }
      const sessions = await tx.$queryRaw`
        SELECT * FROM "cash_sessions"
        WHERE "pharmacyId" = ${pharmacyId}::uuid AND "userId" = ${userId}::uuid AND status = 'OPEN'
        FOR UPDATE
      `;
      const session = sessions[0];
      if (!session) throw new BadRequestException('Não tem sessão de caixa aberta.');
      const mv = await tx.cashMovement.create({
        data: {
          cashSessionId: session.id,
          type: 'OUT',
          amount,
          reason: `Compra ${purchase.documentNumber}`,
          userId,
        },
      });
      cashSessionId = session.id;
      cashMovementId = mv.id;
    }

    return tx.supplierPayment.create({
      data: {
        pharmacyId,
        supplierId: purchase.supplierId,
        purchaseId: purchase.id,
        amount,
        paidFrom,
        method,
        notes: notes ?? null,
        userId,
        cashSessionId,
        cashMovementId,
      },
    });
  }

  async create(pharmacyId: string, userId: string, dto: CreateSupplierPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "purchases" WHERE id = ${dto.purchaseId}::uuid AND "pharmacyId" = ${pharmacyId}::uuid FOR UPDATE`;
      const purchase = await tx.purchase.findFirst({
        where: { id: dto.purchaseId, pharmacyId },
        include: purchaseCalcInclude,
      });
      if (!purchase) throw new NotFoundException('Compra não encontrada.');
      if (purchase.status !== 'CONFIRMED') throw new BadRequestException('Só se pagam compras confirmadas.');

      const c = calcOf(purchase);
      if (c.outstanding <= 0.005) throw new BadRequestException('Esta compra já está paga.');
      if (dto.amount > c.outstanding + 0.005) {
        throw new BadRequestException(`Valor excede a dívida (${c.outstanding.toFixed(2)} MT).`);
      }

      const payment = await this.pay(tx, pharmacyId, userId, purchase, dto.amount, dto.paidFrom, dto.method, dto.notes);

      const after = calcOf({ ...purchase, supplierPayments: [...purchase.supplierPayments, { amount: dto.amount }] });
      await tx.purchase.update({ where: { id: purchase.id }, data: { paymentStatus: after.paymentStatus } });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'supplier_payment.create', entity: 'SupplierPayment', entityId: payment.id },
      });
      return payment;
    });
  }

  async payables(pharmacyId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { pharmacyId, status: 'CONFIRMED' },
      include: {
        ...purchaseCalcInclude,
        supplier: { select: { id: true, name: true, phone: true, whatsapp: true } },
      },
      orderBy: { purchaseDate: 'asc' },
    });

    const groups = new Map<string, any>();
    for (const p of purchases) {
      const c = calcOf(p);
      if (c.outstanding <= 0.005) continue;
      let g = groups.get(p.supplierId);
      if (!g) {
        g = {
          supplierId: p.supplierId,
          supplierName: p.supplier.name,
          phone: p.supplier.phone,
          whatsapp: p.supplier.whatsapp,
          totalDue: 0,
          nextDueDate: null,
          purchases: [],
        };
        groups.set(p.supplierId, g);
      }
      g.totalDue = Math.round((g.totalDue + c.outstanding) * 100) / 100;
      if (p.dueDate && (!g.nextDueDate || p.dueDate < g.nextDueDate)) g.nextDueDate = p.dueDate;
      g.purchases.push({
        id: p.id,
        documentNumber: p.documentNumber,
        purchaseDate: p.purchaseDate,
        dueDate: p.dueDate,
        paymentStatus: c.paymentStatus,
        total: c.due,
        paid: c.paidTotal,
        outstanding: c.outstanding,
      });
    }
    return Array.from(groups.values()).sort((a, b) => b.totalDue - a.totalDue);
  }
}