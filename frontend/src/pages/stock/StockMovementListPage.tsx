import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStockMovements } from "../../services/stockService";
import type { StockMovement } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

function typeLabel(type: string): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    PURCHASE_ENTRY: { label: "Entrada (Compra)", bg: "#dcfce7", color: "#166534" },
    ADJUSTMENT_IN: { label: "Ajuste (entrada)", bg: "#dbeafe", color: "#1e40af" },
    ADJUSTMENT_OUT: { label: "Ajuste (saída)", bg: "#fef08a", color: "#854d0e" },
    SALE_EXIT: { label: "Saída (Venda)", bg: "#fee2e2", color: "#991b1b" },
    RETURN_ENTRY: { label: "Devolução (entrada)", bg: "#e0e7ff", color: "#3730a3" },
  };
  return map[type] ?? { label: type, bg: "#f3f4f6", color: "#374151" };
}

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

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os movimentos." onRetry={load} />;
  if (movements.length === 0) {
    return <EmptyState message="Nenhum movimento registado." />;
  }

  return (
    <div>
      <PageHeader
        title="Movimentos de Stock"
        actions={<Link to="/stock/lotes" className="btn btn-secondary">Voltar aos Lotes</Link>}
      />

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Produto</th>
              <th>Lote</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const tl = typeLabel(m.type);
              return (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleString()}</td>
                  <td>
                    <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: tl.bg, color: tl.color }}>
                      {tl.label}
                    </span>
                  </td>
                  <td style={{ color: m.quantity >= 0 ? "#166534" : "#b91c1c", fontWeight: 500 }}>
                    {m.quantity >= 0 ? "+" : ""}{m.quantity}
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {m.productId.substring(0, 8)}…
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {m.lotId.substring(0, 8)}…
                  </td>
                  <td style={{ fontSize: "0.875rem" }}>{m.notes ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
