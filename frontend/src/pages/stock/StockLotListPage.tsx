import { useEffect, useState } from "react";
import { getStockLots } from "../../services/stockService";
import type { StockLot } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";

export default function StockLotListPage() {
  const [lots, setLots] = useState<StockLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getStockLots()
      .then(setLots)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os lotes de stock." onRetry={load} />;
  if (lots.length === 0) return <EmptyState message="Nenhum lote em stock." actionLabel="Receber Stock" actionLink="/stock/receber" />;

  function isExpiringSoon(d: string) { const t = new Date(d).getTime(); const n = Date.now(); return t - n < 30*24*60*60*1000 && t > n; }
  function isExpired(d: string) { return new Date(d).getTime() < Date.now(); }

  return (
    <div>
      <PageHeader title="Lotes de Stock" actions={<span style={{ backgroundColor: "#fef08a", color: "#854d0e", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem" }}>[MOCK]</span>} />
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead><tr><th>Produto</th><th>Lote</th><th>Quantidade</th><th>Validade</th></tr></thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td>{lot.productName}</td>
                <td>{lot.batchNumber}</td>
                <td>{lot.quantity}</td>
                <td style={{ fontWeight: isExpiringSoon(lot.expiryDate) || isExpired(lot.expiryDate) ? "bold" : "normal", color: isExpired(lot.expiryDate) ? "#b91c1c" : isExpiringSoon(lot.expiryDate) ? "#ca8a04" : "inherit" }}>
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
