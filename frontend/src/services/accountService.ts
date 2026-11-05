import { apiClient } from "./api";

export async function registerPharmacy(data: {
  pharmacyName: string;
  pharmacyNif?: string;
  adminName?: string;
  email: string;
  password: string;
  posPassword: string;
}): Promise<void> {
  await apiClient.post("/auth/register", data);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/reset-password", { token, newPassword });
}

export async function verifyResetCode(email: string, code: string): Promise<string> {
  const { data } = await apiClient.post("/auth/verify-reset-code", { email, code });
  return (data?.data ?? data).token;
}
