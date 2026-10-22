export type PurchaseStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface PurchaseItem {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
}

export interface Purchase {
  id: string;
  supplierName: string;
  status: PurchaseStatus;
  total: string;
  createdAt: string;
  items: PurchaseItem[];
}

export interface PurchaseRequest {
  supplierId: string;
  items: { productId: string; quantity: number; unitPrice: string }[];
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

export interface PurchaseListParams {
  page?: number;
  limit?: number;
  status?: PurchaseStatus;
}
