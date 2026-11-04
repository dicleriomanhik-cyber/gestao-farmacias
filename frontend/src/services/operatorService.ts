import { apiClient } from "./api";

export interface Operator {
  id: string;
  name: string;
  isActive: boolean;
}

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getAllOperators(): Promise<Operator[]> {
  const resp = await apiClient.get<Envelope<Operator[]>>("/operators/all");
  return resp.data.data;
}

export async function createOperator(name: string): Promise<Operator> {
  const resp = await apiClient.post<Envelope<Operator>>("/operators", { name });
  return resp.data.data;
}

export async function updateOperator(id: string, data: { name?: string; isActive?: boolean }): Promise<Operator> {
  const resp = await apiClient.patch<Envelope<Operator>>(`/operators/${id}`, data);
  return resp.data.data;
}