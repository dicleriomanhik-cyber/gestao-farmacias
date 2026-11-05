import { apiClient } from "./api";
import type { PharmacySettings, PharmacySettingsUpdate } from "../types/settings";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getSettings(): Promise<PharmacySettings> {
  const resp = await apiClient.get<Envelope<PharmacySettings>>("/settings");
  return resp.data.data;
}

export async function updateSettings(data: PharmacySettingsUpdate): Promise<PharmacySettings> {
  const resp = await apiClient.patch<Envelope<PharmacySettings>>("/settings", data);
  return resp.data.data;
}

export async function deleteAccount(password: string): Promise<void> {
  await apiClient.post("/account/delete", { password });
}
