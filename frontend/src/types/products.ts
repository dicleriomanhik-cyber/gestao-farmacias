export interface Category {
  id: string;
  pharmacyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategoryRef {
  name: string;
}

export type ProductStatus = "ACTIVE" | "INACTIVE" | string;

export interface Product {
  id: string;
  pharmacyId: string;
  categoryId: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  activeIngredient: string | null;
  dosageForm: string | null;
  strength: string | null;
  unit: string;
  salePrice: string;
  referenceCost: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category?: ProductCategoryRef;
}

export interface ProductRequest {
  name: string;
  description: string;
  salePrice: number;
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
  status?: string;
}
