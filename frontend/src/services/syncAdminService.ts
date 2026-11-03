import { apiClient } from "./api";

export interface SyncShortage {
  productId: string;
  missing: number;
}

export interface SyncOperationItem {
  idempotencyKey: string;
  clientId: string;
  operationType: "SALE" | "PAYMENT";
  status: "PENDING" | "PROCESSED" | "REJECTED" | "CONFLICT";
  saleId: string | null;
  result: { saleId?: string; saleNumber?: string; shortages?: SyncShortage[] } | null;
  rejectionCode: string | null;
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface SyncOperationsResult {
  items: SyncOperationItem[];
  counts: { status: string; total: number }[];
}

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getSyncOperations(status?: string, limit = 100): Promise<SyncOperationsResult> {
  const resp = await apiClient.get<Envelope<SyncOperationsResult>>("/sync/operations", {
    params: { limit, ...(status ? { status } : {}) },
  });
  return resp.data.data;
}