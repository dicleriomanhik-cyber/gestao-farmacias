import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPurchaseById, confirmPurchase, cancelPurchase } from "../../services/purchaseService";
import type { Purchase, PurchaseStatus } from "../../types/purchases";
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
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(false);
    getPurchaseById(id)
      .then(setPurchase)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    if (!id) return;
    setActionLoading(true);
    try {
      await confirmPurchase(id);
      toast.success("Compra confirmada.");
      load();
    } catch {
      toast.error("Erro ao confirmar compra.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    if (!window.confirm("Tens a certeza que queres cancelar esta compra?")) return;
    setActionLoading(true);
    try {
      await cancelPurchase(id);
      toast.success("Compra cancelada.");
      load();
    } catch {
      toast.error("Erro ao cancelar compra.");
    } finally {
      setActionLoading(false);
    }
  }

  function statusBadge(status: PurchaseStatus) {
    const map = {
      DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
      CONFIRMED: { bg: "#dcfce7", color: "#166534", label: "Confirmada" },
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
  if (error) return <ErrorState message="Não foi possível carregar a compra." onRetry={load} />;
  if (!purchase) return <ErrorState message="Compra não encontrada." onRetry={() => navigate("/compras")} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Compra {purchase.documentNumber}</h1>
        {statusBadge(purchase.status)}
      </div>

      <p><strong>Fornecedor:</strong> {purchase.supplier?.name ?? "—"}</p>
      <p><strong>Data:</strong> {new Date(purchase.purchaseDate).toLocaleString()}</p>
      <p><strong>Total:</strong> {parseFloat(purchase.totalAmount).toFixed(2)} MT</p>

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Linhas</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Custo Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {(purchase.lines ?? []).map((line) => (
            <tr key={line.id}>
              <td>{line.product?.name ?? "—"}</td>
              <td>{line.quantity}</td>
              <td>{parseFloat(line.unitCost).toFixed(2)} MT</td>
              <td>{parseFloat(line.subtotal).toFixed(2)} MT</td>
            </tr>
          ))}
        </tbody>
      </table>

      {purchase.status === "DRAFT" && (
        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
          <button onClick={handleConfirm} disabled={actionLoading} className="btn btn-success" style={{ flex: 1, padding: "0.75rem" }}>
            {actionLoading ? "A processar…" : "Confirmar Compra"}
          </button>
          <button onClick={handleCancel} disabled={actionLoading} className="btn btn-danger" style={{ flex: 1, padding: "0.75rem" }}>
            {actionLoading ? "A processar…" : "Cancelar Compra"}
          </button>
        </div>
      )}

      {purchase.status === "CONFIRMED" && (
        <div style={{ marginTop: "1.5rem" }}>
          <button onClick={handleCancel} disabled={actionLoading} className="btn btn-danger" style={{ width: "100%", padding: "0.75rem" }}>
            {actionLoading ? "A processar…" : "Cancelar Compra"}
          </button>
        </div>
      )}
    </div>
  );
}
