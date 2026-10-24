import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSale } from "../../services/saleService";
import { getProducts } from "../../services/productService";
import type { Product } from "../../types/products";
import type { SaleLineRequest } from "../../types/sales";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
}

export default function PosPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getProducts({ page: 1, limit: 100 })
      .then((res) => setProducts(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function addItem(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.salePrice,
      }];
    });
  }

  function updateQuantity(productId: string, qty: number) {
    if (isNaN(qty) || qty < 1) return;
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const total = cart.reduce((acc, i) => acc + parseFloat(i.unitPrice) * i.quantity, 0);

  async function handleCheckout() {
    if (cart.length === 0) return toast.error("Carrinho vazio.");
    const lines: SaleLineRequest[] = cart.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    setSubmitting(true);
    try {
      await createSale({ lines });
      toast.success("Venda criada como rascunho.");
      navigate("/vendas");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao criar venda.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os produtos." onRetry={load} />;

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 300px" }} className="card">
        <h2 style={{ marginBottom: "1rem" }}>Produtos</h2>
        {products.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Nenhum produto disponível. Cria um produto primeiro.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
              <span>{p.name} — {parseFloat(p.salePrice).toFixed(2)} MT</span>
              <button onClick={() => addItem(p)} className="btn btn-secondary">+ Adicionar</button>
            </div>
          ))
        )}
      </div>

      <div style={{ flex: "1 1 300px" }} className="card">
        <h2 style={{ marginBottom: "1rem" }}>Carrinho</h2>
        {cart.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Carrinho vazio.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cart.map((item) => (
              <li key={item.productId} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
                <span>{item.productName}</span>
                <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)} style={{ width: "60px", padding: "0.25rem" }} />
                  <span>{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} MT</span>
                  <button onClick={() => removeItem(item.productId)} style={{ color: "#b91c1c", border: "none", background: "none", cursor: "pointer" }}>×</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <h2 style={{ marginTop: "1rem", textAlign: "right" }}>Total: {total.toFixed(2)} MT</h2>

        <button onClick={handleCheckout} disabled={submitting || cart.length === 0} className="btn btn-primary" style={{ marginTop: "1rem", width: "100%", padding: "0.75rem" }}>
          {submitting ? "A processar…" : "Confirmar Venda (Rascunho)"}
        </button>
      </div>
    </div>
  );
}
