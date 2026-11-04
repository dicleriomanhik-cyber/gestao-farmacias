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
  product?: { name: string; salePrice: string; sku: string | null }; lots?: { id: string; lotId: string; quantity: number; unitCost?: string | null }[];
}

export interface Sale {
  operatorId?: string | null;
  operatorName?: string | null;
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
  operatorId?: string;
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
  openedByOperatorId?: string | null;
  openedByOperatorName?: string | null;
  closedByOperatorName?: string | null;
}

export interface CashOpenRequest {
  openingBalance: number;
  operatorId?: string;
}

export interface CashCloseRequest {
  countedBalance: number;
  operatorId?: string;
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

export interface Payment {
  id: string;
  saleId: string;
  cashSessionId: string;
  method: PaymentMethod;
  amount: string;
  idempotencyKey: string | null;
  createdAt: string;
  userId: string;
}

export interface PaymentRequest {
  saleId: string;
  amount: number;
  method: PaymentMethod;
  idempotencyKey: string;
}

export interface SaleUserRef {
  id: string;
  email: string;
  fullName: string;
  status?: string;
}

