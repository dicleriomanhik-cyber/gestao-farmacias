import { apiClient } from "./api";
import type { FinanceData, FinanceDetails } from "../types/finance";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getFinance(from: string, to: string): Promise<FinanceData> {
  const resp = await apiClient.get<Envelope<FinanceData>>("/reports/finance", { params: { startDate: from, endDate: to } });
  return resp.data.data;
}

export async function getFinanceDetails(from: string, to: string): Promise<FinanceDetails> {
  const resp = await apiClient.get<Envelope<FinanceDetails>>("/reports/finance/details", { params: { startDate: from, endDate: to } });
  return resp.data.data;
}