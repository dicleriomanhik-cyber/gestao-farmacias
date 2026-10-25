import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPurchases } from "../../services/purchaseService";
import type { Purchase, PurchaseStatus, PaginatedMeta } from "../../types/purchases";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

export default function PurchaseListPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getPurchases({ page, limit: 10, status: statusFilter || undefined })
      .then((res) => {
        setPurchases(res.data);
        setMeta(res.meta);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;
  if (purchases.length === 0 && page === 1 && !statusFilter) {
    return (
      <EmptyState
        message="Nenhuma compra registada."
        actionLabel="Nova Compra"
        actionLink="/compras/novo"
      />
    );
  }

  function statusBadge(status: PurchaseStatus) {
    const map = {
      DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
      CONFIRMED: { bg: "#dcfce7", color: "#166534", label: "Confirmada" },
      CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelada" },
    };
    const cfg = map[status];
    return (
      <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    );
  }

  return (
    <div>
      <PageHeader
        title="Compras"
        actions={<Link to="/compras/novo" className="btn btn-primary">+ Nova Compra</Link>}
      />

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem", fontWeight: 500 }}>Estado:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value as PurchaseStatus | ""); }}
          className="input"
          style={{ display: "inline-block", width: "auto" }}
        >
          <option value="">Todos</option>
          <option value="DRAFT">Rascunho</option>
          <option value="CONFIRMED">Confirmada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Fornecedor</th>
              <th>Data</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{p.documentNumber}</td>
                <td>{p.supplier?.name ?? "—"}</td>
                <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                <td>{parseFloat(p.totalAmount).toFixed(2)} MT</td>
                <td>{statusBadge(p.status)}</td>
                <td>
                  <Link to={`/compras/${p.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    Ver Detalhe
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-secondary" style={{ opacity: page <= 1 ? 0.5 : 1 }}>
            Anterior
          </button>
          <span style={{ color: "#6b7280" }}>Página {meta.page} de {meta.totalPages} — {meta.total} registos</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="btn btn-secondary" style={{ opacity: page >= meta.totalPages ? 0.5 : 1 }}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
