import { useEffect, useState } from "react";
import { getActiveCashSession, getPayments } from "../../services/cashService";
import { getExpenses } from "../../services/expenseService";
import { getSales } from "../../services/saleService";
import { apiClient } from "../../services/api";
import type { CashSession, PaymentMethod, Sale } from "../../types/sales";
import type { Expense } from "../../types/expenses";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import CustomSelect from '../../components/ui/CustomSelect';
import { formatDateTime } from "../../utils/formatDate";
import { useToast } from "../../contexts/ToastContext";

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

type DateFilter = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM" | "ALL";

export default function AdminCashPage() {
  const toast = useToast();
  const [session, setSession] = useState<CashSession | null>(null);
  const [totals, setTotals] = useState<Record<PaymentMethod, number>>({ CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 });
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSales, setShowSales] = useState(true);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilter>("DAILY");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [active, salesRes, expRes] = await Promise.all([
        getActiveCashSession(),
        getSales({ limit: 1000 }),
        getExpenses({ limit: 1000 }),
      ]);
      setSession(active);
      setSales(salesRes.data);
      setExpenses(expRes.data);

      if (active) {
        const data = await getPayments();
        setTotals(data.totalsByMethod);
        
        try {
          const resp = await apiClient.get<{ success: boolean; data: CashMovement[] }>("/cash/movements");
          setMovements(resp.data.data ?? []);
        } catch {
          setMovements([]);
        }
      } else {
        setTotals({ CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 });
        setMovements([]);
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

  async function handleResetTestData() {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      await apiClient.post('/admin/reset-test-data');
      toast.success('Dados de teste reiniciados com sucesso.');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? 'Erro ao resetar dados.');
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Erro ao carregar a caixa." onRetry={load} />;

  const now = new Date();
  function isWithinPeriod(dateStr: string) {
    const d = new Date(dateStr);
    if (dateFilter === "DAILY") return d.toLocaleDateString("pt-PT") === now.toLocaleDateString("pt-PT");
    if (dateFilter === "WEEKLY") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      start.setHours(0, 0, 0, 0);
      return d >= start;
    }
    if (dateFilter === "MONTHLY") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateFilter === "YEARLY") return d.getFullYear() === now.getFullYear();
    if (dateFilter === "CUSTOM") {
      let ok = true;
      if (customStart) {
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        if (d < start) ok = false;
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (d > end) ok = false;
      }
      return ok;
    }
    return true;
  }

  const filteredSales = sales.filter(s => s.status === "CONFIRMED" && isWithinPeriod(s.createdAt));
  const filteredExpenses = expenses.filter(e => e.status === "CONFIRMED" && isWithinPeriod(e.expenseDate));
  const totalSalesPeriod = filteredSales.reduce((acc, s) => acc + parseFloat(s.total), 0);

  const totalOut = movements.filter((m) => m.type === "OUT").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalIn = movements.filter((m) => m.type === "IN").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalExpensesCash = filteredExpenses.filter(e => e.method === "CASH").reduce((acc, e) => acc + parseFloat(e.amount), 0);

  const cashInDrawer = session 
    ? parseFloat(session.openingBalance.toString()) + (totals.CASH || 0) + totalIn - totalOut - totalExpensesCash 
    : 0;
  
  const totalAllMethods = cashInDrawer + (totals.CARD || 0) + (totals.MPESA || 0) + (totals.EMOLA || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      
      {/* FILTRO DE PERÍODO */}
      <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
        <div style={{ width: "220px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Período</label>
          <CustomSelect
            value={dateFilter}
            onChange={(val) => setDateFilter(val as DateFilter)}
            options={[
              { value: "DAILY", label: "Hoje" },
              { value: "WEEKLY", label: "Esta Semana" },
              { value: "MONTHLY", label: "Este Mês" },
              { value: "YEARLY", label: "Este Ano" },
              { value: "CUSTOM", label: "Personalizado" },
              { value: "ALL", label: "Ver Tudo" },
            ]}
          />
        </div>
        {dateFilter === "CUSTOM" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Início</label>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input" style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Fim</label>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input" style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
            </div>
          </>
        )}
      </div>

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
            <p style={{ marginBottom: 0, fontSize: "0.85rem" }}><strong>Aberta em:</strong> {formatDateTime(session.openedAt)}</p>
          </div>

          {/* ZONA DE PERIGO */}
          <div className="card" style={{ padding: "0.75rem", border: "1px solid #fecaca", backgroundColor: "#fef2f2" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#b91c1c", marginBottom: "0.5rem" }}>Zona de Perigo</h3>
            <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "1rem" }}>Esta ação irá cancelar todas as vendas, despesas e devoluções, e fechar todas as sessões de caixa abertas. Use apenas para limpar dados de teste.</p>
            <button onClick={() => setShowResetConfirm(true)} disabled={resetting} className="btn btn-danger" style={{ width: "100%", padding: "0.75rem", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: resetting ? "not-allowed" : "pointer", opacity: resetting ? 0.6 : 1 }}>
              {resetting ? "A resetar…" : "Reset de Dados de Teste"}
            </button>
          </div>

          {/* VENDAS DO PERÍODO */}
          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSales ? "1rem" : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0 }}>Vendas do Período</h2>
                <button
                  onClick={() => setShowSales(!showSales)}
                  style={{
                    background: "none", border: "1px solid #cbd5e1", borderRadius: "6px",
                    cursor: "pointer", padding: "0.25rem 0.5rem", fontSize: "0.85rem",
                    color: "#475569", display: "flex", alignItems: "center", gap: "0.25rem"
                  }}
                >
                  {showSales ? "▲ Minimizar" : "▼ Expandir"}
                </button>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Total no Período</div>
                <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#166534" }}>{money(totalSalesPeriod)} MT</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{filteredSales.length} vendas</div>
              </div>
            </div>

            {showSales && (
              filteredSales.length === 0 ? (
                <p style={{ textAlign: "center", color: "#64748b", padding: "1rem" }}>Nenhuma venda encontrada para este filtro.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Data</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => (
                      <tr key={s.id}>
                        <td>{s.saleNumber}</td>
                        <td>{formatDateTime(s.createdAt)}</td>
                        <td>{money(s.total)} MT</td>
                        <td>
                          <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: "#dcfce7", color: "#166534" }}>
                            Concluída
                          </span>
                        </td>
                        <td>
                          <a href={`/vendas/${s.id}`} style={{ color: "#2563eb", textDecoration: "underline" }}>Ver Detalhe</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      )}

      {/* MODAL DE RESET */}
      {showResetConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setShowResetConfirm(false)}>
          <div className="card" style={{ backgroundColor: "white", borderRadius: "12px", padding: "1.5rem", maxWidth: "450px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.75rem", color: "#b91c1c" }}>Reset de Dados de Teste</h2>
            <p style={{ color: "#475569", marginBottom: "1.5rem" }}>Tens a certeza? Esta ação irá cancelar TODAS as vendas, despesas e devoluções, e fechar TODAS as sessões de caixa. O sistema voltará a 0 (zero). Esta ação não pode ser desfeita.</p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowResetConfirm(false)} disabled={resetting} style={{ padding: "0.5rem 1rem", backgroundColor: "#e2e8f0", color: "#1e293b", border: "none", borderRadius: "6px", fontWeight: "500", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleResetTestData} disabled={resetting} style={{ padding: "0.5rem 1rem", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "6px", fontWeight: "500", cursor: resetting ? "not-allowed" : "pointer", opacity: resetting ? 0.7 : 1 }}>{resetting ? "A resetar…" : "Sim, Resetar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

