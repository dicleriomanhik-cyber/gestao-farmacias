import { apiClient } from "./api";
import { isApiOnline } from "../offline/connectivity";
import { createSupplierPaymentLocal } from "../offline/purchasesLocal";
import type { PayableGroup, SupplierPaymentRequest } from "../types/suppliers";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function createSupplierPayment(data: SupplierPaymentRequest): Promise<unknown> {
  if (!isApiOnline()) return await createSupplierPaymentLocal(data);
  try {
    return await postSupplierPayment(data);
  } catch (err: any) {
    if (err?.response) throw err;
    return await createSupplierPaymentLocal(data);
  }
}

async function postSupplierPayment(data: SupplierPaymentRequest): Promise<unknown> {
  const resp = await apiClient.post<Envelope<unknown>>("/supplier-payments", data);
  return resp.data.data;
}

export async function getPayables(): Promise<PayableGroup[]> {
  const resp = await apiClient.get<Envelope<PayableGroup[]>>("/supplier-payments/payables");
  return resp.data.data;
}