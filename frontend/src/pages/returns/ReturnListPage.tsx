import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReturns } from "../../services/returnService";
import type { SaleReturn } from "../../types/returns";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

export default function ReturnListPage() {
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);

  // Estado para itens ocultos (LocalStorage)
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("hidden_returns");
    return saved ? JSON.parse(saved) : [];
  });

  const [showHidden, setShowHidden] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getReturns({ page, limit: 10 })
      .then((res) => {
        setReturns(res.data);
        setMeta(res.meta);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page]);

  // Sincronizar LocalStorage
  useEffect(() => {
    localStorage.setItem("hidden_returns", JSON.stringify(hiddenIds));
  }, [hiddenIds]);

  function handleClearHistory() {
    if (!window.confirm("Tem a certeza que deseja ocultar TODO o histórico desta página? (Pode ser recuperado depois)")) return;
    const idsToHide = returns.map((r) => r.id);
    setHiddenIds((prev) => [...new Set([...prev, ...idsToHide])]);
  }

  function handleRestoreHistory() {
    setHiddenIds([]);
    setShowHidden(true);
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;

  const visibleReturns = returns.filter((r) => showHidden || !hiddenIds.includes(r.id));

  if (visibleReturns.length === 0 && page === 1) {
    return (
      <div>
        <PageHeader title="Devoluções" />
        <EmptyState message="Nenhuma devolução registada (ou todas ocultas)." />
        {hiddenIds.length > 0 && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button onClick={handleRestoreHistory} className="btn btn-secondary">Mostrar Ocultos</button>
          </div>
        )}
      </div>
    );
  }

  function statusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
      CONFIRMED: { bg: "#dbeafe", color: "#1e40af", label: "Confirmada" },
      COMPLETED: { bg: "#dcfce7", color: "#166534", label: "Concluída" },
      CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelada" },
    };
    const cfg = map[status] ?? { bg: "#e5e7eb", color: "#374151", label: status };
    return (
      <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <PageHeader title="Devoluções" />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {hiddenIds.length > 0 && (
            <button onClick={() => setShowHidden(!showHidden)} className="btn btn-secondary">
              {showHidden ? "Ocultar Ocultos" : "Mostrar Ocultos"}
            </button>
          )}
          <button onClick={handleClearHistory} className="btn btn-danger" style={{ backgroundColor: "#ef4444", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}>
            Limpar Histórico
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "12%" }}>Nº</th>
              <th style={{ width: "12%" }}>Venda</th>
              <th style={{ width: "40%" }}>Motivo</th>
              <th style={{ width: "12%" }}>Total</th>
              <th style={{ width: "12%" }}>Estado</th>
              <th style={{ width: "12%" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visibleReturns.map((r) => (
              <tr key={r.id}>
                <td>{r.returnNumber}</td>
                <td>{r.sale?.saleNumber ?? "—"}</td>
                <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.reason}>{r.reason}</td>
                <td>{parseFloat(r.totalRefund).toFixed(2)} MT</td>
                <td>{statusBadge(r.status)}</td>
                <td style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={() => setSelectedReturn(r)}
                    style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Ver
                  </button>
                  <Link to={`/devolucoes/${r.id}`} style={{ color: "#2563eb", textDecoration: "underline" }}>Detalhe</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-secondary" style={{ opacity: page <= 1 ? 0.5 : 1 }}>Anterior</button>
          <span>Página {meta.page} de {meta.totalPages} — {meta.total} registos</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="btn btn-secondary" style={{ opacity: page >= meta.totalPages ? 0.5 : 1 }}>Próxima</button>
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {selectedReturn && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={() => setSelectedReturn(null)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white", borderRadius: "12px", padding: "1.5rem",
              maxWidth: "600px", width: "90%", maxHeight: "80vh",
              overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#1e293b" }}>
              Devolução {selectedReturn.returnNumber}
            </h2>
            <p><strong>Venda:</strong> {selectedReturn.sale?.saleNumber ?? "—"}</p>
            <p><strong>Estado:</strong> {statusBadge(selectedReturn.status)}</p>
            <p><strong>Total Reembolso:</strong> {parseFloat(selectedReturn.totalRefund).toFixed(2)} MT</p>
            <p style={{ marginTop: "1rem" }}><strong>Motivo:</strong></p>
            <p style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {selectedReturn.reason}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                onClick={() => setSelectedReturn(null)}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#e2e8f0",
                  color: "#1e293b", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
