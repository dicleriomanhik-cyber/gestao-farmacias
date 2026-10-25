import {
  apiClient,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "./api";
import type { AuthResponse, LoginRequest, ApiSuccessEnvelope } from "../types/auth";

function unwrap<T>(payload: ApiSuccessEnvelope<T>): T {
  return payload.data;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const resp = await apiClient.post<ApiSuccessEnvelope<AuthResponse>>("/auth/login", data);
  const result = unwrap(resp.data);
  setAccessToken(result.accessToken);
  setRefreshToken(result.refreshToken);
  return result;
}

export async function refresh(): Promise<AuthResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Sem refresh token");
  const resp = await apiClient.post<ApiSuccessEnvelope<AuthResponse>>("/auth/refresh", {
    refreshToken,
  });
  const result = unwrap(resp.data);
  setAccessToken(result.accessToken);
  setRefreshToken(result.refreshToken);
  return result;
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = getRefreshToken();
    await apiClient.post("/auth/logout", { refreshToken });
  } catch {
    /* best-effort */
  } finally {
    setAccessToken(null);
    setRefreshToken(null);
  }
}
