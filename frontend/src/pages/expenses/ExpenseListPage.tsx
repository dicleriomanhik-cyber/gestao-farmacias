import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExpenses, confirmExpense, cancelExpense } from "../../services/expenseService";
import type { Expense, ExpenseCategory, ExpenseMethod } from "../../types/expenses";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
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

export default function ExpenseListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(false);
    getExpenses({ limit: 100 })
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
  if (expenses.length === 0) {
    return <EmptyState message="Nenhuma despesa registada." actionLabel="Nova Despesa" actionLink="/despesas/novo" />;
  }

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
      <PageHeader
        title="Despesas"
        actions={canWrite ? <Link to="/despesas/novo" className="btn btn-primary">+ Nova Despesa</Link> : null}
      />

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
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.expenseDate).toLocaleDateString()}</td>
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
    </div>
  );
}
