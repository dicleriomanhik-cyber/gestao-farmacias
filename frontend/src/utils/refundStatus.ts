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

export function returnedQtyBySaleLine(returns: any[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of returns ?? []) {
    if (r.status !== "CONFIRMED") continue;
    for (const l of r.lines ?? []) m.set(l.saleLineId, (m.get(l.saleLineId) ?? 0) + Number(l.quantity));
  }
  return m;
}

export function refundedBySale(returns: any[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of returns ?? []) {
    if (r.status === "CANCELLED") continue;
    for (const l of r.lines ?? []) m.set(r.saleId, (m.get(r.saleId) ?? 0) + refundedAmount(r, l));
  }
  return m;
}

export function saleReturnState(sale: any, qty: Map<string, number>): "NONE" | "PARTIAL" | "FULL" {
  const lines: any[] = sale.lines ?? [];
  if (lines.length === 0) return "NONE";
  let any = false;
  let all = true;
  for (const l of lines) {
    const q = qty.get(l.id) ?? 0;
    if (q > 0) any = true;
    if (q < Number(l.quantity)) all = false;
  }
  return all ? "FULL" : any ? "PARTIAL" : "NONE";
}
