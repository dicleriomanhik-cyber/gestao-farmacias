import { apiClient } from "./api";

export async function registerPharmacy(data: {
  pharmacyName: string;
  pharmacyNif?: string;
  adminName: string;
  email: string;
  password: string;
}): Promise<void> {
  await apiClient.post("/auth/register", data);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/reset-password", { token, newPassword });
}