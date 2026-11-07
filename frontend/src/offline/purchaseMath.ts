export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function dueOf(p: any): number {
  return round2((Number(p.totalAmount || 0) + Number(p.transportCost || 0) + Number(p.otherCosts || 0)) * Number(p.exchangeRate || 1));
}

export function paidOf(p: any): number {
  if (Array.isArray(p.supplierPayments)) return round2(p.supplierPayments.reduce((a: number, x: any) => a + Number(x.amount || 0), 0));
  return round2(Number(p.paidTotal || 0));
}

export function outstandingOf(p: any): number {
  if (p.paymentStatus === "PAID") return 0;
  return Math.max(0, round2(dueOf(p) - paidOf(p)));
}

export function statusFor(due: number, paid: number): string {
  if (paid >= due - 0.005) return "PAID";
  return paid > 0 ? "PARTIAL" : "CREDIT";
}

export function withTotals(p: any): any {
  const due = dueOf(p);
  const paid = paidOf(p);
  const goods = Number(p.totalAmount || 0);
  const inv = p.invoiceTotal === null || p.invoiceTotal === undefined ? null : Number(p.invoiceTotal);
  const transport = Number(p.transportCost || 0);
  const other = Number(p.otherCosts || 0);
  const boxes = p.boxes ?? [];
  return {
    ...p,
    dueMzn: due,
    paidTotal: paid,
    outstanding: outstandingOf(p),
    conference: {
      invoiceTotal: inv,
      goodsTotal: goods,
      diff: inv === null ? null : round2(goods - inv),
      matches: inv === null ? null : Math.abs(goods - inv) < 0.005,
      boxCount: boxes.length,
    },
    totals: { goods, transport, other, grand: round2(goods + transport + other), currency: p.currency },
  };
}