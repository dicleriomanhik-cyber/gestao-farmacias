import { apiClient } from "./api";
import type { OutboxOperation } from "../offline/db";

interface SyncPushResult {
  idempotencyKey: string;
  status: "PROCESSED" | "REJECTED" | "PENDING" | "CONFLICT";
  result?: any;
  rejectionCode?: string;
  rejectionReason?: string;
}

interface SyncPushResponse {
  success: boolean;
  data: { results: SyncPushResult[] };
}

interface SyncPullChange {
  type: "PRODUCT" | "STOCK_LOT" | "SALE";
  action?: string;
  data: any;
}

interface SyncPullResponse {
  success: boolean;
  data: {
    changes: SyncPullChange[];
    nextCursor: string | null;
    hasMore: boolean;
  };
}

interface SyncOperationStatusResponse {
  success: boolean;
  data: {
    idempotencyKey: string;
    status: string;
    result: any;
    rejectionCode: string | null;
    rejectionReason: string | null;
    createdAt: string;
    processedAt: string | null;
  };
}

export async function pushOperations(
  clientId: string,
  operations: OutboxOperation[]
): Promise<SyncPushResult[]> {
  // Limite do contrato: 50 operações por pedido
  const batch = operations.slice(0, 50).map((op) => ({
    idempotencyKey: op.idempotencyKey,
    operationType: op.operationType,
    payload: op.payload,
  }));

  const resp = await apiClient.post<SyncPushResponse>("/sync/push", {
    clientId,
    clientVersion: "1.0.0",
    operations: batch,
  });
  return resp.data.data.results;
}

export async function pullChanges(
  clientId: string,
  cursor?: string | null,
  limit = 50
): Promise<SyncPullResponse["data"]> {
  const resp = await apiClient.get<SyncPullResponse>("/sync/pull", {
    params: { clientId, ...(cursor ? { cursor } : {}), limit },
  });
  return resp.data.data;
}

export async function getOperationStatus(
  idempotencyKey: string,
  clientId: string
): Promise<SyncOperationStatusResponse["data"]> {
  const resp = await apiClient.get<SyncOperationStatusResponse>(
    `/sync/operations/${idempotencyKey}`,
    { params: { clientId } }
  );
  return resp.data.data;
}
