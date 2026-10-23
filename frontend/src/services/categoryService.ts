import { apiClient } from "./api";
import type { Category, PaginatedResult, ListParams } from "../types/products";

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

export interface CategoryRequest {
  name: string;
  description?: string | null;
}

export async function getCategories(params: ListParams = {}): Promise<PaginatedResult<Category>> {
  const resp = await apiClient.get<PaginatedEnvelope<Category>>("/categories", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return resp.data.data;
}

export async function getCategoryById(id: string): Promise<Category> {
  const resp = await apiClient.get<Envelope<Category>>(`/categories/${id}`);
  return resp.data.data;
}

export async function createCategory(data: CategoryRequest): Promise<Category> {
  const resp = await apiClient.post<Envelope<Category>>("/categories", data);
  return resp.data.data;
}

export async function updateCategory(id: string, data: Partial<CategoryRequest>): Promise<Category> {
  const resp = await apiClient.patch<Envelope<Category>>(`/categories/${id}`, data);
  return resp.data.data;
}
