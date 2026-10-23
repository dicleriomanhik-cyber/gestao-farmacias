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

export async function getStockMovements(): Promise<StockMovement[]> {
  const resp = await apiClient.get<Envelope<StockMovement[]>>("/stock/movements");
  return resp.data.data;
}

export async function receiveStock(data: StockReceiveRequest): Promise<StockLot> {
  const resp = await apiClient.post<Envelope<StockLot>>("/stock/receive", data);
  return resp.data.data;
}

export async function adjustStock(data: StockAdjustRequest): Promise<StockLot> {
  const resp = await apiClient.post<Envelope<StockLot>>("/stock/adjust", data);
  return resp.data.data;
}



