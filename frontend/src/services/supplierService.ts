import { apiClient } from "./api";
import type {
  Supplier,
  SupplierRequest,
  PaginatedResult,
  ListParams,
} from "../types/suppliers";

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

export async function getSuppliers(params: ListParams = {}): Promise<PaginatedResult<Supplier>> {
  const resp = await apiClient.get<PaginatedEnvelope<Supplier>>("/suppliers", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return resp.data.data;
}

export async function getSupplierById(id: string): Promise<Supplier> {
  const resp = await apiClient.get<Envelope<Supplier>>(`/suppliers/${id}`);
  return resp.data.data;
}

export async function createSupplier(data: SupplierRequest): Promise<Supplier> {
  const resp = await apiClient.post<Envelope<Supplier>>("/suppliers", data);
  return resp.data.data;
}

export async function updateSupplier(id: string, data: Partial<SupplierRequest>): Promise<Supplier> {
  const resp = await apiClient.patch<Envelope<Supplier>>(`/suppliers/${id}`, data);
  return resp.data.data;
}
