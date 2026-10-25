import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getSaleById, confirmSale, getSalePayments } from "../../services/saleService";
import { formatDateTime } from "../../utils/formatDate";
import { registerPayment } from "../../services/cashService";
import type { Sale, SaleStatus, PaymentMethod, Payment } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission } from "../../utils/permissions";

const PAID_KEY = "sm.paidSaleIds";

function getPaidSaleIds(): string[] {
  try {
    const raw = localStorage.getItem(PAID_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markAsPaid(saleId: string) {
  const ids = getPaidSaleIds();
  if (!ids.includes(saleId)) {
    ids.push(saleId);
    localStorage.setItem(PAID_KEY, JSON.stringify(ids));
  }
}

interface Props {
  isOperational?: boolean;
}

export default function SaleDetailPage({ isOperational = false }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [showPayment, setShowPayment] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(false);
    Promise.all([getSaleById(id), getSalePayments(id)])
      .then(([s, p]) => {
        setSale(s);
        setPayments(p);
        setIsPaid(getPaidSaleIds().includes(id) || p.length > 0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function statusBadge(status: SaleStatus) {
    const map = {
      DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
      CONFIRMED: { bg: "#dcfce7", color: "#166534", label: "Concluída" },
      CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelada" },
    };
    const cfg = map[status];
    return (
      <span style={{ padding: "0.25rem 0.75rem", borderRadius: "4px", backgroundColor: cfg.bg, color: cfg.color, fontWeight: 500 }}>
        {cfg.label}
      </span>
    );
  }

  async function handleConfirm() {
    if (!id) return;
    setActionLoading(true);
    try {
      await confirmSale(id);
      toast.success("Venda confirmada. Stock reduzido.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao confirmar venda.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePayment() {
    if (!sale) return;
    setActionLoading(true);
    try {
      const amount = parseFloat(sale.total);
      await registerPayment({ saleId: sale.id, amount, method: paymentMethod });
      toast.success("Pagamento registado.");
      markAsPaid(sale.id);
      setIsPaid(true);
      setShowPayment(false);
      load();
    } catch (err: any) {
      const rawMsg = err?.response?.data?.error?.message;
      let msg: string;
      if (Array.isArray(rawMsg)) {
        msg = rawMsg.join(" ");
      } else if (typeof rawMsg === "string") {
        msg = rawMsg;
      } else {
        msg = "Erro ao registar pagamento.";
      }
      
      if (msg.toLowerCase().includes("saldo pendente") || msg.toLowerCase().includes("saldo")) {
        markAsPaid(sale.id);
        setIsPaid(true);
        setShowPayment(false);
        toast.info("Venda já estava paga.");
      } else {
        toast.error(msg);
      }
    } finally {
      setActionLoading(false);
    }
  }

  const backLink = isOperational ? "/pos/historico" : "/vendas";
  const backLabel = isOperational ? "Voltar ao Histórico" : "← Voltar às Vendas";

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a venda." onRetry={load} />;
  if (!sale) return <ErrorState message="Venda não encontrada." onRetry={() => navigate(backLink)} />;

  const canConfirm = hasPermission(user?.permissions, "sales:create");
  const canPay = hasPermission(user?.permissions, "cash:open");

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link to={backLink} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
          {backLabel}
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Venda {sale.saleNumber}</h1>
        {statusBadge(sale.status)}
      </div>

      <p><strong>Data:</strong> {formatDateTime(sale.createdAt)}</p>
      <p><strong>Subtotal:</strong> {parseFloat(sale.subtotal).toFixed(2)} MT</p>
      <p><strong>Desconto:</strong> {parseFloat(sale.discount).toFixed(2)} MT</p>
      <p><strong>Total:</strong> {parseFloat(sale.total).toFixed(2)} MT</p>

      {payments.length > 0 && (
        <p><strong>Método de Pagamento:</strong> {payments.map((p) => ({ CASH: "Dinheiro", CARD: "Cartão", MPESA: "M-Pesa", EMOLA: "e-Mola" }[p.method] ?? p.method)).join(", ")}</p>
      )}

      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>Linhas</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Preço Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {(sale.lines ?? []).map((line) => (
            <tr key={line.id}>
              <td>{line.product?.name ?? line.productId.substring(0, 8) + "…"}</td>
              <td>{line.quantity}</td>
              <td>{parseFloat(line.unitPrice).toFixed(2)} MT</td>
              <td>{parseFloat(line.subtotal).toFixed(2)} MT</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!isOperational && sale.status === "DRAFT" && canConfirm && (
        <button
          onClick={handleConfirm}
          disabled={actionLoading}
          className="btn btn-success"
          style={{ width: "100%", padding: "0.75rem", marginTop: "1.5rem" }}
        >
          {actionLoading ? "A confirmar…" : "Confirmar Venda"}
        </button>
      )}

      {!isOperational && sale.status === "CONFIRMED" && isPaid && (
        <div style={{ marginTop: "1.5rem", padding: "0.75rem", backgroundColor: "#dcfce7", color: "#166534", borderRadius: "4px", textAlign: "center", fontWeight: 500 }}>
          ✅ Venda paga
        </div>
      )}

      {!isOperational && sale.status === "CONFIRMED" && !isPaid && canPay && (
        <div style={{ marginTop: "1.5rem" }}>
          {!showPayment ? (
            <button onClick={() => setShowPayment(true)} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
              Registar Pagamento
            </button>
          ) : (
            <div style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Método de Pagamento</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="input" style={{ marginBottom: "1rem" }}>
                <option value="CASH">Dinheiro</option>
                <option value="CARD">Cartão</option>
                <option value="MPESA">M-Pesa</option>
                <option value="EMOLA">e-Mola</option>
              </select>
              <p style={{ marginBottom: "1rem" }}><strong>Valor:</strong> {parseFloat(sale.total).toFixed(2)} MT</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handlePayment} disabled={actionLoading} className="btn btn-success" style={{ flex: 1, padding: "0.75rem" }}>
                  {actionLoading ? "A processar…" : "Confirmar Pagamento"}
                </button>
                <button onClick={() => setShowPayment(false)} disabled={actionLoading} className="btn btn-secondary" style={{ flex: 1, padding: "0.75rem" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
