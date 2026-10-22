import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPurchase } from "../../services/purchaseService";
import type { PurchaseItem } from "../../types/purchases";

export default function PurchaseFormPage() {
  const navigate = useNavigate();
  const [supplierId, setSupplierId] = useState("sup-1");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock de fornecedores e produtos
  const mockSuppliers = [
    { id: "sup-1", name: "Distribuidora Farmacêutica MZ" },
    { id: "sup-2", name: "Importadora de Medicamentos" },
  ];
  const mockProducts = [
    { id: "p1", name: "Paracetamol 500mg", price: "45.00" },
    { id: "p2", name: "Brufen 200mg", price: "250.00" },
    { id: "p3", name: "Vitamina C", price: "120.00" },
  ];

  function addItem(product: typeof mockProducts[0]) {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price }];
    });
  }

  function updateQuantity(productId: string, qty: number) {
    if (isNaN(qty) || qty < 1) return;
    setItems((prev) => prev.map((item) => item.productId === productId ? { ...item, quantity: qty } : item));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  const total = items.reduce((acc, item) => acc + parseFloat(item.unitPrice) * item.quantity, 0).toFixed(2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return alert("Adiciona pelo menos um produto.");
    setLoading(true);
    try {
      await createPurchase({ supplierId, items });
      alert("Compra criada como rascunho!");
      navigate("/compras");
    } catch {
      alert("Erro ao criar compra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Nova Compra</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Fornecedor</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
            {mockSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Produtos</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {mockProducts.map(p => (
              <button key={p.id} type="button" onClick={() => addItem(p)} style={{ padding: "0.5rem 1rem", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f9fafb", cursor: "pointer" }}>
                + {p.name} ({p.price} MT)
              </button>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <th style={{ padding: "0.5rem" }}>Produto</th>
                  <th style={{ padding: "0.5rem" }}>Qtd</th>
                  <th style={{ padding: "0.5rem" }}>Preço</th>
                  <th style={{ padding: "0.5rem" }}>Subtotal</th>
                  <th style={{ padding: "0.5rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "0.5rem" }}>{item.productName}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <input
                        type="number" min="1" value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateQuantity(item.productId, isNaN(val) ? 1 : val);
                        }}
                        style={{ width: "60px", padding: "0.25rem" }}
                      />
                    </td>
                    <td style={{ padding: "0.5rem" }}>{item.unitPrice} MT</td>
                    <td style={{ padding: "0.5rem" }}>{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} MT</td>
                    <td style={{ padding: "0.5rem" }}>
                      <button type="button" onClick={() => removeItem(item.productId)} style={{ color: "#b91c1c", border: "none", background: "none", cursor: "pointer" }}>Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={{ textAlign: "right", marginBottom: "1rem" }}>Total: {total} MT</h2>

        <button type="submit" disabled={loading || items.length === 0} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: loading || items.length === 0 ? 0.5 : 1 }}>
          {loading ? "A criar..." : "Criar Compra (Rascunho)"}
        </button>
      </form>
    </div>
  );
}
