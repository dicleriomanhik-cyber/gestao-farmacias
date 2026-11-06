import { Prisma } from '@prisma/client';

const round6 = (n: number) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;

export async function recomputeLotCosts(tx: Prisma.TransactionClient, purchaseId: string): Promise<void> {
  const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return;
  const st = await tx.pharmacySettings.findUnique({ where: { pharmacyId: purchase.pharmacyId } });
  const mode = st?.extrasSplitMode ?? 'BY_VALUE';
  const lots = await tx.stockLot.findMany({
    where: { purchaseId, acquisitionCost: { not: null } },
    select: { id: true, acquisitionCost: true, totalUnits: true, purchaseLineId: true },
  });
  const lines = await tx.purchaseLine.findMany({
    where: { purchaseId },
    select: { subtotal: true, quantity: true, unitsPerBox: true },
  });
  const extras = Number(purchase.transportCost) + Number(purchase.otherCosts);
  const rate = Number(purchase.exchangeRate) || 1;
  const linked = lots.some((l) => l.purchaseLineId);
  const loose = lots.filter((l) => !l.purchaseLineId);
  let baseAcq: number;
  let baseUnits: number;
  if (linked) {
    baseAcq = lines.reduce((s, l) => s + Number(l.subtotal), 0) + loose.reduce((s, l) => s + Number(l.acquisitionCost), 0);
    baseUnits = lines.reduce((s, l) => s + l.quantity * (l.unitsPerBox ?? 0), 0) + loose.reduce((s, l) => s + l.totalUnits, 0);
  } else {
    baseAcq = lots.reduce((s, l) => s + Number(l.acquisitionCost), 0);
    baseUnits = lots.reduce((s, l) => s + l.totalUnits, 0);
  }
  for (const l of lots) {
    if (l.totalUnits <= 0) continue;
    const acq = Number(l.acquisitionCost);
    let share = 0;
    if (mode === 'BY_UNITS') share = baseUnits > 0 ? (extras * l.totalUnits) / baseUnits : 0;
    else share = baseAcq > 0 ? (extras * acq) / baseAcq : 0;
    await tx.stockLot.update({ where: { id: l.id }, data: { realUnitCost: round6(((acq + share) * rate) / l.totalUnits) } });
  }
}