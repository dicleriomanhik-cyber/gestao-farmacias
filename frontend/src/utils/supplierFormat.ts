export function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function fmtMt(v: unknown): string {
  return num(v).toFixed(2) + " MT";
}

export function fmtMoney(v: unknown, currency?: string | null): string {
  const c = !currency || currency === "MZN" ? "MT" : currency;
  return num(v).toFixed(2) + " " + c;
}

export function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function apiError(err: any, fallback: string): string {
  if (err && !err.response && !err.isAxiosError && err.message) return String(err.message);
  const msg = err?.response?.data?.error?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  return msg ? String(msg) : fallback;
}

export const PAID_FROM_OPTIONS: { value: string; label: string }[] = [
  { value: "PHARMACY_CASH", label: "Caixa da farmácia" },
  { value: "OWNER_CASH", label: "Dinheiro do dono ou do colaborador" },
  { value: "BANK", label: "Banco/transferência" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "EMOLA", label: "e-Mola" },
  { value: "OTHER", label: "Outro" },
];

export const PAID_FROM_LABEL: Record<string, string> = Object.fromEntries(PAID_FROM_OPTIONS.map((o) => [o.value, o.label]));

export const METHOD_LABEL: Record<string, string> = {
  CASH: "Dinheiro",
  CARD: "Cartão",
  TRANSFER: "Transferência",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  OTHER: "Outro",
};

export const METHODS_FOR: Record<string, string[]> = {
  PHARMACY_CASH: ["CASH"],
  OWNER_CASH: ["CASH"],
  BANK: ["TRANSFER", "CARD"],
  MPESA: ["MPESA"],
  EMOLA: ["EMOLA"],
  OTHER: ["OTHER"],
};