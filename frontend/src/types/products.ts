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

export type ProductType = "MEDICINE" | "PRODUCT";

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
  // Novos campos do modelo (Back-end 7475c73)
  type: ProductType;
  hasExpiry: boolean;
  minStock: number | null;
  saleUnitLabel: string;
  salePrice: string;
  referenceCost: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category?: ProductCategoryRef;
}

export interface ProductRequest {
  name: string;
  description?: string;
  salePrice: number;
  categoryId: string;
  type: ProductType;
  hasExpiry?: boolean;
  activeIngredient?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  minStock?: number | null;
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

// ===== Modelo novo: StockBox / ProductSummary / PosStockItem =====

export interface ProductSummary {
  productId: string;
  name: string;
  type: ProductType;
  saleUnitLabel: string;
  hasExpiry: boolean;
  totalAvailable: number;
  nearestExpiry: string | null;
  boxesCount: number;
}

export type PosStockLevel = "EMPTY" | "LOW" | "OK";

export interface PosStockItem {
  productId: string;
  name: string;
  saleUnitLabel: string;
  totalAvailable: number;
  level: PosStockLevel;
  nearestExpiry: string | null;
}
