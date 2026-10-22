import PageHeader from "../../components/ui/PageHeader";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPurchases } from "../../services/purchaseService";
import type { Purchase, PurchaseStatus, PaginatedMeta } from "../../types/purchases";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

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
    getPurchases({ page, limit: 5, status: statusFilter || undefined })
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
    return <EmptyState message="Nenhuma compra registada." actionLabel="Nova Compra" actionLink="/compras/novo" />;
  }

  return (
    <div>
      <PageHeader title="Compras" actions={<Link to="/compras/novo" className="btn btn-primary">+ Nova Compra</Link>} />

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem", fontWeight: 500 }}>Estado:</label>
        <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value as PurchaseStatus | ""); }} style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}>
          <option value="">Todos</option>
          <option value="DRAFT">Rascunho</option>
          <option value="CONFIRMED">Confirmada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "0.75rem" }}>ID</th>
              <th style={{ padding: "0.75rem" }}>Fornecedor</th>
              <th style={{ padding: "0.75rem" }}>Data</th>
              <th style={{ padding: "0.75rem" }}>Total</th>
              <th style={{ padding: "0.75rem" }}>Estado</th>
              <th style={{ padding: "0.75rem" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.75rem" }}>#{p.id.substring(0, 6)}</td>
                <td style={{ padding: "0.75rem" }}>{p.supplierName}</td>
                <td style={{ padding: "0.75rem" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "0.75rem" }}>{p.total} MT</td>
                <td style={{ padding: "0.75rem" }}>
                  <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: p.status === "CONFIRMED" ? "#dcfce7" : p.status === "CANCELLED" ? "#fee2e2" : "#fef08a", color: p.status === "CONFIRMED" ? "#166534" : p.status === "CANCELLED" ? "#991b1b" : "#854d0e" }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <Link to={`/compras/${p.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>Ver Detalhe</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "0.5rem 1rem", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}>
            Anterior
          </button>
          <span style={{ color: "#6b7280" }}>
            Página {meta.page} de {meta.totalPages} — {meta.total} registos
          </span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} style={{ padding: "0.5rem 1rem", cursor: page >= meta.totalPages ? "not-allowed" : "pointer", opacity: page >= meta.totalPages ? 0.5 : 1 }}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

