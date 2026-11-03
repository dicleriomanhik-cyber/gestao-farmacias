import { apiClient } from "./api";
import type { PayableGroup, SupplierPaymentRequest } from "../types/suppliers";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function createSupplierPayment(data: SupplierPaymentRequest): Promise<unknown> {
  const resp = await apiClient.post<Envelope<unknown>>("/supplier-payments", data);
  return resp.data.data;
}

export async function getPayables(): Promise<PayableGroup[]> {
  const resp = await apiClient.get<Envelope<PayableGroup[]>>("/supplier-payments/payables");
  return resp.data.data;
}