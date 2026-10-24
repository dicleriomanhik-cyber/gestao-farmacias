import { apiClient } from "./api";
import type { Pharmacy, PharmacyUpdateRequest } from "../types/pharmacy";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getPharmacy(): Promise<Pharmacy> {
  const resp = await apiClient.get<Envelope<Pharmacy>>("/pharmacy");
  return resp.data.data;
}

export async function updatePharmacy(data: PharmacyUpdateRequest): Promise<Pharmacy> {
  const resp = await apiClient.patch<Envelope<Pharmacy>>("/pharmacy", data);
  return resp.data.data;
}
