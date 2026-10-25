import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSales } from "../../services/saleService";
import { formatDateTime } from "../../utils/formatDate";
import { getReturns } from "../../services/returnService";
import type { Sale, SaleStatus, PaginatedMeta } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { canCreateSales } from "../../utils/permissions";

interface Props {
  hideNewSaleButton?: boolean;
  isOperational?: boolean;
}

export default function SaleListPage({ hideNewSaleButton = false, isOperational = false }: Props) {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [returnedSaleIds, setReturnedSaleIds] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "RETURNED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      getSales({ page, limit: 10, status: statusFilter === "CONFIRMED" ? "CONFIRMED" : undefined }),
      getReturns({ page: 1, limit: 100 }),
    ])
      .then(([salesRes, returnsRes]) => {
        setSales(salesRes.data);
        setMeta(salesRes.meta);
        const ids = new Set<string>();
        returnsRes.data.forEach((r) => {
          if (r.status === "CONFIRMED" || r.status === "COMPLETED") {
            ids.add(r.saleId);
          }
        });
        setReturnedSaleIds(ids);
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
  if (sales.length === 0 && page === 1 && statusFilter === "ALL") {
    return (
      <EmptyState
        message="Nenhuma venda registada."
        actionLabel={!hideNewSaleButton && canCreateSales(user?.permissions) ? "Nova Venda" : undefined}
        actionLink={!hideNewSaleButton && canCreateSales(user?.permissions) ? "/pos" : undefined}
      />
    );
  }

  function statusBadge(status: SaleStatus) {
    const map = {
      DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
      CONFIRMED: { bg: "#dcfce7", color: "#166534", label: "Concluída" },
      CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelada" },
    };
    const cfg = map[status];
    return (
      <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    );
  }

  const filteredSales = statusFilter === "RETURNED"
    ? sales.filter((s) => returnedSaleIds.has(s.id))
    : sales;

  return (
    <div>
      <PageHeader
        title="Vendas"
        actions={!hideNewSaleButton && canCreateSales(user?.permissions) ? <Link to="/pos" className="btn btn-primary">+ Nova Venda</Link> : null}
      />

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem", fontWeight: 500 }}>Estado:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value as any); }}
          className="input"
          style={{ display: "inline-block", width: "auto" }}
        >
          <option value="ALL">Todos</option>
          <option value="CONFIRMED">Concluída</option>
          <option value="RETURNED">Reembolsada</option>
        </select>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Data</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((s) => {
              const isReturned = returnedSaleIds.has(s.id);
              return (
                <tr key={s.id}>
                  <td>{s.saleNumber}</td>
                  <td>{formatDateTime(s.createdAt)}</td>
                  <td>{parseFloat(s.total).toFixed(2)} MT</td>
                  <td>
                    {isReturned ? (
                      <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: "#fef3c7", color: "#92400e" }}>
                        Reembolsada
                      </span>
                    ) : (
                      statusBadge(s.status)
                    )}
                  </td>
                  <td>
                    <Link 
                      to={isOperational ? `/pos/historico/${s.id}` : `/vendas/${s.id}`} 
                      style={{ color: "#2563eb", textDecoration: "none" }}
                    >
                      Ver Detalhe
                    </Link>
                  </td>
                </tr>
              );
            })}
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
