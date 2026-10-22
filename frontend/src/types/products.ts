export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  categoryId: string;
  categoryName?: string;
  stockQuantity: number;
}

export interface ProductRequest {
  name: string;
  description: string;
  price: string;
  categoryId: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}
