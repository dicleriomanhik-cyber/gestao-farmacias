import { Prisma } from '@prisma/client';

export async function recomputePurchaseTotal(tx: Prisma.TransactionClient, purchaseId: string): Promise<number> {
  const lines = await tx.purchaseLine.aggregate({ where: { purchaseId }, _sum: { subtotal: true } });
  const lots = await tx.stockLot.aggregate({ where: { purchaseId }, _sum: { acquisitionCost: true } });
  const total = round2(Number(lines._sum.subtotal ?? 0) + Number(lots._sum.acquisitionCost ?? 0));
  await tx.purchase.update({ where: { id: purchaseId }, data: { totalAmount: total } });
  return total;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function purchaseDueMzn(p: { totalAmount: unknown; transportCost: unknown; otherCosts: unknown; exchangeRate: unknown }): number {
  return round2((Number(p.totalAmount) + Number(p.transportCost) + Number(p.otherCosts)) * Number(p.exchangeRate));
}

export function paidSum(payments: Array<{ amount: unknown }>): number {
  return round2(payments.reduce((acc, x) => acc + Number(x.amount), 0));
}

export function statusFor(due: number, paid: number): 'PAID' | 'PARTIAL' | 'CREDIT' {
  if (paid >= due - 0.005) return 'PAID';
  return paid > 0 ? 'PARTIAL' : 'CREDIT';
}