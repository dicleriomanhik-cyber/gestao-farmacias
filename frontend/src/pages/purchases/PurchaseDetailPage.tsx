import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPurchaseById, confirmPurchase, cancelPurchase } from "../../services/purchaseService";
import type { Purchase } from "../../types/purchases";
import LoadingState from "../../components/ui/LoadingState";

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getPurchaseById(id).then(setPurchase).finally(() => setLoading(false));
    }
  }, [id]);

  async function handleConfirm() {
    if (!id) return;
    await confirmPurchase(id);
    alert("Compra confirmada!");
    navigate("/compras");
  }

  async function handleCancel() {
    if (!id) return;
    if (!window.confirm("Tens a certeza que queres cancelar esta compra?")) return;
    await cancelPurchase(id);
    alert("Compra cancelada.");
    navigate("/compras");
  }

  if (loading) return <LoadingState />;
  if (!purchase) return <div>Compra não encontrada</div>;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        Detalhe da Compra #{purchase.id}
      </h1>
      <p><strong>Fornecedor:</strong> {purchase.supplierName}</p>
      <p><strong>Estado:</strong> {purchase.status}</p>
      <p><strong>Data:</strong> {new Date(purchase.createdAt).toLocaleString()}</p>

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Itens</h3>
      <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ccc" }}>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Preço Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {purchase.items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td>{item.unitPrice} MT</td>
              <td>{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} MT</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "1rem", textAlign: "right" }}>Total: {purchase.total} MT</h2>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        {purchase.status === "DRAFT" && (
          <>
            <button onClick={handleConfirm} style={{ flex: 1, padding: "0.75rem", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Confirmar Compra
            </button>
            <button onClick={handleCancel} style={{ flex: 1, padding: "0.75rem", backgroundColor: "#b91c1c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Cancelar Compra
            </button>
          </>
        )}
      </div>
    </div>
  );
}
