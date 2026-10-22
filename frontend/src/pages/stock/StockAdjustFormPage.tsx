import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adjustStock } from "../../services/stockService";
import { getProducts } from "../../services/productService";
import type { Product } from "../../types/products";
import { useToast } from "../../contexts/ToastContext";

export default function StockAdjustFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProducts({ limit: 100 }).then((res) => setProducts(res.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return toast.error("Seleciona um produto.");
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum === 0) return toast.error("Quantidade deve ser diferente de zero.");
    if (!reason.trim()) return toast.error("Motivo é obrigatório.");

    setLoading(true);
    try {
      await adjustStock({ productId, quantity: qtyNum, reason });
      toast.success("Stock ajustado com sucesso.");
      navigate("/stock/movimentos");
    } catch {
      toast.error("Erro ao ajustar stock.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Ajustar Stock</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Produto *</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }}>
            <option value="">Seleciona</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Quantidade a Ajustar (+ ou -) *</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Motivo *</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Quebra, perda, erro de contagem" required style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#ca8a04", color: "white", border: "none", borderRadius: "4px" }}>
          {loading ? "A processar..." : "Confirmar Ajuste"}
        </button>
      </form>
    </div>
  );
}
