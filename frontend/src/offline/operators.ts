import { useEffect, useState } from "react";
import { apiClient } from "../services/api";
import { getMeta, setMeta } from "./db";

export interface OperatorItem {
  id: string;
  name: string;
}

interface OperatorsData {
  pharmacyName: string;
  operators: OperatorItem[];
}

let data: OperatorsData | null = null;
let selected: OperatorItem | null = null;
const listeners = new Set<() => void>();

try {
  localStorage.removeItem("sm.operatorId");
} catch {
  selected = null;
}

function emit(): void {
  listeners.forEach((l) => l());
}

function inPos(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/pos");
}

export async function refreshOperators(): Promise<void> {
  try {
    const resp = await apiClient.get("/operators");
    const d = resp.data?.data;
    if (d && Array.isArray(d.operators)) {
      data = { pharmacyName: String(d.pharmacyName ?? ""), operators: d.operators };
      await setMeta("operatorsData", data).catch(() => undefined);
    }
  } catch {
    if (!data) {
      const cached = await getMeta("operatorsData").catch(() => null);
      if (cached) data = cached;
    }
  }
  emit();
}

export function findOperator(id: string): OperatorItem | null {
  return data?.operators.find((o) => o.id === id) ?? null;
}

export function setSessionOperator(id: string | null, name?: string | null): void {
  const next: OperatorItem | null = id ? { id, name: name || findOperator(id)?.name || "" } : null;
  if (selected?.id === next?.id && selected?.name === next?.name) return;
  selected = next;
  emit();
}

export function getSelectedOperator(): { id: string; name: string } | null {
  if (!inPos() || !selected) return null;
  return { id: selected.id, name: selected.name };
}

export function operatorRequired(): boolean {
  return inPos() && !!data && data.operators.length > 0 && !selected;
}

export function useOperators() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    void refreshOperators();
    const t = setInterval(() => void refreshOperators(), 60000);
    return () => {
      listeners.delete(fn);
      clearInterval(t);
    };
  }, []);
  return { pharmacyName: data?.pharmacyName ?? "", operators: data?.operators ?? [], selectedId: selected?.id ?? null, selectedName: selected?.name ?? "" };
}