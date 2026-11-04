export interface Supplier {
  id: string;
  pharmacyId: string;
  name: string;
  taxId: string | null;
  phone: string | null;
  whatsapp?: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalPurchased?: number;
  purchaseCount?: number;
  lastPurchaseDate?: string | null;
  debt?: number;
}

export interface SupplierRequest {
  name: string;
  taxId?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  notes?: string | null;
}

export interface SupplierStats {
  totalPurchased: number;
  purchaseCount: number;
  lastPurchaseDate: string | null;
  debt: number;
}

export interface SupplierPurchaseRow {
  id: string;
  documentNumber: string;
  purchaseDate: string;
  status: string;
  paymentStatus: string;
  dueDate: string | null;
  currency: string;
  dueMzn: number;
  paidTotal: number;
  outstanding: number;
}

export interface SupplierProductRow {
  productId: string;
  name: string;
  lastUnitCost: number;
  lastQuantity: number;
  lastDate: string;
}

export interface SupplierPaymentRow {
  id: string;
  amount: string;
  paidFrom: string;
  method: string;
  paidAt: string;
  notes: string | null;
  purchase: { documentNumber: string } | null;
  user: { fullName: string } | null;
}

export interface SupplierSummary {
  supplier: Supplier;
  summary: SupplierStats;
  purchases: SupplierPurchaseRow[];
  products: SupplierProductRow[];
  payments: SupplierPaymentRow[];
}

export interface PayablePurchase {
  id: string;
  documentNumber: string;
  purchaseDate: string;
  dueDate: string | null;
  paymentStatus: string;
  total: number;
  paid: number;
  outstanding: number;
}

export interface PayableGroup {
  supplierId: string;
  supplierName: string;
  phone: string | null;
  whatsapp: string | null;
  totalDue: number;
  nextDueDate: string | null;
  purchases: PayablePurchase[];
}

export interface SupplierPaymentRequest {
  purchaseId: string;
  amount: number;
  paidFrom: string;
  method: string;
  notes?: string;
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