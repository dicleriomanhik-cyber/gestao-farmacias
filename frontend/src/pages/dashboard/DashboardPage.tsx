import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getSales } from "../../services/saleService";
import { getExpenses } from "../../services/expenseService";
import { getActiveCashSession, getPayments } from "../../services/cashService";
import { apiClient } from "../../services/api";
import type { Sale, CashSession, PaymentMethod } from "../../types/sales";
import type { Expense } from "../../types/expenses";

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

type DateFilter = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [totals, setTotals] = useState<Record<PaymentMethod, number>>({ CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 });
  const [movements, setMovements] = useState<CashMovement[]>([]);

  const [dateFilter, setDateFilter] = useState<DateFilter>("DAILY");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([
      getSales({ limit: 1000 }),
      getExpenses({ limit: 1000 }),
      getActiveCashSession(),
    ]).then(async ([salesRes, expRes, cashRes]) => {
      if (!mounted) return;

      if (salesRes.status === "fulfilled") setSales(salesRes.value.data);
      if (expRes.status === "fulfilled") setExpenses(expRes.value.data);

      if (cashRes.status === "fulfilled" && cashRes.value) {
        setCashSession(cashRes.value);
        try {
          const data = await getPayments();
          if (mounted) setTotals(data.totalsByMethod);
          
          const resp = await apiClient.get<{ success: boolean; data: CashMovement[] }>("/cash/movements");
          if (mounted) setMovements(resp.data.data ?? []);
        } catch {}
      }

      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, []);

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

  const totalSales = filteredSales.reduce((acc, s) => acc + parseFloat(s.total), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const profit = totalSales - totalExpenses;

  const totalOut = movements.filter(m => m.type === "OUT").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalIn = movements.filter(m => m.type === "IN").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalExpensesCash = filteredExpenses.filter(e => e.method === "CASH").reduce((acc, e) => acc + parseFloat(e.amount), 0);
  
  const cashInDrawer = cashSession 
    ? parseFloat(cashSession.openingBalance.toString()) + (totals.CASH || 0) + totalIn - totalOut - totalExpensesCash 
    : 0;
  
  const totalAllMethods = cashInDrawer + (totals.CARD || 0) + (totals.MPESA || 0) + (totals.EMOLA || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
          Olá, {user?.name ?? user?.email ?? "—"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          {new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* FILTRO DE PERÍODO */}
      <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Período</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="input"
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          >
            <option value="DAILY">Hoje</option>
            <option value="WEEKLY">Esta Semana</option>
            <option value="MONTHLY">Este Mês</option>
            <option value="YEARLY">Este Ano</option>
            <option value="CUSTOM">Personalizado</option>
          </select>
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

      {/* CARTÕES DE RESUMO */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Saldo Total (Caixa)</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: totalAllMethods < 0 ? "#b91c1c" : "#2563eb" }}>
            {loading ? "…" : `${money(totalAllMethods)} MT`}
          </p>
          <small style={{ color: "#6b7280" }}>{cashSession ? "Caixa aberta" : "Caixa fechada"}</small>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Vendas no Período</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#166534" }}>
            {loading ? "…" : `${money(totalSales)} MT`}
          </p>
          <small style={{ color: "#6b7280" }}>{filteredSales.length} vendas</small>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Despesas no Período</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#b91c1c" }}>
            {loading ? "…" : `${money(totalExpenses)} MT`}
          </p>
          <small style={{ color: "#6b7280" }}>{filteredExpenses.length} despesas</small>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Lucro / Prejuízo</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: profit >= 0 ? "#15803d" : "#b91c1c" }}>
            {loading ? "…" : `${money(profit)} MT`}
          </p>
          <small style={{ color: "#6b7280" }}>Vendas - Despesas</small>
        </div>
      </div>

      {/* VENDAS POR MÉTODO */}
      <div className="card" style={{ padding: "1rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "0.75rem", color: "#1e293b" }}>Vendas por Método de Pagamento</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          <div style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Dinheiro</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#166534" }}>{money(totals.CASH)} MT</div>
          </div>
          <div style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Cartão</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#1e40af" }}>{money(totals.CARD)} MT</div>
          </div>
          <div style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>M-Pesa</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#b45309" }}>{money(totals.MPESA)} MT</div>
          </div>
          <div style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>e-Mola</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#7c3aed" }}>{money(totals.EMOLA)} MT</div>
          </div>
        </div>
      </div>
    </div>
  );
}
