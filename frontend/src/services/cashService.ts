import { apiClient } from "./api";
import { localActiveCashSession } from "../offline/readModel";
import { openCashLocal, closeCashLocal } from "../offline/operationsLocal";
import type { CashSession, CashOpenRequest, CashCloseRequest, Payment, PaymentRequest, PaymentMethod } from "../types/sales";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getActiveCashSession(): Promise<CashSession | null> {
  try {
    const resp = await apiClient.get<Envelope<CashSession | null>>("/cash/active");
    return resp.data.data;
  } catch {
    return (await localActiveCashSession()) as CashSession | null;
  }
}

export async function openCash(data: CashOpenRequest): Promise<CashSession> {
  try {
    const resp = await apiClient.post<Envelope<CashSession>>("/cash/open", data);
    return resp.data.data;
  } catch (err: any) {
    if (err?.response) throw err;
    return (await openCashLocal(data.openingBalance)) as CashSession;
  }
}

export async function closeCash(id: string, data: CashCloseRequest): Promise<CashSession> {
  try {
    const resp = await apiClient.patch<Envelope<CashSession>>(`/cash/${id}/close`, data);
    return resp.data.data;
  } catch (err: any) {
    if (err?.response) throw err;
    const active: any = await localActiveCashSession();
    if (!active || active.id !== id) throw err;
    return (await closeCashLocal(active, data.countedBalance)) as CashSession;
  }
}

export async function registerPayment(data: PaymentRequest): Promise<Payment> {
  const resp = await apiClient.post<Envelope<Payment>>("/cash/payments", data);
  return resp.data.data;
}

export async function getPayments(): Promise<{ session: CashSession; payments: Payment[]; totalsByMethod: Record<PaymentMethod, number> }> {
  const resp = await apiClient.get<Envelope<{ session: CashSession; payments: Payment[]; totalsByMethod: Record<PaymentMethod, number> }>>("/cash/payments");
  return resp.data.data;
}


