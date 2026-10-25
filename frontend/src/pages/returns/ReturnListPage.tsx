import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReturns } from "../../services/returnService";
import { formatDateTime } from "../../utils/formatDate";
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;
  if (returns.length === 0 && page === 1) {
    return <EmptyState message="Nenhuma devolução registada." />;
  }

  return (
    <div>
      <PageHeader title="Devoluções" />
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Venda</th>
              <th>Motivo</th>
              <th>Total Reembolso</th>
              <th>Data</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id}>
                <td>{r.returnNumber}</td>
                <td>{r.sale?.saleNumber ?? "—"}</td>
                <td>{r.reason}</td>
                <td>{parseFloat(r.totalRefund).toFixed(2)} MT</td>
                <td>{formatDateTime(r.createdAt)}</td>
                <td>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    backgroundColor: r.status === "DRAFT" ? "#fef08a" : r.status === "CONFIRMED" ? "#dbeafe" : "#dcfce7",
                    color: r.status === "DRAFT" ? "#854d0e" : r.status === "CONFIRMED" ? "#1e40af" : "#166534",
                  }}>
                    {r.status}
                  </span>
                </td>
                <td><Link to={`/devolucoes/${r.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>Ver</Link></td>
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
    </div>
  );
}
