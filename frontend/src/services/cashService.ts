import type { CashSession, CashOpenRequest, CashCloseRequest, CashMovement } from "../types/sales";
// import { apiClient } from "./api";

// [MOCK] Estado da caixa em memória
let mockCashSession: CashSession | null = {
  id: "c1",
  status: "OPEN",
  initialAmount: "1000.00",
  openedAt: new Date().toISOString(),
};

const mockMovements: CashMovement[] = [
  { id: "m1", type: "IN", amount: "1500.00", reason: "Venda #1", createdAt: new Date().toISOString() },
];

export async function getActiveCashSession(): Promise<CashSession | null> {
  // return apiClient.get("/cash/active").then(res => res.data.data);
  return Promise.resolve(mockCashSession);
}

export async function openCash(data: CashOpenRequest): Promise<CashSession> {
  // return apiClient.post("/cash/open", data).then(res => res.data.data);
  mockCashSession = {
    id: "c2",
    status: "OPEN",
    initialAmount: data.initialAmount,
    openedAt: new Date().toISOString(),
  };
  return Promise.resolve(mockCashSession);
}

export async function closeCash(data: CashCloseRequest): Promise<void> {
  // return apiClient.patch(`/cash/${mockCashSession?.id}/close`, data).then(res => res.data);
  if (mockCashSession) {
    mockCashSession.status = "CLOSED";
    mockCashSession.finalAmount = data.finalAmount;
    mockCashSession.closedAt = new Date().toISOString();
  }
  return Promise.resolve();
}

export async function getCashMovements(): Promise<CashMovement[]> {
  // return apiClient.get("/cash/movements").then(res => res.data.data);
  return Promise.resolve(mockMovements);
}
