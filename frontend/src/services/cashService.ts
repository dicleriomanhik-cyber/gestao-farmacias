import { apiClient } from "./api";
import type { CashSession, CashOpenRequest, CashCloseRequest, Payment, PaymentRequest } from "../types/sales";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getActiveCashSession(): Promise<CashSession | null> {
  const resp = await apiClient.get<Envelope<CashSession | null>>("/cash/active");
  return resp.data.data;
}

export async function openCash(data: CashOpenRequest): Promise<CashSession> {
  const resp = await apiClient.post<Envelope<CashSession>>("/cash/open", data);
  return resp.data.data;
}

export async function closeCash(id: string, data: CashCloseRequest): Promise<CashSession> {
  const resp = await apiClient.patch<Envelope<CashSession>>(`/cash/${id}/close`, data);
  return resp.data.data;
}

export async function registerPayment(data: PaymentRequest): Promise<Payment> {
  const resp = await apiClient.post<Envelope<Payment>>("/cash/payments", data);
  return resp.data.data;
}

