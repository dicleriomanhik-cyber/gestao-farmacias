const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Renda",
  UTILITIES: "Utilidades",
  TRANSPORT: "Transporte",
  CONSUMABLES: "Consumíveis",
  MAINTENANCE: "Manutenção",
  SALARIES: "Salários",
  TAXES: "Impostos",
  OTHER: "Outro",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  CARD: "Cartão",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

export function categoryLabel(v?: string | null): string {
  return v ? (CATEGORY_LABELS[v] ?? v) : "—";
}

export function methodLabel(v?: string | null): string {
  return v ? (METHOD_LABELS[v] ?? v) : "—";
}
