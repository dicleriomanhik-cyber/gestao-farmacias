import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { paidSum, purchaseDueMzn, round2, statusFor } from './purchase-math';

const PAID_FROM_METHODS: Record<string, string[]> = {
  PHARMACY_CASH: ['CASH'],
  OWNER_CASH: ['CASH'],
  BANK: ['CARD', 'TRANSFER'],
  MPESA: ['MPESA'],
  EMOLA: ['EMOLA'],
  OTHER: ['OTHER'],
};

export interface PayInput {
  purchaseId: string;
  amount: number;
  paidFrom: string;
  method: string;
  notes?: string;
}

@Injectable()
export class SupplierPaymentsService {
  constructor(private prisma: PrismaService) {}

  async pay(pharmacyId: string, userId: string, input: PayInput, outerTx?: Prisma.TransactionClient, force = false) {
    const run = async (tx: Prisma.TransactionClient) => {
      if (!(PAID_FROM_METHODS[input.paidFrom] ?? []).includes(input.method)) {
        throw new BadRequestException('Método de pagamento incompatível com a origem do dinheiro.');
      }
      const amount = round2(input.amount);
      if (!(amount > 0)) throw new BadRequestException('Valor do pagamento deve ser positivo.');

      const purchase = await tx.purchase.findFirst({
        where: { id: input.purchaseId, pharmacyId },
        include: { supplier: { select: { name: true } }, supplierPayments: { select: { amount: true } } },
      });
      if (!purchase) throw new NotFoundException('Compra não encontrada.');
      if (purchase.status !== 'CONFIRMED') throw new BadRequestException('Só compras confirmadas podem ser pagas.');
      if (purchase.paymentStatus === 'PAID' && !force) throw new BadRequestException('Compra já paga.');

      const due = purchaseDueMzn(purchase);
      const paid = paidSum(purchase.supplierPayments);
      const outstanding = round2(due - paid);
      if (amount > outstanding + 0.005) {
        throw new BadRequestException(`Valor excede a dívida desta compra (${outstanding.toFixed(2)} MT).`);
      }

      const st = await tx.pharmacySettings.upsert({ where: { pharmacyId }, update: {}, create: { pharmacyId } });

      let cashSessionId: string | null = null;
      if (input.paidFrom === 'PHARMACY_CASH') {
        if (!st.allowCashExpenses) throw new BadRequestException('A farmácia não permite pagar pela caixa.');
        const sessions = await tx.$queryRaw`
          SELECT id FROM "cash_sessions"
          WHERE "pharmacyId" = ${pharmacyId}::uuid AND "userId" = ${userId}::uuid AND status = 'OPEN'
          ORDER BY "openedAt" DESC
          LIMIT 1
          FOR UPDATE
        ` as Array<{ id: string }>;
        if (!sessions[0]) throw new BadRequestException('Não tem sessão de caixa aberta para pagar pela caixa da farmácia.');
        cashSessionId = sessions[0].id;
        await tx.cashMovement.create({
          data: {
            cashSessionId,
            type: 'OUT',
            amount,
            method: 'CASH',
            reason: `Pagamento a fornecedor: ${purchase.supplier.name}`,
            userId,
          },
        });
      }

      const payment = await tx.supplierPayment.create({
        data: {
          pharmacyId,
          supplierId: purchase.supplierId,
          purchaseId: purchase.id,
          amount,
          paidFrom: input.paidFrom as any,
          method: input.method as any,
          cashSessionId,
          userId,
          notes: input.notes,
        },
      });

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { paymentStatus: statusFor(due, round2(paid + amount)) },
      });

      await tx.auditLog.create({
        data: { pharmacyId, userId, action: 'supplier.payment', entity: 'SupplierPayment', entityId: payment.id },
      });

      return payment;
    };
    return outerTx ? run(outerTx) : this.prisma.$transaction(run);
  }

  async listPayments(pharmacyId: string, supplierId?: string, purchaseId?: string) {
    return this.prisma.supplierPayment.findMany({
      where: { pharmacyId, ...(supplierId && { supplierId }), ...(purchaseId && { purchaseId }) },
      include: {
        supplier: { select: { name: true } },
        purchase: { select: { documentNumber: true } },
        user: { select: { fullName: true } },
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async payables(pharmacyId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { pharmacyId, status: 'CONFIRMED', paymentStatus: { not: 'PAID' } },
      include: {
        supplier: { select: { id: true, name: true, phone: true, whatsapp: true } },
        supplierPayments: { select: { amount: true } },
      },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { purchaseDate: 'asc' }],
    });

    const bySupplier = new Map<string, any>();
    for (const p of purchases) {
      const due = purchaseDueMzn(p);
      const paid = paidSum(p.supplierPayments);
      const outstanding = Math.max(0, round2(due - paid));
      if (outstanding <= 0) continue;
      let g = bySupplier.get(p.supplierId);
      if (!g) {
        g = {
          supplierId: p.supplierId,
          supplierName: p.supplier.name,
          phone: p.supplier.phone,
          whatsapp: p.supplier.whatsapp,
          totalDue: 0,
          nextDueDate: null as Date | null,
          purchases: [] as any[],
        };
        bySupplier.set(p.supplierId, g);
      }
      g.totalDue = round2(g.totalDue + outstanding);
      if (p.dueDate && (!g.nextDueDate || p.dueDate < g.nextDueDate)) g.nextDueDate = p.dueDate;
      g.purchases.push({
        id: p.id,
        documentNumber: p.documentNumber,
        purchaseDate: p.purchaseDate,
        dueDate: p.dueDate,
        paymentStatus: p.paymentStatus,
        total: due,
        paid,
        outstanding,
      });
    }
    return Array.from(bySupplier.values());
  }
}