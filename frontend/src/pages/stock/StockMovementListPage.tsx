import { useEffect, useState } from "react";
import { getStockMovements } from "../../services/stockService";
import type { StockMovement } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";

export default function StockMovementListPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockMovements().then(setMovements).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Movimentos de Stock</h1>
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "0.75rem" }}>Data</th>
              <th style={{ padding: "0.75rem" }}>Produto</th>
              <th style={{ padding: "0.75rem" }}>Tipo</th>
              <th style={{ padding: "0.75rem" }}>Quantidade</th>
              <th style={{ padding: "0.75rem" }}>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.75rem" }}>{new Date(m.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "0.75rem" }}>{m.productName}</td>
                <td style={{ padding: "0.75rem", color: m.type === "IN" ? "#166534" : "#b91c1c" }}>{m.type}</td>
                <td style={{ padding: "0.75rem" }}>{m.quantity}</td>
                <td style={{ padding: "0.75rem" }}>{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
