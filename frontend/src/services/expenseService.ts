import { apiClient } from "./api";
import type {
  Expense,
  ExpenseRequest,
  PaginatedResult,
  ListParams,
} from "../types/expenses";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface PaginatedEnvelope<T> {
  success: true;
  data: {
    data: T[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  };
  timestamp: string;
}

export async function getExpenses(params: ListParams = {}): Promise<PaginatedResult<Expense>> {
  const resp = await apiClient.get<PaginatedEnvelope<Expense>>("/expenses", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return resp.data.data;
}

export async function getExpenseById(id: string): Promise<Expense> {
  const resp = await apiClient.get<Envelope<Expense>>(`/expenses/${id}`);
  return resp.data.data;
}

export async function createExpense(data: ExpenseRequest): Promise<Expense> {
  const resp = await apiClient.post<Envelope<Expense>>("/expenses", data);
  return resp.data.data;
}

export async function confirmExpense(id: string): Promise<Expense> {
  const resp = await apiClient.patch<Envelope<Expense>>(`/expenses/${id}/confirm`);
  return resp.data.data;
}

export async function cancelExpense(id: string): Promise<Expense> {
  const resp = await apiClient.patch<Envelope<Expense>>(`/expenses/${id}/cancel`);
  return resp.data.data;
}
