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
  baseURL: API_BASE_URL, timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<any> | null = null;

export function refreshTokens(): Promise<any> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("Sem refresh token");
    let lastErr: any;
    for (let i = 0; i < 4; i++) {
      try {
        const resp = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: refresh }, { timeout: 40000 });
        const data = resp.data?.data;
        if (!data?.accessToken || !data?.refreshToken) throw new Error("Resposta de refresh invalida");
        accessToken = data.accessToken;
        setRefreshToken(data.refreshToken);
        return data;
      } catch (e: any) {
        lastErr = e;
        if (e?.response && [400, 401, 403].includes(e.response.status)) throw e;
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      }
    }
    throw lastErr;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

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

    const metodoReq = (original?.method ?? "get").toLowerCase();
    const transitorio = !error.response ? error.code !== "ERR_CANCELED" : [502, 503, 504].includes(status as number);
    const tentativasRt = ((original as any)?._rt ?? 0) as number;
    if (original && metodoReq === "get" && !isRefreshCall && transitorio && tentativasRt < 4 && navigator.onLine) {
      (original as any)._rt = tentativasRt + 1;
      await new Promise((r) => setTimeout(r, 1500 * (tentativasRt + 1)));
      return apiClient(original);
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

      const data = await refreshTokens();
      if (!data?.accessToken || !data?.refreshToken) {
        throw new Error("Resposta de refresh inválida");
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
      if (![400, 401, 403].includes(refreshErr?.response?.status)) {
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

let ultimoPing = 0;
function aquecerServidor(): void {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  if (Date.now() - ultimoPing < 4 * 60 * 1000) return;
  ultimoPing = Date.now();
  void fetch(API_BASE_URL, { method: "GET", mode: "no-cors", cache: "no-store" }).catch(() => {});
}
if (typeof document !== "undefined") {
  aquecerServidor();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) aquecerServidor(); });
  window.addEventListener("online", aquecerServidor);
}