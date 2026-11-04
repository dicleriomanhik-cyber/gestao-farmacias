import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OutboxOperation } from "../../offline/db";
import { listOpenOperations, retryOperationNow, discardOperation, visibleOperations, buildGroups, type OpGroup } from "../../offline/outboxAdmin";

const TIPOS: Record<string, string> = {
  CASH_OPEN: "Abertura de caixa",
  SALE: "Venda",
  PAYMENT: "Pagamento",
  EXPENSE: "Despesa",
  RETURN: "Devolução",
  CASH_CLOSE: "Fecho de caixa",
  EXPENSE_CONFIRM: "Confirmar despesa",
  EXPENSE_CANCEL: "Cancelar despesa",
  EXPENSE_UPDATE: "Editar despesa",
  RETURN_CONFIRM: "Confirmar devolução",
  RETURN_INSPECT: "Inspeção de devolução",
  RETURN_CANCEL: "Cancelar devolução",
  REFUND: "Reembolso",
  CATEGORY_CREATE: "Categoria",
  CATEGORY_UPDATE: "Editar categoria",
  PRODUCT_CREATE: "Produto",
  STOCK_BOX_CREATE: "Registar caixa",
};

type Group = OpGroup;

function isRejected(o: OutboxOperation): boolean {
  return o.status === "REJECTED" || o.status === "CONFLICT";
}

function shortId(id: unknown): string {
  return String(id ?? "").replace(/^LOCAL-/, "").slice(0, 8);
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "0.7rem 1rem", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em",
  textTransform: "uppercase", color: "#475569", background: "#f1f5f9", borderBottom: "2px solid #e2e8f0",
};
const td: React.CSSProperties = {
  padding: "0.75rem 1rem", fontSize: "0.88rem", color: "#0f172a", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle",
};
const btn: React.CSSProperties = {
  padding: "0.35rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff",
  cursor: "pointer", fontSize: "0.8rem", color: "#0f172a",
};

