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
  // Formato novo (real, FE-10.3.9.C)
  purchaseLineId?: string;
  lotNumber?: string;
  unitCost?: number;
  // Formato antigo (mock temporário)
  productId?: string;
  batchNumber?: string;
  // Comuns
  quantity: number;
  expiryDate: string;
}

export interface StockAdjustRequest {
  lotId: string;
  quantity: number;
  reason: string;
}


