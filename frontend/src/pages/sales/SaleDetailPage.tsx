import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSaleById, confirmSale } from "../../services/saleService";
import type { Sale } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getSaleById(id).then(setSale).finally(() => setLoading(false));
    }
  }, [id]);

  async function handleConfirm() {
    if (!id) return;
    await confirmSale(id);
    alert("Venda confirmada com sucesso!");
    navigate("/vendas");
  }

  if (loading) return <LoadingState />;
  if (!sale) return <div>Venda não encontrada</div>;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Detalhe da Venda #{sale.id}
      </h1>
      <p><strong>Estado:</strong> {sale.status}</p>
      <p><strong>Data:</strong> {new Date(sale.createdAt).toLocaleString()}</p>
      <p><strong>Método de Pagamento:</strong> {sale.paymentMethod}</p>

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Itens</h3>
      <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ccc" }}>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Preço</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
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
        <button
          onClick={handleConfirm}
          style={{ marginTop: "1rem", width: "100%", padding: "0.75rem", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Confirmar Venda
        </button>
      )}
    </div>
  );
}
