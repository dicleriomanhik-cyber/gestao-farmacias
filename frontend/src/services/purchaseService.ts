import { apiClient } from "./api";
import type {
  Purchase,
  PurchaseRequest,
  PaginatedResult,
  ListParams,
} from "../types/purchases";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface PaginatedEnvelope<T> {
  success: true;
  data: {
    data: T[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  };
  timestamp: string;
}

export async function getPurchases(params: ListParams = {}): Promise<PaginatedResult<Purchase>> {
  const resp = await apiClient.get<PaginatedEnvelope<Purchase>>("/purchases", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.status ? { status: params.status } : {}),
    },
  });
  return resp.data.data;
}

export async function getPurchaseById(id: string): Promise<Purchase> {
  const resp = await apiClient.get<Envelope<Purchase>>(`/purchases/${id}`);
  return resp.data.data;
}

export async function createPurchase(data: PurchaseRequest): Promise<Purchase> {
  const resp = await apiClient.post<Envelope<Purchase>>("/purchases", data);
  return resp.data.data;
}

export async function confirmPurchase(id: string): Promise<Purchase> {
  const resp = await apiClient.patch<Envelope<Purchase>>(`/purchases/${id}/confirm`);
  return resp.data.data;
}

export async function cancelPurchase(id: string): Promise<Purchase> {
  const resp = await apiClient.patch<Envelope<Purchase>>(`/purchases/${id}/cancel`);
  return resp.data.data;
}
