interface Cfg {
  bg: string;
  color: string;
  label: string;
}

const PURCHASE: Record<string, Cfg> = {
  DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
  CONFIRMED: { bg: "#dcfce7", color: "#166534", label: "Confirmada" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelada" },
};

const PAYMENT: Record<string, Cfg> = {
  PAID: { bg: "#dcfce7", color: "#166534", label: "Pago" },
  PARTIAL: { bg: "#fef08a", color: "#854d0e", label: "Parcial" },
  CREDIT: { bg: "#fee2e2", color: "#991b1b", label: "A prazo" },
};

export default function Badge({ kind, value }: { kind: "purchase" | "payment"; value: string }) {
  const map = kind === "purchase" ? PURCHASE : PAYMENT;
  const cfg = map[value] ?? { bg: "#e5e7eb", color: "#374151", label: value };
  return (
    <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}