import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStockLots } from "../../services/stockService";
import type { StockLot } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
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

  useEffect(() => {
    load();
  }, []);

  function isExpiringSoon(dateStr: string) {
    const expiry = new Date(dateStr).getTime();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return expiry - now < thirtyDays && expiry > now;
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr).getTime() < Date.now();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os lotes de stock." onRetry={load} />;
  if (lots.length === 0) {
    return <EmptyState message="Nenhum lote em stock. Recebe mercadoria para começar." />;
  }

  return (
    <div>
      <PageHeader
        title="Lotes de Stock"
        actions={
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link to="/stock/movimentos" className="btn btn-secondary">Movimentos</Link>
            <Link to="/stock/receber" className="btn btn-secondary">Receber Stock</Link>
            <Link to="/stock/ajustar" className="btn btn-warning">Ajustar Stock</Link>
          </div>
        }
      />

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Lote</th>
              <th>Quantidade</th>
              <th>Validade</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td>{lot.product?.name ?? "—"}</td>
                <td>{lot.lotNumber}</td>
                <td>{lot.quantityAvailable}</td>
                <td
                  style={{
                    fontWeight: isExpiringSoon(lot.expiryDate) || isExpired(lot.expiryDate) ? "bold" : "normal",
                    color: isExpired(lot.expiryDate) ? "#b91c1c" : isExpiringSoon(lot.expiryDate) ? "#ca8a04" : "inherit",
                  }}
                >
                  {new Date(lot.expiryDate).toLocaleDateString()}
                  {isExpired(lot.expiryDate) && " (Expirado)"}
                  {!isExpired(lot.expiryDate) && isExpiringSoon(lot.expiryDate) && " (A expirar)"}
                </td>
                <td>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    backgroundColor: lot.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                    color: lot.status === "ACTIVE" ? "#166534" : "#991b1b",
                  }}>
                    {lot.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


