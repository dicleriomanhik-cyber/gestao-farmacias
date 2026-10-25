import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adjustStock, getStockLots } from "../../services/stockService";
import type { StockLot } from "../../types/stock";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

export default function StockAdjustFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [lots, setLots] = useState<StockLot[]>([]);
  const [lotId, setLotId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const selectedLot = lots.find((l) => l.id === lotId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lotId) return toast.error("Seleciona um lote.");
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum === 0) return toast.error("Quantidade deve ser diferente de zero.");
    if (!reason.trim()) return toast.error("Motivo é obrigatório.");

    // Validação local: o ajuste não pode deixar o stock negativo
    if (selectedLot && selectedLot.quantityAvailable + qtyNum < 0) {
      return toast.error(`Ajuste resultaria em stock negativo (disponível: ${selectedLot.quantityAvailable}).`);
    }

    setSubmitting(true);
    try {
      await adjustStock({ lotId, quantity: qtyNum, reason: reason.trim() });
      toast.success("Stock ajustado com sucesso.");
      navigate("/stock/lotes");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Erro ao ajustar stock.";
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os lotes." onRetry={load} />;

  if (lots.length === 0) {
    return (
      <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "#6b7280", marginBottom: "1rem" }}>Não há lotes em stock para ajustar.</p>
        <button onClick={() => navigate("/stock/lotes")} className="btn btn-primary">Voltar aos Lotes</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Ajustar Stock</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Lote *</label>
          <select
            value={lotId}
            onChange={(e) => setLotId(e.target.value)}
            required
            className="input"
          >
            <option value="">Seleciona um lote</option>
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.product?.name ?? "?"} — {lot.lotNumber} (Disponível: {lot.quantityAvailable})
              </option>
            ))}
          </select>
        </div>

        {selectedLot && (
          <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f3f4f6", borderRadius: "4px", fontSize: "0.875rem" }}>
            <strong>Disponível:</strong> {selectedLot.quantityAvailable} unidades
            <br />
            <strong>Validade:</strong> {new Date(selectedLot.expiryDate).toLocaleDateString("pt-PT")}
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Quantidade *</label>
          <input
            type="number"
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Ex: -10 (saída) ou 5 (entrada)"
            required
          />
          <small style={{ color: "#6b7280", fontSize: "0.75rem" }}>Negativo para saída, positivo para entrada.</small>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Motivo *</label>
          <input
            type="text"
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Quebra, perda, erro de contagem"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-warning"
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {submitting ? "A processar…" : "Confirmar Ajuste"}
        </button>
      </form>
    </div>
  );
}
