import { apiClient } from "./api";
import type {
  Purchase,
  PurchaseRequest,
  PurchaseUpdateRequest,
  PurchaseLineRequest,
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
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
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

export async function updatePurchase(id: string, data: PurchaseUpdateRequest): Promise<Purchase> {
  const resp = await apiClient.patch<Envelope<Purchase>>(`/purchases/${id}`, data);
  return resp.data.data;
}

export async function replacePurchaseLines(id: string, lines: PurchaseLineRequest[]): Promise<Purchase> {
  const resp = await apiClient.put<Envelope<Purchase>>(`/purchases/${id}/lines`, { lines });
  return resp.data.data;
}

export async function confirmPurchase(id: string, pay?: { paidFrom: string; method: string }): Promise<Purchase> {
  const resp = await apiClient.patch<Envelope<Purchase>>(`/purchases/${id}/confirm`, pay ?? {});
  return resp.data.data;
}

export async function cancelPurchase(id: string): Promise<Purchase> {
  const resp = await apiClient.patch<Envelope<Purchase>>(`/purchases/${id}/cancel`);
  return resp.data.data;
}