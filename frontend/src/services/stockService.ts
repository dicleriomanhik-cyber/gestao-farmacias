import type { StockLot, StockMovement, StockReceiveRequest, StockAdjustRequest } from "../types/stock";

// [MOCK]
const mockLots: StockLot[] = [
  {
    id: "l1",
    productId: "p1",
    productName: "Paracetamol 500mg",
    batchNumber: "BATCH-2026-A",
    quantity: 50,
    expiryDate: "2026-11-10T00:00:00Z", // A expirar (dentro de 30 dias)
  },
  {
    id: "l2",
    productId: "p2",
    productName: "Brufen 200mg",
    batchNumber: "BATCH-2027-B",
    quantity: 20,
    expiryDate: "2027-05-20T00:00:00Z", // OK (futuro distante)
  },
  {
    id: "l3",
    productId: "p1",
    productName: "Paracetamol 500mg",
    batchNumber: "BATCH-2025-X",
    quantity: 5,
    expiryDate: "2025-12-01T00:00:00Z", // Expirado (vermelho)
  },
];

const mockMovements: StockMovement[] = [
  { id: "m1", type: "IN", productName: "Paracetamol 500mg", quantity: 100, reason: "Receção de compra #comp-1", createdAt: new Date().toISOString() },
  { id: "m2", type: "OUT", productName: "Brufen 200mg", quantity: 5, reason: "Venda #sale-123", createdAt: new Date().toISOString() },
];

export async function getStockLots(): Promise<StockLot[]> {
  return Promise.resolve(mockLots);
}

export async function getStockMovements(): Promise<StockMovement[]> {
  return Promise.resolve(mockMovements);
}

export async function receiveStock(data: StockReceiveRequest): Promise<void> {
  console.log("Mock receiveStock:", data);
  mockLots.push({
    id: Math.random().toString(),
    productId: data.productId,
    productName: "Produto Mock",
    batchNumber: data.batchNumber,
    quantity: data.quantity,
    expiryDate: data.expiryDate,
  });
  return Promise.resolve();
}

export async function adjustStock(data: StockAdjustRequest): Promise<void> {
  console.log("Mock adjustStock:", data);
  return Promise.resolve();
}
