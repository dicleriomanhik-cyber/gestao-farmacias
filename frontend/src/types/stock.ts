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
  expiryDate: string;
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
}




