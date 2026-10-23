import { apiClient } from "./api";
import type {
  StockLot,
  StockMovement,
  StockReceiveRequest,
  StockAdjustRequest,
} from "../types/stock";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getStockLots(): Promise<StockLot[]> {
  const resp = await apiClient.get<Envelope<StockLot[]>>("/stock/lots");
  return resp.data.data;
}

const mockMovements: StockMovement[] = [
  { id: "m1", type: "IN", productName: "Paracetamol 500mg", quantity: 100, reason: "Receção de compra COMPRA-2026-001", createdAt: new Date().toISOString() },
];

export async function getStockMovements(): Promise<StockMovement[]> {
  return Promise.resolve(mockMovements);
}

export async function receiveStock(data: StockReceiveRequest): Promise<void> {
  console.log("[MOCK] receiveStock:", data);
  return Promise.resolve();
}

export async function adjustStock(data: StockAdjustRequest): Promise<void> {
  console.log("[MOCK] adjustStock:", data);
  return Promise.resolve();
}
