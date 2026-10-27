import { apiClient } from "./api";
import type { Sale, SaleRequest, PaginatedResult, SaleListParams, Payment } from "../types/sales";
import { enqueueOperation } from "../offline/queue";

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

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export async function getSales(params: SaleListParams = {}): Promise<PaginatedResult<Sale>> {
  const resp = await apiClient.get<PaginatedEnvelope<Sale>>("/sales", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.status ? { status: params.status } : {}),
    },
  });
  return resp.data.data;
}

export async function getSaleById(id: string): Promise<Sale> {
  const resp = await apiClient.get<Envelope<Sale>>(`/sales/${id}`);
  return resp.data.data;
}

export async function getSalePayments(id: string): Promise<Payment[]> {
  const resp = await apiClient.get<Envelope<Payment[]>>(`/sales/${id}/payments`);
  return resp.data.data;
}

export async function createSale(data: SaleRequest): Promise<Sale> {
  if (isOffline()) {
    throw new Error("OFFLINE_QUEUED");
  }
  const resp = await apiClient.post<Envelope<Sale>>("/sales", data);
  return resp.data.data;
}

export async function confirmSale(id: string): Promise<Sale> {
  const resp = await apiClient.patch<Envelope<Sale>>(`/sales/${id}/confirm`);
  return resp.data.data;
}

/**
 * Cria uma venda completa offline: enfileira SALE + (opcional) PAYMENT no outbox.
 * Retorna um "Sale" sintético local para a UI (sem id de servidor).
 */
export async function createSaleOffline(
  salePayload: SaleRequest,
  paymentPayload?: { amount: number; method: string }
): Promise<Sale> {
  await enqueueOperation("SALE", salePayload);
  if (paymentPayload) {
    await enqueueOperation("PAYMENT", paymentPayload);
  }
  // Retornar um Sale sintético para a UI
  const synthetic: Sale = {
    id: `offline-${Date.now()}`,
    pharmacyId: "offline",
    saleNumber: "OFFLINE",
    status: "DRAFT",
    subtotal: "0",
    discount: "0",
    total: "0",
    notes: "Pendente de sincronização",
    userId: "offline",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines: [],
  };
  return synthetic;
}
