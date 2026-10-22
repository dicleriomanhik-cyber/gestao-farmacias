export type ToastVariant = "success" | "error" | "info";

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

const colorMap: Record<ToastVariant, { bg: string; color: string; border: string }> = {
  success: { bg: "#dcfce7", color: "#166534", border: "#16a34a" },
  error: { bg: "#fee2e2", color: "#991b1b", border: "#b91c1c" },
  info: { bg: "#dbeafe", color: "#1e40af", border: "#2563eb" },
};

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "calc(100vw - 2rem)" }}>
      {toasts.map((t) => {
        const palette = colorMap[t.variant];
        return (
          <div key={t.id} role="alert" aria-live="polite" style={{ backgroundColor: palette.bg, color: palette.color, borderLeft: `4px solid ${palette.border}`, padding: "0.75rem 1rem", borderRadius: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", minWidth: "260px", maxWidth: "400px", fontSize: "0.875rem", fontWeight: 500 }}>
            <span>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: palette.color, fontSize: "1rem", lineHeight: 1, padding: 0 }} aria-label="Fechar notificação">×</button>
          </div>
        );
      })}
    </div>
  );
}
