import { useEffect, useState } from "react";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:3001/api/v1";
const PROBE_URL = BASE + "/sync/pull";

let apiOnline = true;
let started = false;
const listeners = new Set<(value: boolean) => void>();

async function probe(): Promise<void> {
  let next = true;
  try {
    await fetch(PROBE_URL, { method: "GET", mode: "no-cors", cache: "no-store" });
  } catch {
    next = false;
  }
  if (next !== apiOnline) {
    apiOnline = next;
    listeners.forEach((listener) => listener(next));
  }
}

export function startConnectivityProbe(): void {
  if (started) return;
  started = true;
  void probe();
  setInterval(() => void probe(), 5000);
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