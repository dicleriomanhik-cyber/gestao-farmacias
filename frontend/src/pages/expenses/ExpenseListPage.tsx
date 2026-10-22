import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExpenses, confirmExpense, cancelExpense } from "../../services/expenseService";
import type { Expense } from "../../types/expenses";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

export default function ExpenseListPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getExpenses()
      .then(setExpenses)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleConfirm(id: string) {
    if (!window.confirm("Confirmar esta despesa?")) return;
    await confirmExpense(id);
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: "CONFIRMED" } : e));
  }

  async function handleCancel(id: string) {
    if (!window.confirm("Cancelar esta despesa?")) return;
    await cancelExpense(id);
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: "CANCELLED" } : e));
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => window.location.reload()} />;
  if (expenses.length === 0) return <EmptyState message="Nenhuma despesa registada." actionLabel="Nova Despesa" actionLink="/despesas/novo" />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Despesas</h1>
        <Link to="/despesas/novo" style={{ backgroundColor: "#2563eb", color: "white", padding: "0.5rem 1rem", borderRadius: "4px", textDecoration: "none" }}>
          + Nova Despesa
        </Link>
      </div>
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "0.75rem" }}>Descrição</th>
              <th style={{ padding: "0.75rem" }}>Data</th>
              <th style={{ padding: "0.75rem" }}>Valor</th>
              <th style={{ padding: "0.75rem" }}>Estado</th>
              <th style={{ padding: "0.75rem" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.75rem" }}>{exp.description}</td>
                <td style={{ padding: "0.75rem" }}>{new Date(exp.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: "0.75rem" }}>{exp.amount} MT</td>
                <td style={{ padding: "0.75rem" }}>
                  <span style={{
                    padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem",
                    backgroundColor: exp.status === "CONFIRMED" ? "#dcfce7" : exp.status === "CANCELLED" ? "#fee2e2" : "#fef08a",
                    color: exp.status === "CONFIRMED" ? "#166534" : exp.status === "CANCELLED" ? "#991b1b" : "#854d0e"
                  }}>
                    {exp.status}
                  </span>
                </td>
                <td style={{ padding: "0.75rem", display: "flex", gap: "0.5rem" }}>
                  {exp.status === "DRAFT" && (
                    <>
                      <button onClick={() => handleConfirm(exp.id)} style={{ color: "#16a34a", border: "none", background: "none", cursor: "pointer" }}>Confirmar</button>
                      <button onClick={() => handleCancel(exp.id)} style={{ color: "#b91c1c", border: "none", background: "none", cursor: "pointer" }}>Cancelar</button>
                    </>
                  )}
                  {exp.status === "DRAFT" && (
                    <Link to={`/despesas/${exp.id}/editar`} style={{ color: "#2563eb", textDecoration: "none" }}>Editar</Link>
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
