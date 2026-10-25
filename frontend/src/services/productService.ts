import { apiClient } from "./api";
import type {
  Product,
  Category,
  ProductRequest,
  PaginatedResult,
  ListParams,
} from "../types/products";

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

export async function getProducts(params: ListParams = {}): Promise<PaginatedResult<Product>> {
  const resp = await apiClient.get<PaginatedEnvelope<Product>>("/products", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.search ? { search: params.search } : {}),
    },
  });
  return resp.data.data;
}

export async function getProductById(id: string): Promise<Product> {
  const resp = await apiClient.get<Envelope<Product>>(`/products/${id}`);
  return resp.data.data;
}

export async function getCategories(): Promise<Category[]> {
  const resp = await apiClient.get<PaginatedEnvelope<Category>>("/categories", {
    params: { page: 1, limit: 100 },
  });
  return resp.data.data.data;
}

export async function createProduct(data: ProductRequest): Promise<Product> {
  const resp = await apiClient.post<Envelope<Product>>("/products", data);
  return resp.data.data;
}

export async function updateProduct(id: string, data: ProductRequest): Promise<Product> {
  const resp = await apiClient.patch<Envelope<Product>>(`/products/${id}`, data);
  return resp.data.data;
}
