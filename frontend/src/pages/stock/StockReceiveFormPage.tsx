import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { receiveStock } from "../../services/stockService";
import { getPurchases, getPurchaseById } from "../../services/purchaseService";
import type { Purchase, PurchaseLine } from "../../types/purchases";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

export default function StockReceiveFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [purchaseId, setPurchaseId] = useState("");
  const [purchaseLineId, setPurchaseLineId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  // Carregar compras CONFIRMED
  function load() {
    setLoading(true);
    setError(false);
    getPurchases({ status: "CONFIRMED", limit: 100 })
      .then((res) => setPurchases(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  // Ao escolher compra, carregar linhas
  useEffect(() => {
    if (!purchaseId) {
      setSelectedPurchase(null);
      setLines([]);
      setPurchaseLineId("");
      return;
    }
    setLoadingLines(true);
    getPurchaseById(purchaseId)
      .then((p) => {
        setSelectedPurchase(p);
        setLines(p.lines ?? []);
      })
      .catch(() => toast.error("Erro ao carregar linhas da compra."))
      .finally(() => setLoadingLines(false));
  }, [purchaseId, toast]);

  // Ao escolher linha, pré-preencher
  const selectedLine = lines.find((l) => l.id === purchaseLineId);
  useEffect(() => {
    if (selectedLine) {
      setQuantity(String(selectedLine.quantity));
      setUnitCost(selectedLine.unitCost);
    }
  }, [selectedLine]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!purchaseLineId) return toast.error("Seleciona uma linha de compra.");
    if (!lotNumber.trim()) return toast.error("Número de lote é obrigatório.");
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) return toast.error("Quantidade deve ser maior que zero.");
    if (!expiryDate) return toast.error("Data de validade é obrigatória.");
    if (new Date(expiryDate) <= new Date()) return toast.error("Data de validade deve ser no futuro.");
    const costNum = parseFloat(unitCost);
    if (isNaN(costNum) || costNum < 0) return toast.error("Custo unitário deve ser maior ou igual a zero.");

    setSubmitting(true);
    try {
      await receiveStock({
        purchaseLineId,
        lotNumber: lotNumber.trim(),
        quantity: qtyNum,
        expiryDate: new Date(expiryDate).toISOString(),
        unitCost: costNum,
      });
      toast.success("Stock recebido com sucesso.");
      navigate("/stock/lotes");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Erro ao receber stock.";
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar as compras." onRetry={load} />;

  if (purchases.length === 0) {
    return (
      <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
          Não há compras confirmadas para receber. Cria uma compra e confirma-a primeiro.
        </p>
        <button onClick={() => navigate("/compras")} className="btn btn-primary">Ir para Compras</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Receber Stock</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Compra *</label>
          <select value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)} required className="input">
            <option value="">Seleciona uma compra</option>
            {purchases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.documentNumber} — {p.supplier?.name ?? "?"} ({parseFloat(p.totalAmount).toFixed(2)} MT)
              </option>
            ))}
          </select>
        </div>

        {loadingLines && <p style={{ color: "#6b7280" }}>A carregar linhas…</p>}

        {selectedPurchase && lines.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Linha *</label>
            <select value={purchaseLineId} onChange={(e) => setPurchaseLineId(e.target.value)} required className="input">
              <option value="">Seleciona uma linha</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.product?.name ?? "?"} — Qtd: {line.quantity}, Custo: {line.unitCost} MT
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Número de Lote *</label>
            <input type="text" className="input" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Ex: LOT-2026-X" required />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Quantidade *</label>
            <input type="number" min="1" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Data de Validade *</label>
            <input type="date" className="input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Custo Unitário (MT) *</label>
            <input type="number" step="0.01" min="0" className="input" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required />
          </div>
        </div>

        <button type="submit" disabled={submitting || !purchaseLineId} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A processar…" : "Confirmar Receção"}
        </button>
      </form>
    </div>
  );
}
