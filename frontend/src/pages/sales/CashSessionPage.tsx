import { useEffect, useState } from "react";
import { getActiveCashSession, openCash, closeCash, getPayments } from "../../services/cashService";
import { getExpenses } from "../../services/expenseService";
import { apiClient } from "../../services/api";
import type { CashSession, PaymentMethod } from "../../types/sales";
import type { Expense } from "../../types/expenses";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { canAccessCash } from "../../utils/permissions";
import { useToast } from "../../contexts/ToastContext";
import { formatDateTime } from "../../utils/formatDate";

function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "0.00";
  return parseFloat(String(v)).toFixed(2);
}

interface CashMovement {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  reason: string;
  createdAt: string;
}

export default function CashSessionPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [session, setSession] = useState<CashSession | null>(null);
  const [totals, setTotals] = useState<Record<PaymentMethod, number>>({ CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 });
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const allowed = canAccessCash(user?.permissions);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const active = await getActiveCashSession();
      setSession(active);
      if (active) {
        const data = await getPayments();
        setTotals(data.totalsByMethod);

        // Movimentos
        let movementsData: CashMovement[] = [];
        try {
          const resp = await apiClient.get<{ success: boolean; data: CashMovement[] }>("/cash/movements");
          movementsData = resp.data.data ?? [];
          setMovements(movementsData);
        } catch {
          setMovements([]);
        }

        // Despesas da sessão atual (pagas em dinheiro)
        let sessionExpenses: Expense[] = [];
        try {
          const expRes = await getExpenses({ page: 1, limit: 1000 });
          sessionExpenses = expRes.data.filter(e => 
            e.cashSessionId === active.id && 
            e.method === "CASH" && 
            (e.status === "CONFIRMED" || e.status === "DRAFT")
          );
          setExpenses(sessionExpenses);
        } catch {
          setExpenses([]);
        }

        // Cálculo do valor contado (saldo em gaveta)
        const totalOut = movementsData.filter((m) => m.type === "OUT").reduce((acc, m) => acc + parseFloat(m.amount), 0);
        const totalIn = movementsData.filter((m) => m.type === "IN").reduce((acc, m) => acc + parseFloat(m.amount), 0);
        const totalExpensesCash = sessionExpenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);
        
        const expected = parseFloat(active.openingBalance.toString()) + (data.totalsByMethod.CASH || 0) + totalIn - totalOut - totalExpensesCash;
        setAmount(expected.toFixed(2));
      } else {
        setTotals({ CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 });
        setMovements([]);
        setExpenses([]);
        setAmount("");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return toast.error("Valor inicial inválido.");
    setSubmitting(true);
    try {
      await openCash({ openingBalance: num });
      toast.success("Caixa aberto.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao abrir caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return toast.error("Valor contado inválido.");
    setSubmitting(true);
    try {
      await closeCash(session.id, { countedBalance: num });
      toast.success("Caixa fechado.");
      setSession(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao fechar caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a caixa." onRetry={load} />;

  const totalOut = movements.filter((m) => m.type === "OUT").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalIn = movements.filter((m) => m.type === "IN").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalExpensesCash = expenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  
  // Saldo em Gaveta (Dinheiro físico)
  const cashInDrawer = session 
    ? parseFloat(session.openingBalance.toString()) + (totals.CASH || 0) + totalIn - totalOut - totalExpensesCash 
    : 0;
  
  // Saldo Total (Geral) = Dinheiro em Gaveta + Cartão + M-Pesa + e-Mola
  const totalAllMethods = cashInDrawer + (totals.CARD || 0) + (totals.MPESA || 0) + (totals.EMOLA || 0);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <PageHeader title="Gestão de Caixa" />

      {!session && (
        <div className="card" style={{ padding: "1rem" }}>
          <p style={{ color: "#b91c1c", marginBottom: "0.75rem", fontWeight: 500 }}>A caixa está fechada.</p>
          {allowed ? (
            <form onSubmit={handleOpen} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.85rem" }}>Valor Inicial (MT)</label>
                <input type="number" step="0.01" min="0" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 1000.00" required style={{ width: "100%" }} />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-success" style={{ padding: "0.5rem 1.5rem" }}>
                {submitting ? "A abrir…" : "Abrir Caixa"}
              </button>
            </form>
          ) : (
            <p style={{ color: "#6b7280" }}>Não tens permissão para abrir a caixa.</p>
          )}
        </div>
      )}

      {session && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="card" style={{ padding: "0.75rem" }}>
              <h3 style={{ color: "#6b7280", fontSize: "0.75rem", margin: "0 0 0.25rem" }}>Valor Inicial</h3>
              <p style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0 }}>{money(session.openingBalance)} MT</p>
            </div>
            <div className="card" style={{ padding: "0.75rem", backgroundColor: cashInDrawer < 0 ? "#fef2f2" : "#eff6ff", border: cashInDrawer < 0 ? "1px solid #fecaca" : "1px solid #bfdbfe" }}>
              <h3 style={{ color: cashInDrawer < 0 ? "#b91c1c" : "#1e40af", fontSize: "0.75rem", fontWeight: "bold", margin: "0 0 0.25rem" }}>Saldo em Gaveta</h3>
              <p style={{ fontSize: "1.3rem", fontWeight: "bold", color: cashInDrawer < 0 ? "#b91c1c" : "#2563eb", margin: 0 }}>{money(cashInDrawer)} MT</p>
            </div>
            <div className="card" style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
              <h3 style={{ color: "#b91c1c", fontSize: "0.75rem", fontWeight: "bold", margin: "0 0 0.25rem" }}>Despesas (Dinheiro)</h3>
              <p style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#b91c1c", margin: 0 }}>-{money(totalExpensesCash)} MT</p>
            </div>
            <div className="card" style={{ padding: "0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <h3 style={{ color: "#166534", fontSize: "0.75rem", fontWeight: "bold", margin: "0 0 0.25rem" }}>Saldo Total (Geral)</h3>
              <p style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#15803d", margin: 0 }}>{money(totalAllMethods)} MT</p>
            </div>
          </div>

          <div className="card" style={{ padding: "0.75rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Vendas por Método de Pagamento</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
              <div style={{ backgroundColor: "#f8fafc", padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Dinheiro (líquido)</div>
                <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#166534" }}>{money(totals.CASH)} MT</div>
              </div>
              <div style={{ backgroundColor: "#f8fafc", padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Cartão</div>
                <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#1e40af" }}>{money(totals.CARD)} MT</div>
              </div>
              <div style={{ backgroundColor: "#f8fafc", padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>M-Pesa</div>
                <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#b45309" }}>{money(totals.MPESA)} MT</div>
              </div>
              <div style={{ backgroundColor: "#f8fafc", padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>e-Mola</div>
                <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#7c3aed" }}>{money(totals.EMOLA)} MT</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "0.75rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Movimentos de Caixa</h3>
            {movements.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Nenhum movimento registado.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Data</th><th>Tipo</th><th>Motivo</th><th>Valor</th></tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontSize: "0.85rem" }}>{formatDateTime(m.createdAt)}</td>
                      <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>{m.type === "IN" ? "Entrada" : "Saída"}</td>
                      <td style={{ fontSize: "0.85rem" }}>{m.reason}</td>
                      <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>{m.type === "OUT" ? "-" : "+"}{money(m.amount)} MT</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ padding: "0.75rem" }}>
            <p style={{ color: "#166534", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Caixa aberta.</p>
            {cashInDrawer < 0 && (
              <p style={{ color: "#b91c1c", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.85rem" }}>
                ⚠️ Saldo em gaveta negativo. Contacte o administrador para forçar o fecho.
              </p>
            )}
            <p style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}><strong>Aberta em:</strong> {formatDateTime(session.openedAt)}</p>

            {allowed ? (
              <form onSubmit={handleClose} style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.85rem" }}>Valor Contado (MT)</label>
                  <input type="number" step="0.01" min="0" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 1050.00" required style={{ width: "100%" }} />
                </div>
                <button type="submit" disabled={submitting || cashInDrawer < 0} className="btn btn-danger" style={{ padding: "0.5rem 1.5rem", opacity: cashInDrawer < 0 ? 0.5 : 1 }}>
                  {submitting ? "A fechar…" : "Fechar Caixa"}
                </button>
              </form>
            ) : (
              <p style={{ color: "#6b7280" }}>Não tens permissão para fechar a caixa.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


