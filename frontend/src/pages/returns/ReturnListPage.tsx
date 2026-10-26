import { useEffect, useState, useRef } from "react";
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
  const [deleteTarget, setDeleteTarget] = useState<SaleReturn | null>(null);
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);

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

  useEffect(() => {
    localStorage.setItem("hidden_returns", JSON.stringify(hiddenIds));
  }, [hiddenIds]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleConfirmDelete() {
    if (deleteTarget) {
      setHiddenIds((prev) => [...new Set([...prev, deleteTarget.id])]);
      setDeleteTarget(null);
    }
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
            <button onClick={() => { setHiddenIds([]); setShowHidden(true); }} className="btn btn-secondary">Mostrar Ocultos</button>
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
        </div>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "15%" }}>Nº</th>
              <th style={{ width: "15%" }}>Venda</th>
              <th style={{ width: "40%" }}>Motivo</th>
              <th style={{ width: "15%" }}>Total</th>
              <th style={{ width: "10%" }}>Estado</th>
              <th style={{ width: "5%", textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visibleReturns.map((r) => (
              <tr key={r.id} style={{ opacity: hiddenIds.includes(r.id) ? 0.5 : 1 }}>
                <td>{r.returnNumber}</td>
                <td>{r.sale?.saleNumber ?? "—"}</td>
                <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.reason}>{r.reason}</td>
                <td>{parseFloat(r.totalRefund).toFixed(2)} MT</td>
                <td>{statusBadge(r.status)}</td>
                <td style={{ textAlign: "center", position: "relative" }} ref={openMenuId === r.id ? menuRef : null}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", padding: "0 0.5rem" }}
                  >
                    ⋯
                  </button>
                  {openMenuId === r.id && (
                    <div style={{
                      position: "absolute", right: "100%", top: "50%", transform: "translateY(-50%)",
                      backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "6px",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)", zIndex: 10, minWidth: "120px",
                      display: "flex", flexDirection: "column", padding: "0.25rem 0"
                    }}>
                      <button
                        onClick={() => { setSelectedReturn(r); setOpenMenuId(null); }}
                        style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
                      >
                        Detalhe
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(r); setOpenMenuId(null); }}
                        style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#ef4444" }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
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

      {/* MODAL DE ELIMINAR */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white", borderRadius: "12px", padding: "1.5rem",
              maxWidth: "400px", width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#1e293b" }}>
              Eliminar Devolução
            </h2>
            <p style={{ marginBottom: "1.5rem", color: "#475569" }}>
              Tens a certeza que queres eliminar a devolução <strong>{deleteTarget.returnNumber}</strong>? 
              Ela será ocultada da lista (pode ser recuperada depois).
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#e2e8f0",
                  color: "#1e293b", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#ef4444",
                  color: "white", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: "pointer",
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
