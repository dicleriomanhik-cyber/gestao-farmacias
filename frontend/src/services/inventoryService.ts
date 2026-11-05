import { apiClient } from "./api";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export type InventoryStatus = "OPEN" | "COMPLETED" | "CANCELLED";

export interface InventorySummary {
  id: string;
  status: InventoryStatus;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  totalLines: number;
  countedLines: number;
  divergentLines: number;
  netDifference: number;
}

export interface InventoryLine {
  id: string;
  lotId: string;
  qrCode: string;
  productName: string;
  type: string;
  expiryDate: string | null;
  totalUnits: number;
  expectedQty: number;
  countedQty: number | null;
  appliedDiff: number | null;
}

export interface InventoryDetail {
  id: string;
  status: InventoryStatus;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  lines: InventoryLine[];
}

export async function listInventories(): Promise<InventorySummary[]> {
  const r = await apiClient.get<Envelope<InventorySummary[]>>("/stock/inventories");
  return r.data.data;
}

export async function getInventory(id: string): Promise<InventoryDetail> {
  const r = await apiClient.get<Envelope<InventoryDetail>>("/stock/inventories/" + id);
  return r.data.data;
}

export async function createInventory(notes?: string): Promise<{ id: string }> {
  const r = await apiClient.post<Envelope<{ id: string }>>("/stock/inventories", notes ? { notes } : {});
  return r.data.data;
}

export async function saveInventoryCounts(id: string, lines: { lineId: string; countedQty: number | null }[]): Promise<void> {
  await apiClient.patch("/stock/inventories/" + id + "/counts", { lines });
}

export async function completeInventory(id: string): Promise<void> {
  await apiClient.post("/stock/inventories/" + id + "/complete");
}

export async function cancelInventory(id: string): Promise<void> {
  await apiClient.post("/stock/inventories/" + id + "/cancel");
}