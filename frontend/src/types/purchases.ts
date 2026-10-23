export type PurchaseStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface PurchaseSupplierRef {
  id: string;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
}

export interface PurchaseProductRef {
  id: string;
  name: string;
  salePrice: string;
  sku: string | null;
}

export interface PurchaseLine {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  unitCost: string;
  discount: string;
  subtotal: string;
  product?: PurchaseProductRef;
}

export interface Purchase {
  id: string;
  pharmacyId: string;
  supplierId: string;
  documentNumber: string;
  purchaseDate: string;
  status: PurchaseStatus;
  notes: string | null;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  supplier?: PurchaseSupplierRef;
  lines?: PurchaseLine[];
}

export interface PurchaseLineRequest {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseRequest {
  supplierId: string;
  documentNumber: string;
  lines: PurchaseLineRequest[];
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
  status?: PurchaseStatus;
}
