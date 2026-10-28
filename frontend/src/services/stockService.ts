import { apiClient } from "./api";
import type {
  StockLot,
  StockMovement,
  StockReceiveRequest,
  StockAdjustRequest,
  StockBox,
  StockBoxDetail,
  StockBoxListParams,
  StockBoxCreateRequest,
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

export async function createLot(data: {
  productId: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
}): Promise<StockLot> {
  const resp = await apiClient.post<Envelope<StockLot>>("/stock/lots", data);
  return resp.data.data;
}

// ---- Caixas físicas (back-end: /stock/boxes) ----
export async function getStockBoxes(params?: StockBoxListParams): Promise<{ data: StockBox[]; meta: any }> {
  const resp = await apiClient.get<any>("/stock/boxes", { params });
  return resp.data.data;
}

export async function getStockBox(id: string): Promise<StockBoxDetail> {
  const resp = await apiClient.get<any>(`/stock/boxes/${id}`);
  return resp.data.data;
}

export async function createStockBox(data: StockBoxCreateRequest): Promise<StockBox> {
  const resp = await apiClient.post<any>("/stock/boxes", data);
  return resp.data.data;
}

