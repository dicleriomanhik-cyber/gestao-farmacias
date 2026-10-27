import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExpenses, confirmExpense, cancelExpense } from "../../services/expenseService";
import type { Expense, ExpenseCategory, ExpenseMethod } from "../../types/expenses";
import LoadingState from "../../components/ui/LoadingState";

import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission } from "../../utils/permissions";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT: "Renda",
  UTILITIES: "Utilidades",
  TRANSPORT: "Transporte",
  CONSUMABLES: "Consumíveis",
  MAINTENANCE: "Manutenção",
  SALARIES: "Salários",
  TAXES: "Impostos",
  OTHER: "Outro",
};

const METHOD_LABELS: Record<ExpenseMethod, string> = {
  CASH: "Dinheiro",
  CARD: "Cartão",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

type DateFilter = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM" | "ALL";

interface Props { isOperational?: boolean }

export default function ExpenseListPage({ isOperational = false }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filtro de data
  const [dateFilter, setDateFilter] = useState<DateFilter>("DAILY");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  function load() {
    setLoading(true);
    setError(false);
    getExpenses({ limit: 1000 }) // Buscar o máximo para filtrar no frontend
      .then((res) => setExpenses(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirm(id: string) {
    setActionLoading(id);
    try {
      await confirmExpense(id);
      toast.success("Despesa confirmada.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao confirmar.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm("Cancelar esta despesa?")) return;
    setActionLoading(id);
    try {
      await cancelExpense(id);
      toast.success("Despesa cancelada.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao cancelar.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar as despesas." onRetry={load} />;

  // --- FILTRAGEM ---
  const now = new Date();
  let filteredExpenses = expenses;

  if (dateFilter === "DAILY") {
    const todayStr = now.toLocaleDateString("pt-PT");
    filteredExpenses = filteredExpenses.filter(e => new Date(e.expenseDate).toLocaleDateString("pt-PT") === todayStr);
  } else if (dateFilter === "WEEKLY") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Segunda-feira
    startOfWeek.setHours(0, 0, 0, 0);
    filteredExpenses = filteredExpenses.filter(e => new Date(e.expenseDate) >= startOfWeek);
  } else if (dateFilter === "MONTHLY") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredExpenses = filteredExpenses.filter(e => new Date(e.expenseDate) >= startOfMonth);
  } else if (dateFilter === "YEARLY") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    filteredExpenses = filteredExpenses.filter(e => new Date(e.expenseDate) >= startOfYear);
  } else if (dateFilter === "CUSTOM") {
    if (customStart) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      filteredExpenses = filteredExpenses.filter(e => new Date(e.expenseDate) >= start);
    }
    if (customEnd) {
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      filteredExpenses = filteredExpenses.filter(e => new Date(e.expenseDate) <= end);
    }
  }

  // Total do período filtrado
  const totalPeriod = filteredExpenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const totalCount = filteredExpenses.length;

  function statusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
      CONFIRMED: { bg: "#dcfce7", color: "#166534", label: "Confirmada" },
      CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelada" },
    };
    const cfg = map[status] ?? { bg: "#f3f4f6", color: "#374151", label: status };
    return (
      <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    );
  }

  const canWrite = hasPermission(user?.permissions, "expenses:create");

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#f1f5f9", paddingBottom: "1rem", paddingTop: "0.5rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <PageHeader
          title="Despesas"
          actions={canWrite ? <Link to={isOperational ? "/pos/despesas/novo" : "/despesas/novo"} className="btn btn-primary">+ Nova Despesa</Link> : null}
        />

        {/* BARRA DE FILTROS */}
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
            <option value="ALL">Ver Tudo</option>
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

          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Total no Período</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#b91c1c" }}>{totalPeriod.toFixed(2)} MT</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{totalCount} despesas</div>
          </div>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="card" style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
          <p style={{ fontSize: "1.1rem", margin: 0 }}>Nenhuma despesa encontrada para este período.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Método</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.expenseDate).toLocaleDateString("pt-PT")}</td>
                  <td>{e.description}</td>
                  <td>{CATEGORY_LABELS[e.category] ?? e.category}</td>
                  <td>{METHOD_LABELS[e.method] ?? e.method}</td>
                  <td>{parseFloat(e.amount).toFixed(2)} MT</td>
                  <td>{statusBadge(e.status)}</td>
                  <td style={{ display: "flex", gap: "0.5rem" }}>
                    {e.status === "DRAFT" && canWrite && (
                      <>
                        <button
                          onClick={() => handleConfirm(e.id)}
                          disabled={actionLoading === e.id}
                          className="btn btn-success"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleCancel(e.id)}
                          disabled={actionLoading === e.id}
                          className="btn btn-danger"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}






