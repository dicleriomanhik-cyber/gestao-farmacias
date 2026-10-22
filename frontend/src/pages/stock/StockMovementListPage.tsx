import { useEffect, useState } from "react";
import { getStockMovements } from "../../services/stockService";
import type { StockMovement } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";

export default function StockMovementListPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getStockMovements()
      .then(setMovements)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os movimentos de stock." onRetry={load} />;
  if (movements.length === 0) return <EmptyState message="Nenhum movimento de stock registado." />;

  return (
    <div>
      <PageHeader title="Movimentos de Stock" actions={<span style={{ backgroundColor: "#fef08a", color: "#854d0e", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem" }}>[MOCK]</span>} />
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Quantidade</th><th>Motivo</th></tr></thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                <td>{m.productName}</td>
                <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c" }}>{m.type}</td>
                <td>{m.quantity}</td>
                <td>{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