export default function SyncQueuePage() {
  const navigate = useNavigate();
  const [ops, setOps] = useState<OutboxOperation[]>([]);
  const [confirmGroup, setConfirmGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (!confirmGroup) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setConfirmGroup(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [confirmGroup]);

  const load = useCallback(async () => {
    try {
      setOps(await listOpenOperations());
    } catch {
      /* IndexedDB indisponível */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 2000);
    return () => clearInterval(t);
  }, [load]);

  async function retry(g: Group) {
    const rej = g.ops
      .filter(isRejected)
      .sort((a, b) => (a.operationType === "RETURN" ? 0 : 1) - (b.operationType === "RETURN" ? 0 : 1));
    for (const o of rej) await retryOperationNow(o.idempotencyKey);
    await load();
  }

  async function confirmDiscard() {
    const g = confirmGroup;
    setConfirmGroup(null);
    if (!g) return;
    for (const o of g.ops) await discardOperation(o.idempotencyKey);
    await load();
  }

  const avisoDescartar = !confirmGroup
    ? ""
    : confirmGroup.ops.some((o) => o.operationType === "SALE" || o.operationType === "PAYMENT")
      ? "Esta operação ainda não foi enviada. Se a descartar, a venda ou o pagamento perde-se."
      : confirmGroup.ops.some((o) => o.operationType === "STOCK_BOX_CREATE")
        ? "Descarta o registo da caixa e do produto associado. Esta ação não pode ser desfeita."
        : confirmGroup.ops.length > 1 && confirmGroup.ops.some((o) => o.operationType.startsWith("EXPENSE"))
        ? "Descarta a despesa e todos os passos associados. Esta ação não pode ser desfeita."
        : confirmGroup.ops.length > 1
        ? "Descarta a devolução e todos os passos associados. Esta ação não pode ser desfeita."
        : "Esta ação não pode ser desfeita.";

  const rows = visibleOperations(ops);
  const groups = buildGroups(rows);
  const temRejeitadas = groups.some((g) => g.ops.some(isRejected));
  const temPendentes = groups.some((g) => !g.ops.some(isRejected));

  function valorDe(o: OutboxOperation): string {
    let a = o.payload?.amount;
    if (a == null && o.operationType === "SALE") {
      a = ops.find((p) => p.operationType === "PAYMENT" && p.payload?.saleKey === o.idempotencyKey)?.payload?.amount;
    }
    return a != null ? `${Number(a).toFixed(2)} MT` : "-";
  }

  function valorGrupo(g: Group): string {
    const exp = g.ops.find((o) => o.operationType === "EXPENSE");
    if (exp) {
      const upd = g.ops.filter((o) => o.operationType === "EXPENSE_UPDATE").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const a = upd?.payload?.data?.amount ?? exp.payload?.amount;
      return a != null ? `${Number(a).toFixed(2)} MT` : "-";
    }
    const refunds = g.ops.filter((o) => o.operationType === "REFUND");
    if (refunds.length > 0) {
      const total = refunds.reduce((s, o) => s + Number(o.payload?.amount ?? 0), 0);
      return `${total.toFixed(2)} MT`;
    }
    if (g.ops.length === 1) return valorDe(g.ops[0]);
    return "-";
  }

  function rotuloGrupo(g: Group): string {
    if (g.ops.some((o) => o.operationType.startsWith("EXPENSE"))) return "Despesa";
    if (g.ops.some((o) => o.operationType === "STOCK_BOX_CREATE")) return "Registar caixa";
    const ret = g.ops.find((o) => o.operationType === "RETURN");
    if (ret) return `Devolução (venda ${shortId(ret.payload?.saleId)})`;
    const refund = g.ops.find((o) => o.operationType === "REFUND");
    const main = refund ?? g.ops[0];
    return TIPOS[main.operationType] ?? main.operationType;
  }

  function dataGrupo(g: Group): string {
    const first = g.ops.map((o) => o.createdAt).sort()[0];
    return new Date(first).toLocaleString("pt-PT");
  }

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Sincronização</h2>
        <button style={btn} onClick={() => navigate(-1)}>Voltar</button>
      </div>

      <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Pendentes ({groups.length})</h3>
      {groups.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Tudo sincronizado.</p>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px" }}>
            <thead>
              <tr>
                <th style={th}>Operação</th>
                <th style={th}>Data e hora</th>
                <th style={{ ...th, textAlign: "right" }}>Valor</th>
                <th style={{ ...th, textAlign: "center" }}>Estado</th>
                {temRejeitadas && <th style={th}>Detalhe</th>}
                <th style={{ ...th, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => {
                const rejOps = g.ops.filter(isRejected);
                const rej = rejOps.length > 0;
                const bg = i % 2 === 1 ? "#f8fafc" : "#fff";
                return (
                  <tr key={g.id} style={{ background: bg }}>
                    <td style={{ ...td, fontWeight: 600 }}>{rotuloGrupo(g)}</td>
                    <td style={{ ...td, color: "#475569", whiteSpace: "nowrap" }}>{dataGrupo(g)}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{valorGrupo(g)}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span style={{ display: "inline-block", padding: "0.2rem 0.7rem", borderRadius: "999px", background: rej ? "#fef2f2" : "#fffbeb", color: rej ? "#b91c1c" : "#92400e", fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {rej ? "Rejeitada" : "Pendente"}
                      </span>
                    </td>
                    {temRejeitadas && <td style={{ ...td, color: "#475569", maxWidth: "380px" }}>{rej ? (rejOps[0].rejectionReason ?? "Sem motivo registado.") : ""}</td>}
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {rej && <button style={{ ...btn, marginRight: "0.4rem" }} onClick={() => void retry(g)}>Tentar novamente</button>}
                      <button style={{ ...btn, color: "#b91c1c", borderColor: "#fca5a5" }} onClick={() => setConfirmGroup(g)}>Descartar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {temPendentes && (
        <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
          As operações pendentes aguardam ligação à internet e são sincronizadas automaticamente.
        </p>
      )}

      {confirmGroup && (
        <div
          onClick={() => setConfirmGroup(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: "380px", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
          >
            <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#0f172a", marginBottom: "0.5rem" }}>Descartar esta operação?</div>
            <div style={{ fontSize: "0.9rem", color: "#334155", marginBottom: "1.25rem" }}>{avisoDescartar}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                onClick={() => setConfirmGroup(null)}
                style={{ padding: "0.55rem 1.1rem", borderRadius: "999px", border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", cursor: "pointer", fontSize: "0.9rem" }}
              >
                Cancelar
              </button>
              <button
                autoFocus
                onClick={() => void confirmDiscard()}
                style={{ padding: "0.55rem 1.1rem", borderRadius: "999px", border: "none", background: "#e11d1d", color: "#fff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}