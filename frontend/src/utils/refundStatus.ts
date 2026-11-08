import type { SaleReturn } from "../types/returns";

const COUNTED = ["COMPLETED", "PENDING"];

export function refundedAmount(r: any, l: any): number {
  const byId = new Map<string, any>();
  for (const f of [...(r.refunds ?? []), ...(l.refunds ?? [])]) {
    if (f.returnLineId === l.id && COUNTED.includes(f.status)) byId.set(f.id, f);
  }
  let sum = 0;
  byId.forEach((f) => { sum += parseFloat(f.amount); });
  return sum;
}

export function allRefunds(returns: any[]): { id: string; amount: number; method: string; createdAt: string }[] {
  const byId = new Map<string, any>();
  for (const r of returns ?? []) {
    if (r.status === "CANCELLED") continue;
    for (const f of [...(r.refunds ?? []), ...((r.lines ?? []).flatMap((l: any) => l.refunds ?? []))]) {
      if (COUNTED.includes(f.status)) byId.set(f.id, f);
    }
  }
  return [...byId.values()].map((f) => ({ id: f.id, amount: parseFloat(f.amount), method: f.method, createdAt: f.createdAt }));
}

export function fullyRefundedSaleIds(returns: SaleReturn[]): Set<string> {
  const ids = new Set<string>();
  for (const r of returns as any[]) {
    if (r.status === "CANCELLED") continue;
    const lines: any[] = r.lines ?? [];
    if (lines.length === 0) continue;
    if (lines.every((l) => refundedAmount(r, l) >= parseFloat(l.subtotal) - 0.005)) ids.add(r.saleId);
  }
  return ids;
}