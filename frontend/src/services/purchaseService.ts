import { markLineDamagedLocal, closeLineLocal } from "../offline/operationsLocal";
import { apiClient } from "./api";
import { isApiOnline } from "../offline/connectivity";
import { createPurchaseLocal, updatePurchaseLocal, replacePurchaseLinesLocal, confirmPurchaseLocal, cancelPurchaseLocal } from "../offline/purchasesLocal";
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
  if (!isApiOnline()) return await createPurchaseLocal(data);
  try {
    return await postCreatePurchase(data);
  } catch (err: any) {
    if (err?.response) throw err;
    return await createPurchaseLocal(data);
  }
}

async function postCreatePurchase(data: PurchaseRequest): Promise<Purchase> {
  const resp = await apiClient.post<Envelope<Purchase>>("/purchases", data);
  return resp.data.data;
}

export async function updatePurchase(id: string, data: PurchaseUpdateRequest): Promise<Purchase> {
  if (!isApiOnline()) return await updatePurchaseLocal(id, data);
  try {
    return await patchUpdatePurchase(id, data);
  } catch (err: any) {
    if (err?.response) throw err;
    return await updatePurchaseLocal(id, data);
  }
}

async function patchUpdatePurchase(id: string, data: PurchaseUpdateRequest): Promise<Purchase> {
  const resp = await apiClient.patch<Envelope<Purchase>>(`/purchases/${id}`, data);
  return resp.data.data;
}

export async function replacePurchaseLines(id: string, lines: PurchaseLineRequest[]): Promise<Purchase> {
  if (!isApiOnline()) return await replacePurchaseLinesLocal(id, lines);
  try {
    return await putPurchaseLines(id, lines);
  } catch (err: any) {
    if (err?.response) throw err;
    return await replacePurchaseLinesLocal(id, lines);
  }
}

async function putPurchaseLines(id: string, lines: PurchaseLineRequest[]): Promise<Purchase> {
  const resp = await apiClient.put<Envelope<Purchase>>(`/purchases/${id}/lines`, { lines });
  return resp.data.data;
}

export async function confirmPurchase(id: string, pay?: { paidFrom: string; method: string }): Promise<Purchase> {
  if (!isApiOnline()) return await confirmPurchaseLocal(id, pay);
  try {
    return await patchConfirmPurchase(id, pay);
  } catch (err: any) {
    if (err?.response) throw err;
    return await confirmPurchaseLocal(id, pay);
  }
}

async function patchConfirmPurchase(id: string, pay?: { paidFrom: string; method: string }): Promise<Purchase> {
  const resp = await apiClient.patch<Envelope<Purchase>>(`/purchases/${id}/confirm`, pay ?? {});
  return resp.data.data;
}

export async function markLineDamaged(lineId: string, quantity: number, note?: string) {
  try {
    return await postLineDamaged(lineId, quantity, note);
  } catch (err: any) {
    if (err?.response) throw err;
    return await markLineDamagedLocal(lineId, quantity, note);
  }
}

async function postLineDamaged(lineId: string, quantity: number, note?: string) {
  const resp = await apiClient.patch(`/purchases/lines/${lineId}/damaged`, { quantity, ...(note ? { note } : {}) });
  return resp.data.data;
}

export async function closePurchaseLine(lineId: string) {
  try {
    return await postCloseLine(lineId);
  } catch (err: any) {
    if (err?.response) throw err;
    return await closeLineLocal(lineId);
  }
}

async function postCloseLine(lineId: string) {
  const resp = await apiClient.patch(`/purchases/lines/${lineId}/close`);
  return resp.data.data;
}
export async function cancelPurchase(id: string): Promise<Purchase> {
  if (!isApiOnline()) return await cancelPurchaseLocal(id);
  try {
    return await patchCancelPurchase(id);
  } catch (err: any) {
    if (err?.response) throw err;
    return await cancelPurchaseLocal(id);
  }
}

async function patchCancelPurchase(id: string): Promise<Purchase> {
  const resp = await apiClient.patch<Envelope<Purchase>>(`/purchases/${id}/cancel`);
  return resp.data.data;
}