// @ts-nocheck
const n = (v: any) => Number(v ?? 0);
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export const purchaseCalcInclude = {
  boxes: { select: { acquisitionCost: true } },
  lines: { select: { subtotal: true } },
  supplierPayments: { select: { amount: true } },
};

export function calcPurchase(p: any, boxes: any[], lines: any[], paid: number) {
  const goods = r2(boxes.reduce((a, b) => a + n(b.acquisitionCost), 0) + lines.reduce((a, l) => a + n(l.subtotal), 0));
  const rate = n(p.exchangeRate) || 1;
  const due = r2((goods + n(p.transportCost) + n(p.otherCosts)) * rate);
  const paidTotal = r2(paid);
  const outstanding = r2(Math.max(0, due - paidTotal));
  let paymentStatus = p.paymentStatus;
  if (p.status === 'CONFIRMED') {
    if (outstanding <= 0.005) paymentStatus = 'PAID';
    else if (paidTotal > 0.005) paymentStatus = 'PARTIAL';
    else paymentStatus = 'CREDIT';
  }
  const invoiceTotal = p.invoiceTotal === null || p.invoiceTotal === undefined ? null : n(p.invoiceTotal);
  const diff = invoiceTotal === null ? null : r2(goods - invoiceTotal);
  return {
    goods,
    due,
    paidTotal,
    outstanding,
    paymentStatus,
    conference: {
      invoiceTotal,
      goodsTotal: goods,
      diff,
      matches: diff === null ? null : Math.abs(diff) < 0.005,
      boxCount: boxes.length,
    },
  };
}

export function calcOf(p: any) {
  const paid = (p.supplierPayments ?? []).reduce((a: number, x: any) => a + n(x.amount), 0);
  return calcPurchase(p, p.boxes ?? [], p.lines ?? [], paid);
}