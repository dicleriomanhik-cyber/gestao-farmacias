import { useEffect, useState } from "react";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "https://gestao-farmacia-g3vh.onrender.com/api/v1";
const PROBE_URL = BASE + "/sync/pull";
const PROBE_TIMEOUT_MS = 4000;
const PROBE_INTERVAL_MS = 1500;

let apiOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
let started = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<(value: boolean) => void>();

function setOnline(next: boolean): void {
  if (next === apiOnline) return;
  apiOnline = next;
  listeners.forEach((listener) => listener(next));
}

function probe(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
      await fetch(PROBE_URL, { method: "GET", mode: "no-cors", cache: "no-store", signal: ctrl.signal });
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      clearTimeout(timer);
      inflight = null;
    }
  })();
  return inflight;
}

export function checkApiNow(): void {
  void probe();
}

export function markApiOnline(): void {
  setOnline(true);
}

export function markApiOffline(): void {
  void probe();
}

export function subscribeApiOnline(listener: (value: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startConnectivityProbe(): void {
  if (started) return;
  started = true;
  void probe();
  setInterval(() => void probe(), PROBE_INTERVAL_MS);
  window.addEventListener("online", () => void probe());
  window.addEventListener("offline", () => setOnline(false));
  window.addEventListener("focus", () => void probe());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void probe();
  });
  const conn = (navigator as any).connection;
  if (conn && typeof conn.addEventListener === "function") conn.addEventListener("change", () => void probe());
}

export function isApiOnline(): boolean {
  return apiOnline;
}

export function useApiOnline(): boolean {
  const [value, setValue] = useState(apiOnline);
  useEffect(() => {
    startConnectivityProbe();
    listeners.add(setValue);
    setValue(apiOnline);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}