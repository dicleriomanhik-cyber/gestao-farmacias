export type PaymentMethod = "CASH" | "CARD" | "MPESA" | "EMOLA";
export type SaleStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface SaleLine {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  subtotal: string;
  product?: { name: string; salePrice: string; sku: string | null };
}

export interface Sale {
  id: string;
  pharmacyId: string;
  saleNumber: string;
  status: SaleStatus;
  subtotal: string;
  discount: string;
  total: string;
  notes: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lines?: SaleLine[];
}

export interface SaleLineRequest {
  productId: string;
  quantity: number;
}

export interface SaleRequest {
  lines: SaleLineRequest[];
}

export interface CashSession {
  id: string;
  pharmacyId: string;
  userId: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: string;
  expectedBalance: string | null;
  countedBalance: string | null;
  difference: string | null;
  status: "OPEN" | "CLOSED";
}

export interface CashOpenRequest {
  openingBalance: number;
}

export interface CashCloseRequest {
  countedBalance: number;
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

export interface SaleListParams {
  page?: number;
  limit?: number;
  status?: SaleStatus;
}
