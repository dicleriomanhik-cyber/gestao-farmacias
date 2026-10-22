import PageHeader from "../../components/ui/PageHeader";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSales } from "../../services/saleService";
import type { Sale, SaleStatus, PaginatedMeta } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { useAuth } from "../../hooks/useAuth";
import { canCreateSales } from "../../utils/permissions";

export default function SaleListPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getSales({ page, limit: 5, status: statusFilter || undefined })
      .then((res) => { setSales(res.data); setMeta(res.meta); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, statusFilter]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;
  if (sales.length === 0 && page === 1 && !statusFilter) {
    return <EmptyState message="Nenhuma venda registada." actionLabel={canCreateSales(user?.role) ? "Nova Venda" : undefined} actionLink={canCreateSales(user?.role) ? "/vendas/novo" : undefined} />;
  }

  return (
    <div>
      <PageHeader title="Vendas" actions={canCreateSales(user?.role) ? <Link to="/vendas/novo" className="btn btn-primary">+ Nova Venda</Link> : null} />

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem", fontWeight: 500 }}>Estado:</label>
        <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value as SaleStatus | ""); }} style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}>
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
              <th style={{ padding: "0.75rem" }}>Data</th>
              <th style={{ padding: "0.75rem" }}>Método</th>
              <th style={{ padding: "0.75rem" }}>Total</th>
              <th style={{ padding: "0.75rem" }}>Estado</th>
              <th style={{ padding: "0.75rem" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.75rem" }}>#{sale.id.substring(0, 6)}</td>
                <td style={{ padding: "0.75rem" }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "0.75rem" }}>{sale.paymentMethod}</td>
                <td style={{ padding: "0.75rem" }}>{sale.total} MT</td>
                <td style={{ padding: "0.75rem" }}>
                  <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: sale.status === "CONFIRMED" ? "#dcfce7" : sale.status === "CANCELLED" ? "#fee2e2" : "#fef08a", color: sale.status === "CONFIRMED" ? "#166534" : sale.status === "CANCELLED" ? "#991b1b" : "#854d0e" }}>
                    {sale.status}
                  </span>
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <Link to={`/vendas/${sale.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>Ver Detalhe</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "0.5rem 1rem", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}>Anterior</button>
          <span style={{ color: "#6b7280" }}>Página {meta.page} de {meta.totalPages} — {meta.total} registos</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} style={{ padding: "0.5rem 1rem", cursor: page >= meta.totalPages ? "not-allowed" : "pointer", opacity: page >= meta.totalPages ? 0.5 : 1 }}>Próxima</button>
        </div>
      )}
    </div>
  );
}

