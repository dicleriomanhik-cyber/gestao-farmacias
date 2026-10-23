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

export interface StockMovement {
  id: string;
  type: "IN" | "OUT" | "ADJUST" | string;
  productName?: string;
  quantity: number;
  reason: string;
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



