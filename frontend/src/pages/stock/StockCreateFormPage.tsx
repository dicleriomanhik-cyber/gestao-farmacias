import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createLot } from "../../services/stockService";
import { getProducts } from "../../services/productService";
import type { Product } from "../../types/products";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import CustomSelect from "../../components/ui/CustomSelect";

export default function StockCreateFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProducts({ page: 1, limit: 100, status: "ACTIVE" })
      .then((res) => setProducts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return toast.error("Seleciona um produto.");
    if (!lotNumber.trim()) return toast.error("Número do lote é obrigatório.");
    if (!expiryDate) return toast.error("Data de validade é obrigatória.");
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return toast.error("Quantidade deve ser maior que zero.");
    const cost = parseFloat(unitCost);
    if (isNaN(cost) || cost < 0) return toast.error("Custo unitário inválido.");

    setSubmitting(true);
    try {
      await createLot({
        productId,
        lotNumber: lotNumber.trim(),
        expiryDate: new Date(expiryDate).toISOString(),
        quantity: qty,
        unitCost: cost,
      });
      toast.success("Lote criado com sucesso.");
      navigate("/stock/lotes");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao criar lote.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os produtos." onRetry={() => window.location.reload()} />;

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div>
      <PageHeader title="Adicionar Stock (Novo Lote)" />
      <form onSubmit={handleSubmit} className="card" style={{ padding: "1.5rem", maxWidth: "600px", margin: "0 auto" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Produto *</label>
        <div style={{ marginBottom: "1rem" }}>
          <CustomSelect
            options={productOptions}
            value={productId}
            onChange={setProductId}
            placeholder="Seleciona um produto"
          />
        </div>

        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Número do Lote *</label>
        <input type="text" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} required className="input" style={{ width: "100%", marginBottom: "1rem" }} placeholder="Ex: LOTE-2026-001" />

        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Validade *</label>
        <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required className="input" style={{ width: "100%", marginBottom: "1rem" }} />

        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Quantidade *</label>
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="input" style={{ width: "100%", marginBottom: "1rem" }} placeholder="Ex: 100" />

        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Custo Unitário (MT) *</label>
        <input type="number" step="0.01" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required className="input" style={{ width: "100%", marginBottom: "1.5rem" }} placeholder="Ex: 100.00" />

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A guardar…" : "Criar Lote"}
        </button>
      </form>
    </div>
  );
}
