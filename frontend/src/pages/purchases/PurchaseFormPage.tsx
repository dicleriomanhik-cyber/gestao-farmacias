import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPurchase } from "../../services/purchaseService";
import type { PurchaseItem } from "../../types/purchases";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import PageHeader from "../../components/ui/PageHeader";

export default function PurchaseFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [supplierId, setSupplierId] = useState("sup-1");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const mockSuppliers = [
    { id: "sup-1", name: "Distribuidora Farmacêutica MZ" },
    { id: "sup-2", name: "Importadora de Medicamentos" },
  ];
  const mockProducts = [
    { id: "p1", name: "Paracetamol 500mg", price: "45.00" },
    { id: "p2", name: "Brufen 200mg", price: "250.00" },
    { id: "p3", name: "Vitamina C", price: "120.00" },
  ];

  useEffect(() => { const t = setTimeout(() => setLoading(false), 100); return () => clearTimeout(t); }, []);

  function addItem(p: typeof mockProducts[0]) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.price }];
    });
  }
  function updateQuantity(pid: string, q: number) { if (isNaN(q) || q < 1) return; setItems((prev) => prev.map((i) => i.productId === pid ? { ...i, quantity: q } : i)); }
  function removeItem(pid: string) { setItems((prev) => prev.filter((i) => i.productId !== pid)); }

  const total = items.reduce((a, i) => a + parseFloat(i.unitPrice) * i.quantity, 0).toFixed(2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) return toast.error("Seleciona um fornecedor.");
    if (items.length === 0) return toast.error("Adiciona pelo menos um produto.");
    if (items.some((i) => i.quantity <= 0)) return toast.error("Quantidade de todos os itens deve ser maior que zero.");
    setSubmitting(true);
    try { await createPurchase({ supplierId, items }); toast.success("Compra criada como rascunho."); navigate("/compras"); }
    catch { toast.error("Erro ao criar compra."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <LoadingState message="A carregar dados…" />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <PageHeader title="Nova Compra" actions={<span style={{ backgroundColor: "#fef08a", color: "#854d0e", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem" }}>[MOCK]</span>} />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Fornecedor *</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className="input">
            <option value="">Seleciona um fornecedor</option>
            {mockSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Produtos</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {mockProducts.map((p) => (
              <button key={p.id} type="button" onClick={() => addItem(p)} className="btn btn-secondary">
                + {p.name} ({p.price} MT)
              </button>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <table className="table">
              <thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.productName}</td>
                    <td><input type="number" min="1" value={item.quantity} onChange={(e) => { const v = parseInt(e.target.value, 10); updateQuantity(item.productId, isNaN(v) ? 1 : v); }} style={{ width: "60px", padding: "0.25rem" }} /></td>
                    <td>{item.unitPrice} MT</td>
                    <td>{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} MT</td>
                    <td><button type="button" onClick={() => removeItem(item.productId)} style={{ color: "#b91c1c", border: "none", background: "none", cursor: "pointer" }}>Remover</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={{ textAlign: "right", marginBottom: "1rem" }}>Total: {total} MT</h2>

        <button type="submit" disabled={submitting || items.length === 0} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A criar..." : "Criar Compra (Rascunho)"}
        </button>
      </form>
    </div>
  );
}
