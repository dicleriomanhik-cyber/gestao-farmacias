import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPurchase } from "../../services/purchaseService";
import { getSuppliers } from "../../services/supplierService";
import { getProducts } from "../../services/productService";
import type { Supplier } from "../../types/suppliers";
import type { Product } from "../../types/products";
import type { PurchaseLineRequest } from "../../types/purchases";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export default function PurchaseFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      getSuppliers({ page: 1, limit: 100 }),
      getProducts({ page: 1, limit: 100 }),
    ])
      .then(([s, p]) => {
        setSuppliers(s.data);
        setProducts(p.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function addItem(product: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitCost: parseFloat(product.salePrice),
      }];
    });
  }

  function updateQuantity(productId: string, qty: number) {
    if (isNaN(qty) || qty < 1) return;
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  }

  function updateUnitCost(productId: string, cost: number) {
    if (isNaN(cost) || cost < 0) return;
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, unitCost: cost } : i));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  const total = items.reduce((acc, i) => acc + i.unitCost * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) return toast.error("Seleciona um fornecedor.");
    if (!documentNumber.trim()) return toast.error("Número de documento é obrigatório.");
    if (items.length === 0) return toast.error("Adiciona pelo menos um produto.");

    const lines: PurchaseLineRequest[] = items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitCost: i.unitCost,
    }));

    setSubmitting(true);
    try {
      await createPurchase({ supplierId, documentNumber: documentNumber.trim(), lines });
      toast.success("Compra criada como rascunho.");
      navigate("/compras");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Erro ao criar compra.";
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="A carregar dados…" />;
  if (error) return <ErrorState message="Não foi possível carregar fornecedores e produtos." onRetry={load} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Nova Compra</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Fornecedor *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className="input">
              <option value="">Seleciona um fornecedor</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Nº Documento *</label>
            <input type="text" className="input" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="COMPRA-2026-XXX" required />
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Produtos</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {products.map((p) => (
              <button key={p.id} type="button" onClick={() => addItem(p)} className="btn btn-secondary">
                + {p.name} ({parseFloat(p.salePrice).toFixed(2)} MT)
              </button>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Custo Unit.</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.productName}</td>
                    <td>
                      <input
                        type="number" min="1" value={item.quantity}
                        onChange={(e) => { const v = parseInt(e.target.value, 10); updateQuantity(item.productId, isNaN(v) ? 1 : v); }}
                        style={{ width: "70px", padding: "0.25rem" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="0" step="0.01" value={item.unitCost}
                        onChange={(e) => { const v = parseFloat(e.target.value); updateUnitCost(item.productId, isNaN(v) ? 0 : v); }}
                        style={{ width: "100px", padding: "0.25rem" }}
                      />
                    </td>
                    <td>{(item.unitCost * item.quantity).toFixed(2)} MT</td>
                    <td>
                      <button type="button" onClick={() => removeItem(item.productId)} style={{ color: "#b91c1c", border: "none", background: "none", cursor: "pointer" }}>Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={{ textAlign: "right", marginBottom: "1rem" }}>Total: {total.toFixed(2)} MT</h2>

        <button type="submit" disabled={submitting || items.length === 0} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A criar…" : "Criar Compra (Rascunho)"}
        </button>
      </form>
    </div>
  );
}
