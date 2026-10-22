export type PurchaseStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface PurchaseItem {
  id?: string;
  productId: string;
  productName: string; // Apenas para UI
  quantity: number;
  unitPrice: string; // String decimal "1500.00"
}

export interface Purchase {
  id: string;
  supplierName: string;
  status: PurchaseStatus;
  total: string;
  createdAt: string;
  items: PurchaseItem[];
}

export interface PurchaseRequest {
  supplierId: string; // Assumindo UUID do contrato
  items: { productId: string; quantity: number; unitPrice: string }[];
}
