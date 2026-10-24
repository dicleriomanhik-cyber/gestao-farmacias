import { useEffect, useState } from "react";
import { createSale, confirmSale } from "../../services/saleService";
import { getProducts } from "../../services/productService";
import { registerPayment, getActiveCashSession, openCash } from "../../services/cashService";
import type { Product } from "../../types/products";
import type { SaleLineRequest, PaymentMethod } from "../../types/sales";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import "../../styles/responsive.css";

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Dinheiro" },
  { value: "CARD", label: "Cartão" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "EMOLA", label: "e-Mola" },
];

export default function PosPage() {
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [completedSale, setCompletedSale] = useState<{ id: string; saleNumber: string; total: string } | null>(null);

  function load(query: string = "") {
    setLoading(true);
    setError(false);
    getProducts({ page: 1, limit: 100, search: query || undefined })
      .then((res) => setProducts(Array.isArray(res?.data) ? res.data : []))
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
      let session = await getActiveCashSession();
      if (!session) {
        try {
          session = await openCash({ openingBalance: 0 });
          toast.success("Caixa aberta automaticamente para esta venda.");
        } catch (openErr: any) {
          toast.error("É necessário abrir a caixa manualmente no menu 'Caixa' antes de vender.");
          setSubmitting(false);
          return;
        }
      }

      const draft = await createSale({ lines });
      const confirmed = await confirmSale(draft.id);
      await registerPayment({
        saleId: confirmed.id,
        amount: parseFloat(confirmed.total) || total,
        method: paymentMethod,
      });

      toast.success("Venda confirmada com sucesso!");
      setCompletedSale({ id: confirmed.id, saleNumber: confirmed.saleNumber, total: confirmed.total });
      setCart([]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao processar a venda.");
    } finally {
      setSubmitting(false);
    }
  }

  function startNewSale() {
    setCompletedSale(null);
    setSearch("");
    load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os produtos." onRetry={() => load(search)} />;

  if (completedSale) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ color: "#15803d", marginBottom: "1rem" }}>✅ Venda Concluída</h2>
        <p><strong>Nº:</strong> {completedSale.saleNumber}</p>
        <p><strong>Total:</strong> {parseFloat(completedSale.total).toFixed(2)} MT</p>
        <button onClick={startNewSale} className="btn btn-primary" style={{ marginTop: "1.5rem", width: "100%" }}>
          Nova Venda
        </button>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <div className="card pos-col-produtos">
        <h2 style={{ marginBottom: "1rem" }}>Produtos</h2>
        
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Pesquisar produto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(search); }}
            style={{ flex: "1 1 200px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "4px" }}
          />
          <button onClick={() => load(search)} className="btn btn-secondary" style={{ flex: "0 0 auto" }}>Pesquisar</button>
        </div>

        {products.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Nenhum produto encontrado.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid #eee", flexWrap: "wrap", gap: "0.5rem" }}>
              <span>{p.name} — {parseFloat(p.salePrice).toFixed(2)} MT</span>
              <button onClick={() => addItem(p)} className="btn btn-secondary">+ Adicionar</button>
            </div>
          ))
        )}
      </div>

      <div className="card pos-col-carrinho">
        <h2 style={{ marginBottom: "1rem" }}>Carrinho</h2>
        {cart.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Carrinho vazio.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cart.map((item) => (
              <li key={item.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid #eee", flexWrap: "wrap", gap: "0.5rem" }}>
                <span style={{ fontWeight: 500 }}>{item.productName}</span>
                <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                    style={{ width: "60px", padding: "0.25rem", textAlign: "center" }}
                  />
                  <span style={{ fontWeight: "bold" }}>{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} MT</span>
                  <button onClick={() => removeItem(item.productId)} style={{ color: "#b91c1c", border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem", padding: "0 0.5rem" }}>×</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <h2 style={{ marginTop: "1rem", textAlign: "right", fontSize: "1.5rem" }}>Total: {total.toFixed(2)} MT</h2>

        <div style={{ marginTop: "1rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Método de Pagamento:</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value)}
                className={`btn ${paymentMethod === m.value ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "100%" }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={submitting || cart.length === 0}
          className="btn btn-primary"
          style={{ marginTop: "1rem", width: "100%", padding: "1rem", fontSize: "1.1rem", fontWeight: "bold" }}
        >
          {submitting ? "A processar…" : "Finalizar Venda"}
        </button>
      </div>
    </div>
  );
}
