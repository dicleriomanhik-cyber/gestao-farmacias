import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { receiveStock } from "../../services/stockService";
import { getProducts } from "../../services/productService";
import type { Product } from "../../types/products";
import { useToast } from "../../contexts/ToastContext";

export default function StockReceiveFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProducts({ limit: 100 }).then((res) => setProducts(res.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return toast.error("Seleciona um produto.");
    if (!batchNumber.trim()) return toast.error("Número de lote é obrigatório.");
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) return toast.error("Quantidade deve ser maior que zero.");
    if (!expiryDate) return toast.error("Data de validade é obrigatória.");
    if (new Date(expiryDate) <= new Date()) return toast.error("Data de validade deve ser no futuro.");

    setLoading(true);
    try {
      await receiveStock({ productId, batchNumber, quantity: qtyNum, expiryDate: new Date(expiryDate).toISOString() });
      toast.success("Stock recebido com sucesso.");
      navigate("/stock/lotes");
    } catch {
      toast.error("Erro ao receber stock.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Receber Stock</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Produto *</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }}>
            <option value="">Seleciona</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Número de Lote *</label>
          <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Quantidade *</label>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Data de Validade *</label>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px" }}>
          {loading ? "A processar..." : "Confirmar Receção"}
        </button>
      </form>
    </div>
  );
}
