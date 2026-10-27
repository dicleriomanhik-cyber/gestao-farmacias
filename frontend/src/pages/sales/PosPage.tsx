import { useEffect, useState } from "react";
import { createSale, confirmSale, createSaleOffline } from '../../services/saleService';
import { getProducts } from "../../services/productService";
import { registerPayment, getActiveCashSession, openCash } from "../../services/cashService";
import type { Product } from "../../types/products";
import type { SaleLineRequest, PaymentMethod } from "../../types/sales";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

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
  const [completedSale, setCompletedSale] = useState<{ id: string; saleNumber: string; total: string; change: number | null } | null>(null);

  // Campo para o troco
  const [amountPaid, setAmountPaid] = useState("");

  function load(query: string = "") {
    setLoading(true);
    setError(false);
    getProducts({ page: 1, limit: 100, search: query || undefined, status: "ACTIVE" })
      .then((res) => setProducts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Enter global para finalizar venda (quando não está em input de pesquisa)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      document.dispatchEvent(new CustomEvent("__pos_enter"));
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
  const paid = parseFloat(amountPaid) || 0;
  const change = paid > 0 ? paid - total : 0;

  // Listener do evento customizado para Enter
  useEffect(() => {
    function onEnter() {
      if (completedSale) return;
      if (cart.length === 0 || submitting) return;
      if (paymentMethod === "CASH" && paid < total) return;
      handleCheckout();
    }
    document.addEventListener("__pos_enter", onEnter as EventListener);
    return () => document.removeEventListener("__pos_enter", onEnter as EventListener);
  }, [cart, submitting, paymentMethod, paid, total, completedSale]);

  async function handleCheckout() {
    if (cart.length === 0) return toast.error("Carrinho vazio.");
    if (paymentMethod === "CASH" && paid < total) {
      return toast.error("O valor entregue é inferior ao total.");
    }

    const lines: SaleLineRequest[] = cart.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    
    setSubmitting(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await createSaleOffline({ lines }, { amount: total, method: paymentMethod });
        toast.success("Venda guardada offline. Será sincronizada quando houver ligação.");
        setCompletedSale({ id: `offline-${Date.now()}`, saleNumber: "OFFLINE", total: total.toFixed(2), change: paymentMethod === "CASH" ? change : null });
        setCart([]);
        setAmountPaid("");
        return;
      }

      let session = await getActiveCashSession();
      if (!session) {
        try {
          session = await openCash({ openingBalance: 0 });
          toast.success("Caixa aberta automaticamente.");
        } catch (openErr: any) {
          toast.error("Abra a caixa manualmente antes de vender.");
          return;
        }
      }

      const draft = await createSale({ lines });
      const confirmed = await confirmSale(draft.id);
      await registerPayment({ saleId: confirmed.id, amount: parseFloat(confirmed.total) || total, method: paymentMethod });

      toast.success("Venda confirmada!");
      setCompletedSale({ id: confirmed.id, saleNumber: confirmed.saleNumber, total: confirmed.total, change: paymentMethod === "CASH" ? change : null });
      setCart([]);
      setAmountPaid("");
    } catch (err: any) {
      const isNetworkError =
        err?.message === "Network Error" ||
        err?.code === "ERR_NETWORK" ||
        err?.code === "ERR_INTERNET_DISCONNECTED" ||
        err?.code === "ERR_FAILED" ||
        (!err?.response && err?.request) ||
        (typeof navigator !== "undefined" && !navigator.onLine);
      if (isNetworkError) {
        try {
          await createSaleOffline({ lines }, { amount: total, method: paymentMethod });
          toast.success("Sem ligação. Venda guardada offline para sincronização posterior.");
          setCompletedSale({ id: `offline-${Date.now()}`, saleNumber: "OFFLINE", total: total.toFixed(2), change: paymentMethod === "CASH" ? change : null });
          setCart([]);
          setAmountPaid("");
          return;
        } catch {
          toast.error("Falha ao guardar offline.");
          return;
        }
      }
      toast.error(err?.response?.data?.error?.message ?? "Erro ao processar a venda.");
    } finally {
      setSubmitting(false);
    }
  }
  useEffect(() => {
    if (!completedSale) return;
    const timer = setTimeout(() => {
      startNewSale();
    }, 10000);
    return () => clearTimeout(timer);
  }, [completedSale]);

  function startNewSale() {
    setCompletedSale(null);
    setSearch("");
    setAmountPaid("");
    load();
  }

  if (loading && products.length === 0) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os produtos." onRetry={() => load(search)} />;

  if (completedSale) {
    return (
      <div
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            startNewSale();
          }
        }}
        tabIndex={0}
        autoFocus
        style={{ backgroundColor: "white", padding: "3rem", textAlign: "center", maxWidth: "600px", margin: "0 auto", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", outline: "none" }}
      >
        <h2 style={{ color: "#15803d", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Venda Concluída
        </h2>
        <p style={{ fontSize: "1.1rem" }}><strong>Nº:</strong> {completedSale.saleNumber}</p>
        <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2563eb" }}><strong>Total:</strong> {parseFloat(completedSale.total).toFixed(2)} MT</p>
        
        {completedSale.change !== null && completedSale.change >= 0 && (
          <div style={{ backgroundColor: "#fef3c7", padding: "1rem", borderRadius: "8px", marginTop: "1rem", border: "1px solid #fde68a" }}>
            <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#92400e", margin: 0 }}>
              Troco a devolver: {completedSale.change.toFixed(2)} MT
            </p>
          </div>
        )}

        <button onClick={startNewSale} style={{ marginTop: "2rem", width: "100%", padding: "1rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer" }}>
          Nova Venda
        </button>
        <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#94a3b8" }}>
          A voltar automaticamente em 10 segundos…
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "stretch", height: "100%", minHeight: 0 }}>
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div style={{ marginBottom: "1rem", flexShrink: 0 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0 0 0.25rem" }}>Produtos</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>Pesquise e adicione produtos à venda</p>
        </div>

        <div style={{ marginBottom: "1rem", flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Pesquisar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "0.75rem 1rem", border: "2px solid #93c5fd", borderRadius: "8px", fontSize: "0.95rem", outline: "none", backgroundColor: "#fff", boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.5rem" }}>
          {loading ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>A pesquisar…</p>
          ) : products.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>Nenhum produto encontrado.</p>
          ) : (
            products.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc", flexShrink: 0 }}>
                <div style={{ fontWeight: "normal", flex: 1 }}>
                  {p.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontWeight: "bold", color: "#1e293b" }}>{parseFloat(p.salePrice).toFixed(2)} MT</span>
                  <button onClick={() => addItem(p)} style={{ padding: "0.4rem 0.8rem", backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Adicionar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ backgroundColor: "#dbeafe", padding: "1rem 1.5rem", borderBottom: "1px solid #bfdbfe", flexShrink: 0 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0 }}>Itens selecionados</h2>
        </div>

        <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem" }}>
            {cart.length === 0 ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "2rem 0" }}>Carrinho vazio.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {cart.map((item) => (
                  <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{item.productName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.quantity} x {parseFloat(item.unitPrice).toFixed(2)} MT</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                        style={{ width: "50px", padding: "0.25rem", textAlign: "center", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                      />
                      <span style={{ fontWeight: "bold", fontSize: "0.9rem", minWidth: "70px", textAlign: "right" }}>{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} MT</span>
                      <button onClick={() => removeItem(item.productId)} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flexShrink: 0 }}>
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Total</h3>
              <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#2563eb" }}>{total.toFixed(2)} MT</span>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: "bold", fontSize: "0.9rem" }}>Método de Pagamento</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: paymentMethod === m.value ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      backgroundColor: paymentMethod === m.value ? "#eff6ff" : "white",
                      color: paymentMethod === m.value ? "#2563eb" : "#64748b",
                      fontWeight: paymentMethod === m.value ? "bold" : "normal",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de Troco apenas para Dinheiro */}
            {paymentMethod === "CASH" && (
              <div style={{ marginTop: "1rem", backgroundColor: "#fefce8", padding: "1rem", borderRadius: "8px", border: "1px solid #fde047" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold", fontSize: "0.9rem", color: "#854d0e" }}>Valor Entregue (MT)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!submitting && cart.length > 0 && paid >= total) handleCheckout();
                    }
                  }}
                  placeholder="0.00"
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "1rem", boxSizing: "border-box" }}
                />
                {paid > 0 && (
                  <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "bold", fontSize: "0.95rem", color: "#854d0e" }}>Troco a devolver:</span>
                    <span style={{ fontWeight: "bold", fontSize: "1.2rem", color: paid < total ? "#b91c1c" : "#166534" }}>
                      {paid < total ? "Valor insuficiente" : `${change.toFixed(2)} MT`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0 || (paymentMethod === "CASH" && paid < total)}
              style={{
                marginTop: "1.5rem", width: "100%", padding: "1rem",
                backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px",
                fontSize: "1rem", fontWeight: "bold",
                cursor: submitting || cart.length === 0 || (paymentMethod === "CASH" && paid < total) ? "not-allowed" : "pointer",
                opacity: submitting || cart.length === 0 || (paymentMethod === "CASH" && paid < total) ? 0.7 : 1,
              }}
            >
              {submitting ? "A processar…" : "Finalizar Venda"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}












