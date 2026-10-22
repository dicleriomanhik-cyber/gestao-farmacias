import { useEffect, useState } from "react";
import { getStockLots } from "../../services/stockService";
import type { StockLot } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";

export default function StockLotListPage() {
  const [lots, setLots] = useState<StockLot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockLots().then(setLots).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  function isExpiringSoon(dateStr: string) {
    const expiry = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return expiry - now < thirtyDays;
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr).getTime() < new Date().getTime();
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Lotes de Stock</h1>
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "0.75rem" }}>Produto</th>
              <th style={{ padding: "0.75rem" }}>Lote</th>
              <th style={{ padding: "0.75rem" }}>Quantidade</th>
              <th style={{ padding: "0.75rem" }}>Validade</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.75rem" }}>{lot.productName}</td>
                <td style={{ padding: "0.75rem" }}>{lot.batchNumber}</td>
                <td style={{ padding: "0.75rem" }}>{lot.quantity}</td>
                <td style={{ padding: "0.75rem", fontWeight: isExpiringSoon(lot.expiryDate) ? "bold" : "normal", color: isExpired(lot.expiryDate) ? "#b91c1c" : isExpiringSoon(lot.expiryDate) ? "#ca8a04" : "inherit" }}>
                  {new Date(lot.expiryDate).toLocaleDateString()}
                  {isExpired(lot.expiryDate) && " (Expirado)"}
                  {!isExpired(lot.expiryDate) && isExpiringSoon(lot.expiryDate) && " (A expirar)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
