import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSales } from "../../services/saleService";
import type { Sale } from "../../types/sales";
import SaleTable from "../../components/tables/SaleTable";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

export default function SaleListPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getSales()
      .then(setSales)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => window.location.reload()} />;
  if (sales.length === 0) return <EmptyState message="Nenhuma venda registada." actionLabel="Nova Venda" actionLink="/vendas/novo" />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Vendas</h1>
        <Link to="/vendas/novo" style={{ backgroundColor: "#2563eb", color: "white", padding: "0.5rem 1rem", borderRadius: "4px", textDecoration: "none" }}>
          + Nova Venda
        </Link>
      </div>
      <div className="card" style={{ padding: "1rem" }}>
        <SaleTable sales={sales} />
      </div>
    </div>
  );
}
