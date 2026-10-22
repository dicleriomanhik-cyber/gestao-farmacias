import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPurchases } from "../../services/purchaseService";
import type { Purchase } from "../../types/purchases";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

export default function PurchaseListPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPurchases()
      .then(setPurchases)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => window.location.reload()} />;
  if (purchases.length === 0) return <EmptyState message="Nenhuma compra registada." actionLabel="Nova Compra" actionLink="/compras/novo" />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Compras</h1>
        <Link to="/compras/novo" style={{ backgroundColor: "#2563eb", color: "white", padding: "0.5rem 1rem", borderRadius: "4px", textDecoration: "none" }}>
          + Nova Compra
        </Link>
      </div>
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "0.75rem" }}>ID</th>
              <th style={{ padding: "0.75rem" }}>Fornecedor</th>
              <th style={{ padding: "0.75rem" }}>Data</th>
              <th style={{ padding: "0.75rem" }}>Total</th>
              <th style={{ padding: "0.75rem" }}>Estado</th>
              <th style={{ padding: "0.75rem" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.75rem" }}>#{p.id.substring(0, 6)}</td>
                <td style={{ padding: "0.75rem" }}>{p.supplierName}</td>
                <td style={{ padding: "0.75rem" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "0.75rem" }}>{p.total} MT</td>
                <td style={{ padding: "0.75rem" }}>
                  <span style={{
                    padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem",
                    backgroundColor: p.status === "CONFIRMED" ? "#dcfce7" : p.status === "CANCELLED" ? "#fee2e2" : "#fef08a",
                    color: p.status === "CONFIRMED" ? "#166534" : p.status === "CANCELLED" ? "#991b1b" : "#854d0e"
                  }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <Link to={`/compras/${p.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>Ver Detalhe</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
