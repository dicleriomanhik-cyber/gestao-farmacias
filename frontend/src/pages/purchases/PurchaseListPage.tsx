import CustomSelect from "../../components/ui/CustomSelect";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPurchases } from "../../services/purchaseService";
import { getSettings } from "../../services/settingsService";
import type { Purchase, PurchaseStatus, PaginatedMeta } from "../../types/purchases";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/suppliers/Badge";
import { fmtDate, fmtMt, num } from "../../utils/supplierFormat";

export default function PurchaseListPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "">("");
  const [payables, setPayables] = useState(false);
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
    getSettings()
      .then((st) => setPayables(Boolean(st.usePayables)))
      .catch(() => setPayables(false));
  }, []);

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
        actionLink="/fornecedores/compras/nova"
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Compras"
        actions={<Link to="/fornecedores/compras/nova" className="btn btn-primary">Nova Compra</Link>}
      />

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ marginRight: "0.5rem", fontWeight: 500 }}>Estado:</label>
        <div style={{ display: "inline-block", minWidth: 180, verticalAlign: "middle" }}><CustomSelect value={statusFilter} onChange={(v) => { setPage(1); setStatusFilter(v as PurchaseStatus | ""); }} options={[{ value: "", label: "Todos" }, { value: "DRAFT", label: "Rascunho" }, { value: "CONFIRMED", label: "Confirmada" }, { value: "CANCELLED", label: "Cancelada" }]} /></div>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nº da fatura</th>
              <th>Fornecedor</th>
              <th>Data</th>
              <th>Total</th>
              {payables && <th>Em dívida</th>}
              {payables && <th>Pagamento</th>}
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{p.documentNumber}</td>
                <td>{p.supplier?.name ?? "—"}</td>
                <td>{fmtDate(p.purchaseDate)}</td>
                <td>{fmtMt(p.dueMzn ?? p.totalAmount)}</td>
                {payables && <td>{fmtMt(num(p.outstanding))}</td>}
                {payables && <td><Badge kind="payment" value={p.paymentStatus ?? "PAID"} /></td>}
                <td><Badge kind="purchase" value={p.status} /></td>
                <td>
                  <Link to={`/fornecedores/compras/${p.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
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