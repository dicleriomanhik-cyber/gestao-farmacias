export interface StockLot {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string; // ISO Date
}

export interface StockMovement {
  id: string;
  type: "IN" | "OUT" | "ADJUST";
  productName: string;
  quantity: number;
  reason: string;
  createdAt: string;
}

export interface StockReceiveRequest {
  productId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
}

export interface StockAdjustRequest {
  productId: string;
  quantity: number;
  reason: string;
}
