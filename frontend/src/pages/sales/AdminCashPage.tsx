import { useEffect, useState } from "react";
import { getActiveCashSession, closeCash, getPayments } from "../../services/cashService";
import { getExpenses } from "../../services/expenseService";
import { apiClient } from "../../services/api";
import type { CashSession, PaymentMethod } from "../../types/sales";
import type { Expense } from "../../types/expenses";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
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

export default function AdminCashPage() {
  const toast = useToast();
  const [session, setSession] = useState<CashSession | null>(null);
  const [totals, setTotals] = useState<Record<PaymentMethod, number>>({ CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 });
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forcing, setForcing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const active = await getActiveCashSession();
      setSession(active);
      if (active) {
        const data = await getPayments();
        setTotals(data.totalsByMethod);

        let movementsData: CashMovement[] = [];
        try {
          const resp = await apiClient.get<{ success: boolean; data: CashMovement[] }>("/cash/movements");
          movementsData = resp.data.data ?? [];
          setMovements(movementsData);
        } catch {
          setMovements([]);
        }

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
      } else {
        setTotals({ CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 });
        setMovements([]);
        setExpenses([]);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmForceClose() {
    if (!session) return;
    setShowConfirm(false);
    setForcing(true);
    try {
      await closeCash(session.id, { countedBalance: 0 });
      toast.success("Caixa forçado a fechar com sucesso.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao forçar fecho.");
    } finally {
      setForcing(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Erro ao carregar a caixa." onRetry={load} />;

  const totalOut = movements.filter((m) => m.type === "OUT").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalIn = movements.filter((m) => m.type === "IN").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalExpensesCash = expenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);

  const cashInDrawer = session 
    ? parseFloat(session.openingBalance.toString()) + (totals.CASH || 0) + totalIn - totalOut - totalExpensesCash 
    : 0;
  
  const totalAllMethods = cashInDrawer + (totals.CARD || 0) + (totals.MPESA || 0) + (totals.EMOLA || 0);

  return (
    <div>
      <PageHeader title="Gestão de Caixa (Administrador)" />

      {!session ? (
        <div className="card" style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
          <p style={{ fontSize: "1.1rem", margin: 0 }}>A caixa está fechada.</p>
        </div>
      ) : (
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
            <div className="card" style={{ padding: "0.75rem", backgroundColor: totalAllMethods < 0 ? "#fef2f2" : "#f0fdf4", border: totalAllMethods < 0 ? "1px solid #fecaca" : "1px solid #bbf7d0" }}>
              <h3 style={{ color: totalAllMethods < 0 ? "#b91c1c" : "#166534", fontSize: "0.75rem", fontWeight: "bold", margin: "0 0 0.25rem" }}>Saldo Total (Geral)</h3>
              <p style={{ fontSize: "1.3rem", fontWeight: "bold", color: totalAllMethods < 0 ? "#b91c1c" : "#15803d", margin: 0 }}>{money(totalAllMethods)} MT</p>
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
            <p style={{ color: cashInDrawer < 0 ? "#b91c1c" : "#166534", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>
              {cashInDrawer < 0 ? "⚠️ Caixa em saldo negativo — é necessário forçar o fecho." : "Caixa aberta normalmente."}
            </p>
            <p style={{ marginBottom: "0.25rem", fontSize: "0.85rem" }}><strong>Aberta em:</strong> {formatDateTime(session.openedAt)}</p>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={forcing}
              className="btn btn-danger"
              style={{ width: "100%", padding: "1rem", marginTop: "1rem", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: forcing ? "not-allowed" : "pointer", opacity: forcing ? 0.6 : 1 }}
            >
              {forcing ? "A forçar fecho…" : "Forçar Fecho de Caixa"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO */}
      {showConfirm && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white", borderRadius: "12px", padding: "1.5rem",
              maxWidth: "450px", width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.75rem", color: "#1e293b" }}>
              Forçar Fecho de Caixa
            </h2>
            <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
              Tens a certeza que queres forçar o fecho da caixa? O saldo ficará a <strong>zero (0.00 MT)</strong> para o colaborador e todos os movimentos serão registados no histórico.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={forcing}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#e2e8f0",
                  color: "#1e293b", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmForceClose}
                disabled={forcing}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#dc2626",
                  color: "white", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: forcing ? "not-allowed" : "pointer",
                  opacity: forcing ? 0.7 : 1,
                }}
              >
                {forcing ? "A forçar…" : "Forçar Fecho"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



