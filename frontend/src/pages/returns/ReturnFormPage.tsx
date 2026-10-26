import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSales } from "../../services/saleService";
import { getReturns } from "../../services/returnService";
import { formatDateTime } from "../../utils/formatDate";
import type { Sale } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

export default function ReturnFormPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [returnedSaleIds, setReturnedSaleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [dateFilter, setDateFilter] = useState<"ALL" | "DAILY">("DAILY");

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      getSales({ page: 1, limit: 100 }),
      getReturns({ page: 1, limit: 100 })
    ])
      .then(([salesRes, returnsRes]) => {
        setSales(salesRes.data);
        const ids = new Set<string>();
        returnsRes.data.forEach((r) => {
          if (r.status === "CONFIRMED" || r.status === "COMPLETED" || r.status === "DRAFT") {
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
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;

  // 1. Filtrar por data
  let filteredSales = sales;
  if (dateFilter === "DAILY") {
    const todayStr = new Date().toLocaleDateString("pt-PT");
    filteredSales = filteredSales.filter(s => new Date(s.createdAt).toLocaleDateString("pt-PT") === todayStr);
  }

  // 2. Remover vendas que já têm devolução
  filteredSales = filteredSales.filter(s => !returnedSaleIds.has(s.id));

  return (
    <div>
      <PageHeader
        title="Nova Devolução"
        actions={
          <button
            onClick={() => setDateFilter(dateFilter === "DAILY" ? "ALL" : "DAILY")}
            className="btn btn-secondary"
          >
            {dateFilter === "DAILY" ? "Ver Tudo" : "Ver Hoje"}
          </button>
        }
      />

      {filteredSales.length === 0 ? (
        <EmptyState message={dateFilter === "DAILY" ? "Nenhuma venda disponível para devolução hoje." : "Nenhuma venda disponível para devolução."} />
      ) : (
        <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
          <p style={{ marginBottom: "1rem", color: "#475569" }}>Selecione a venda que deseja devolver:</p>
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Produtos</th>
                <th>Data</th>
                <th>Total</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.saleNumber}</td>
                  <td>
                    {s.lines?.map((l) => l.product?.name ?? l.productId).join(", ") ?? "—"}
                  </td>
                  <td>{formatDateTime(s.createdAt)}</td>
                  <td>{parseFloat(s.total).toFixed(2)} MT</td>
                  <td>
                    <Link
                      to={`/pos/devolucoes/nova/${s.id}`}
                      className="btn btn-primary"
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    >
                      Selecionar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
