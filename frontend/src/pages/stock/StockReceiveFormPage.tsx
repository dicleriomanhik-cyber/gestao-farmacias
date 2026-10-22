import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { receiveStock } from "../../services/stockService";
import { getProducts } from "../../services/productService";
import type { Product } from "../../types/products";

export default function StockReceiveFormPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !batchNumber || !quantity || !expiryDate) return alert("Preenche todos os campos.");
    setLoading(true);
    try {
      await receiveStock({ productId, batchNumber, quantity: parseInt(quantity), expiryDate: new Date(expiryDate).toISOString() });
      navigate("/stock/lotes");
    } catch {
      alert("Erro ao receber stock.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Receber Stock</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Produto</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }}>
            <option value="">Seleciona</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Número de Lote</label>
          <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Quantidade</label>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Data de Validade</label>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px" }}>
          {loading ? "A processar..." : "Confirmar Receção"}
        </button>
      </form>
    </div>
  );
}
