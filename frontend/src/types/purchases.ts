export type PurchaseStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type PurchasePaymentStatus = "PAID" | "PARTIAL" | "CREDIT";

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
  type?: "MEDICINE" | "PRODUCT";
  strength?: string | null;
}

export interface PurchaseLine {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  unitCost: string;
  discount: string;
  subtotal: string;
  innerCount?: number | null;
  unitsPerInner?: number | null;
  unitsPerBox?: number | null;
  unitPrice?: number | null;
  received?: number;
  quantityDamaged?: number;
  damageNote?: string | null;
  closed?: boolean;
  product?: PurchaseProductRef;
}

export interface PurchaseBox {
  id: string;
  qrCode: string;
  totalUnits: number;
  acquisitionCost: string | null;
  product?: { name: string };
}

export interface PurchasePaymentRow {
  id: string;
  amount: string;
  paidFrom: string;
  method: string;
  paidAt: string;
  notes: string | null;
}

export interface PurchaseConference {
  invoiceTotal: number | null;
  goodsTotal: number;
  diff: number | null;
  matches: boolean | null;
  boxCount: number;
}

export interface PurchaseTotals {
  goods: number;
  transport: number;
  other: number;
  grand: number;
  currency: string;
}

export interface Purchase {
  id: string;
  pharmacyId: string;
  supplierId: string;
  documentNumber: string;
  purchaseDate: string;
  status: PurchaseStatus;
  totalAmount: string;
  transportCost: string;
  otherCosts: string;
  invoiceTotal: string | null;
  currency: string;
  exchangeRate: string;
  paymentStatus: PurchasePaymentStatus;
  dueDate: string | null;
  dueMzn: number;
  paidTotal: number;
  outstanding: number;
  createdAt: string;
  updatedAt: string;
  supplier?: PurchaseSupplierRef;
  lines?: PurchaseLine[];
  boxes?: PurchaseBox[];
  supplierPayments?: PurchasePaymentRow[];
  conference?: PurchaseConference;
  totals?: PurchaseTotals;
}

export interface PurchaseLineRequest {
  productId?: string;
  productName?: string;
  type?: "MEDICINE" | "PRODUCT";
  strength?: string;
  quantity: number;
  unitCost: number;
  discount?: number;
  innerCount?: number;
  unitsPerInner?: number;
  unitsPerBox?: number;
}

export interface PurchaseRequest {
  supplierId: string;
  documentNumber: string;
  transportCost?: number;
  otherCosts?: number;
  invoiceTotal?: number;
  currency?: string;
  exchangeRate?: number;
  paymentStatus?: "PAID" | "CREDIT";
  dueDate?: string;
  lines?: PurchaseLineRequest[];
}

export interface PurchaseUpdateRequest {
  transportCost?: number;
  otherCosts?: number;
  invoiceTotal?: number | null;
  dueDate?: string | null;
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
  supplierId?: string;
}