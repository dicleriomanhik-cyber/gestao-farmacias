import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSaleById } from "../../services/saleService";
import type { Sale, SaleStatus } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(false);
    getSaleById(id)
      .then(setSale)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function statusBadge(status: SaleStatus) {
    const map = {
      DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
      CONFIRMED: { bg: "#dcfce7", color: "#166534", label: "Concluída" },
      CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelada" },
    };
    const cfg = map[status];
    return (
      <span style={{ padding: "0.25rem 0.75rem", borderRadius: "4px", backgroundColor: cfg.bg, color: cfg.color, fontWeight: 500 }}>
        {cfg.label}
      </span>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a venda." onRetry={load} />;
  if (!sale) return <ErrorState message="Venda não encontrada." onRetry={() => navigate("/vendas")} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Venda {sale.saleNumber}</h1>
        {statusBadge(sale.status)}
      </div>

      <p><strong>Data:</strong> {new Date(sale.createdAt).toLocaleString()}</p>
      <p><strong>Subtotal:</strong> {parseFloat(sale.subtotal).toFixed(2)} MT</p>
      <p><strong>Desconto:</strong> {parseFloat(sale.discount).toFixed(2)} MT</p>
      <p><strong>Total:</strong> {parseFloat(sale.total).toFixed(2)} MT</p>

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Linhas</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Preço Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {(sale.lines ?? []).map((line) => (
            <tr key={line.id}>
              <td>{line.product?.name ?? line.productId.substring(0, 8) + "…"}</td>
              <td>{line.quantity}</td>
              <td>{parseFloat(line.unitPrice).toFixed(2)} MT</td>
              <td>{parseFloat(line.subtotal).toFixed(2)} MT</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
