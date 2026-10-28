import type { ProductType } from "./products";

export interface StockLotProductRef {
  name: string;
  sku: string | null;
}

export interface StockLot {
  id: string;
  pharmacyId: string;
  productId: string;
  purchaseLineId: string;
  lotNumber: string;
  expiryDate: string | null;
  qrCode: string;
  innerCount: number | null;
  unitsPerInner: number | null;
  totalUnits: number;
  quantityReceived: number;
  quantityReceivedFromLine: number;
  quantityAvailable: number;
  unitCost: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  product?: StockLotProductRef;
}

export type StockMovementType =
  | "PURCHASE_ENTRY"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "SALE_EXIT"
  | "RETURN_ENTRY"
  | string;

export interface StockMovement {
  id: string;
  pharmacyId: string;
  productId: string;
  lotId: string;
  type: StockMovementType;
  quantity: number;
  referenceId: string | null;
  referenceType: string | null;
  notes: string | null;
  userId: string;
  createdAt: string;
}

export interface StockReceiveRequest {
  purchaseLineId: string;
  lotNumber: string;
  quantity: number;
  expiryDate: string;
  unitCost: number;
}

export interface StockAdjustRequest {
  lotId: string;
  quantity: number;
  reason: string;
  expiryDate?: string;
}

// ===== Modelo novo: Caixas físicas (Back-end 7475c73) =====

export type StockBoxState = "NEW" | "ACTIVE" | "DEPLETED" | "EXPIRED";

export interface StockBox {
  id: string;
  qrCode: string;
  productName: string;
  type: ProductType;
  saleUnitLabel: string;
  hasExpiry: boolean;
  expiryDate: string | null;
  innerCount: number | null;
  unitsPerInner: number | null;
  totalUnits: number;
  quantityAvailable: number;
  state: StockBoxState;
}

export interface StockBoxInner {
  index: number;
  state: "FULL" | "IN_USE" | "DEPLETED";
  unitsAvailable: number;
  unitsTotal: number;
}

export interface StockBoxSaleHistoryItem {
  saleId: string;
  saleNumber: string;
  createdAt: string;
  unitsDeducted: number;
  balanceAfter: number;
}

export interface StockBoxDetail extends StockBox {
  productId: string;
  inners: StockBoxInner[];
  saleHistory: StockBoxSaleHistoryItem[];
}

export interface StockBoxListParams {
  page?: number;
  limit?: number;
  type?: ProductType;
  state?: StockBoxState;
}

export interface StockBoxCreateRequest {
  productId: string;
  qrCode: string;
  expiryDate?: string | null;
  innerCount?: number;
  unitsPerInner?: number;
  totalUnits?: number;
  unitCost?: number;
}
