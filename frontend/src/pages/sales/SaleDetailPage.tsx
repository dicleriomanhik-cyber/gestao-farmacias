import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSaleById, confirmSale } from "../../services/saleService";
import type { Sale } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import { useToast } from "../../contexts/ToastContext";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(false);
    getSaleById(id)
      .then((s) => { setSale(s); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function handleConfirm() {
    if (!id) return;
    await confirmSale(id);
    toast.success("Venda confirmada com sucesso!");
    navigate("/vendas");
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a venda." onRetry={load} />;
  if (!sale) return <ErrorState message="Venda não encontrada." onRetry={() => navigate("/vendas")} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Detalhe da Venda #{sale.id}</h1>
      <p><strong>Estado:</strong> {sale.status}</p>
      <p><strong>Data:</strong> {new Date(sale.createdAt).toLocaleString()}</p>
      <p><strong>Método de Pagamento:</strong> {sale.paymentMethod}</p>

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Itens</h3>
      <table className="table">
        <thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead>
        <tbody>
          {sale.items.map((item, idx) => (
            <tr key={idx}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td>{item.unitPrice} MT</td>
              <td>{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} MT</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "1rem", textAlign: "right" }}>Total: {sale.total} MT</h2>

      {sale.status === "DRAFT" && (
        <button onClick={handleConfirm} className="btn btn-success" style={{ marginTop: "1rem", width: "100%", padding: "0.75rem" }}>
          Confirmar Venda
        </button>
      )}
    </div>
  );
}
