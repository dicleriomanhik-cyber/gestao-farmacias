import { apiClient } from "./api";
import type {
  Sale,
  SaleRequest,
  PaginatedResult,
  SaleListParams,
} from "../types/sales";

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

export async function createSale(data: SaleRequest): Promise<Sale> {
  const resp = await apiClient.post<Envelope<Sale>>("/sales", data);
  return resp.data.data;
}

export async function confirmSale(id: string): Promise<Sale> {
  const resp = await apiClient.patch<Envelope<Sale>>(`/sales/${id}/confirm`);
  return resp.data.data;
}
