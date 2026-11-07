import { apiClient } from "./api";
import { setMeta } from "../offline/db";

export interface AccountOperator {
  id: string;
  name: string;
  isActive: boolean;
}

export interface PharmacyAccount {
  id: string;
  name: string;
  createdAt: string;
  userId: string | null;
  email: string | null;
  status: string;
  operators: AccountOperator[];
}

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getPharmacyAccounts(): Promise<PharmacyAccount[]> {
  const resp = await apiClient.get<Envelope<PharmacyAccount[]>>("/pharmacy-accounts");
  await setMeta("pharmacyAccounts", resp.data.data).catch(() => undefined);
  return resp.data.data;
}

export async function getPharmacyAccount(id: string): Promise<PharmacyAccount> {
  const resp = await apiClient.get<Envelope<PharmacyAccount>>(`/pharmacy-accounts/${id}`);
  return resp.data.data;
}

export async function createPharmacyAccount(data: { pharmacyName: string; operatorNames: string[]; email: string; password: string }): Promise<PharmacyAccount> {
  const resp = await apiClient.post<Envelope<PharmacyAccount>>("/pharmacy-accounts", data);
  return resp.data.data;
}

export async function updatePharmacyAccount(id: string, data: { pharmacyName?: string; password?: string; status?: "ACTIVE" | "INACTIVE" }): Promise<PharmacyAccount> {
  const resp = await apiClient.patch<Envelope<PharmacyAccount>>(`/pharmacy-accounts/${id}`, data);
  return resp.data.data;
}

export async function addAccountOperator(id: string, name: string): Promise<AccountOperator> {
  const resp = await apiClient.post<Envelope<AccountOperator>>(`/pharmacy-accounts/${id}/operators`, { name });
  return resp.data.data;
}

export async function updateAccountOperator(id: string, opId: string, data: { name?: string; isActive?: boolean }): Promise<AccountOperator> {
  const resp = await apiClient.patch<Envelope<AccountOperator>>(`/pharmacy-accounts/${id}/operators/${opId}`, data);
  return resp.data.data;
}