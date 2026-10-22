import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSale, confirmSale } from "../../services/saleService";
import type { SaleItem, PaymentMethod } from "../../types/sales";

export default function PosPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [loading, setLoading] = useState(false);

  // Mock de produtos para pesquisa
  const mockProducts = [
    { id: "p1", name: "Paracetamol 500mg", price: "500.00" },
    { id: "p2", name: "Brufen 200mg", price: "500.00" },
    { id: "p3", name: "Vitamina C", price: "250.00" },
  ];

  function addToCart(product: typeof mockProducts[0]) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price }];
    });
  }

  const total = cart.reduce((acc, item) => acc + parseFloat(item.unitPrice) * item.quantity, 0).toFixed(2);

  async function handleCheckout() {
    if (cart.length === 0) return alert("Carrinho vazio.");
    setLoading(true);
    try {
      const sale = await createSale({ items: cart, paymentMethod });
      await confirmSale(sale.id);
      alert("Venda concluída com sucesso!");
      navigate("/vendas");
    } catch {
      alert("Erro ao processar venda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      {/* Pesquisa e Produtos */}
      <div style={{ flex: "1 1 300px" }} className="card">
        <h2 style={{ marginBottom: "1rem" }}>Produtos</h2>
        {mockProducts.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
            <span>{p.name} - {p.price} MT</span>
            <button onClick={() => addToCart(p)} style={{ cursor: "pointer" }}>+ Adicionar</button>
          </div>
        ))}
      </div>

      {/* Carrinho */}
      <div style={{ flex: "1 1 300px" }} className="card">
        <h2 style={{ marginBottom: "1rem" }}>Carrinho</h2>
        {cart.length === 0 ? <p>Carrinho vazio.</p> : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cart.map((item, idx) => (
              <li key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
                <span>{item.productName} (x{item.quantity})</span>
                <span>{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)} MT</span>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Método de Pagamento:</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} style={{ width: "100%", padding: "0.5rem" }}>
            <option value="CASH">Dinheiro</option>
            <option value="CARD">Cartão</option>
            <option value="MPESA">M-Pesa</option>
            <option value="EMOLA">e-Mola</option>
          </select>
        </div>

        <h2 style={{ marginTop: "1rem", textAlign: "right" }}>Total: {total} MT</h2>

        <button
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
          style={{ marginTop: "1rem", width: "100%", padding: "0.75rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: loading || cart.length === 0 ? 0.5 : 1 }}
        >
          {loading ? "A processar..." : "Confirmar Venda"}
        </button>
      </div>
    </div>
  );
}
