import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPurchaseById, confirmPurchase, cancelPurchase } from "../../services/purchaseService";
import type { Purchase } from "../../types/purchases";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import { useToast } from "../../contexts/ToastContext";

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(false);
    getPurchaseById(id)
      .then((p) => { setPurchase(p); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function handleConfirm() { if (!id) return; await confirmPurchase(id); toast.success("Compra confirmada!"); navigate("/compras"); }
  async function handleCancel() { if (!id) return; if (!window.confirm("Cancelar esta compra?")) return; await cancelPurchase(id); toast.success("Compra cancelada."); navigate("/compras"); }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a compra." onRetry={load} />;
  if (!purchase) return <ErrorState message="Compra não encontrada." onRetry={() => navigate("/compras")} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Detalhe da Compra #{purchase.id}</h1>
      <p><strong>Fornecedor:</strong> {purchase.supplierName}</p>
      <p><strong>Estado:</strong> {purchase.status}</p>
      <p><strong>Data:</strong> {new Date(purchase.createdAt).toLocaleString()}</p>

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Itens</h3>
      <table className="table">
        <thead><tr><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead>
        <tbody>
          {purchase.items.map((item, idx) => (
            <tr key={idx}>
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
            <button onClick={handleConfirm} className="btn btn-success" style={{ flex: 1, padding: "0.75rem" }}>Confirmar Compra</button>
            <button onClick={handleCancel} className="btn btn-danger" style={{ flex: 1, padding: "0.75rem" }}>Cancelar Compra</button>
          </>
        )}
      </div>
    </div>
  );
}
