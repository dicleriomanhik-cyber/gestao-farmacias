import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { triggerSync } from "../offline/events";
import { localResponse } from "../offline/readModel";
import { markApiOnline, markApiOffline } from "../offline/connectivity";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://gestao-farmacia-g3vh.onrender.com/api/v1";

const REFRESH_TOKEN_KEY = "sm.refreshToken";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token === null) localStorage.removeItem(REFRESH_TOKEN_KEY);
  else localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type PendingResolver = (token: string | null) => void;
let isRefreshing = false;
let pendingQueue: PendingResolver[] = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((resolve) => resolve(token));
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => {
    markApiOnline();
    const m = (response.config.method ?? "get").toLowerCase();
    if (m !== "get" && !String(response.config.url).includes("/sync/")) triggerSync();
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (!error.response && error.code !== "ERR_CANCELED") markApiOffline();
    if (!error.response && original && (original.method ?? "get").toLowerCase() === "get") {
      const local = await localResponse(original.url ?? "", (original.params ?? {}) as Record<string, any>);
      if (local) return { data: local, status: 200, statusText: "OK", headers: {}, config: original };
    }

    if (status !== 401 || !original || original._retry || isRefreshCall) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) return reject(error);
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const refresh = getRefreshToken();
      if (!refresh) throw new Error("Sem refresh token");

      const resp = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: refresh,
      });
      const data = resp.data?.data;
      if (!data?.accessToken || !data?.refreshToken) {
        throw new Error("Resposta de refresh invÃ¡lida");
      }

      accessToken = data.accessToken;
      setRefreshToken(data.refreshToken);
      flushQueue(data.accessToken);

      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch (refreshErr: any) {
      flushQueue(null);
      // Sem rede: mantém a sessão e os tokens. O POS continua a vender offline.
      if (!refreshErr?.response) {
        return Promise.reject(refreshErr);
      }
      // O servidor recusou a renovação: a sessão terminou.
      accessToken = null;
      setRefreshToken(null);
      if (typeof window !== "undefined" && !["/login", "/pos/login", "/criar-conta", "/esqueci-password", "/redefinir-password"].includes(window.location.pathname) && navigator.onLine) {
        window.location.assign(window.location.pathname.startsWith("/pos") ? "/pos/login" : "/login");
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);



