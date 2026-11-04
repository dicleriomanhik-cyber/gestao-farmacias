export type ReturnStatus = "DRAFT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type ReturnLineCondition = "RESELLABLE" | "DAMAGED" | "EXPIRED" | "LOST";

export interface ReturnLine {
  id: string;
  returnId: string;
  saleLineId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  subtotal: string;
  lotNumber: string | null;
  expiryDate: string | null;
  condition: ReturnLineCondition | null;
  quantityReleased: number;
  product?: { name: string; sku: string | null };
}

export interface SaleReturn {
  id: string;
  pharmacyId: string;
  saleId: string;
  userId: string;
  returnNumber: string;
  operatorId?: string | null;
  operatorName?: string | null;
  reason: string;
  totalRefund: string;
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
  lines?: ReturnLine[];
  refunds?: ReturnRefund[];
  sale?: { saleNumber: string };
}

export interface ReturnRefund {
  id: string;
  returnId: string;
  method: string;
  amount: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ReturnListParams {
  page?: number;
  limit?: number;
}
