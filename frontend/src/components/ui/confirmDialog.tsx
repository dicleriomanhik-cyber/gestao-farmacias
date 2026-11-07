import { useEffect } from "react";
import { createRoot } from "react-dom/client";

type Opts = { title: string; message: string; confirmLabel: string; cancelLabel?: string; danger?: boolean };

function Dialog({ o, done }: { o: Opts; done: (v: boolean) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") done(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [done]);
  const danger = o.danger !== false;
  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "1rem" }}
      onClick={() => done(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 420, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#0f172a", marginBottom: "0.5rem" }}>{o.title}</div>
        <div style={{ fontSize: "0.9rem", color: "#334155", marginBottom: "1.25rem" }}>{o.message}</div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button
            onClick={() => done(false)}
            style={{ padding: "0.55rem 1.1rem", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", cursor: "pointer", fontSize: "0.9rem" }}
          >
            {o.cancelLabel ?? "Cancelar"}
          </button>
          <button
            autoFocus
            onClick={() => done(true)}
            style={{ padding: "0.55rem 1.1rem", borderRadius: 999, border: "none", background: danger ? "#e11d1d" : "var(--brand)", color: "#fff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 }}
          >
            {o.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function confirmDialog(o: Opts): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: boolean) => {
      root.unmount();
      host.remove();
      resolve(v);
    };
    root.render(<Dialog o={o} done={done} />);
  });
}