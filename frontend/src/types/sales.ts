export type PaymentMethod = "CASH" | "CARD" | "MPESA" | "EMOLA";
export type SaleStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface SaleItem {
  productId: string;
  productName: string; // Apenas para UI
  quantity: number;
  unitPrice: string; // String decimal ex: "1500.00"
}

export interface Sale {
  id: string;
  status: SaleStatus;
  total: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  items: SaleItem[];
}

export interface SaleRequest {
  items: { productId: string; quantity: number; unitPrice: string }[];
  paymentMethod: PaymentMethod;
}

export interface CashSession {
  id: string;
  status: "OPEN" | "CLOSED";
  initialAmount: string;
  finalAmount?: string;
  openedAt: string;
  closedAt?: string;
}

export interface CashOpenRequest {
  initialAmount: string;
}

export interface CashCloseRequest {
  finalAmount: string;
}

export interface CashMovement {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  reason: string;
  createdAt: string;
}
