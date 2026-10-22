import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExpenseById, createExpense, updateExpense } from "../../services/expenseService";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

export default function ExpenseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    if (!isEditing || !id) return;
    setLoading(true); setError(false);
    getExpenseById(id)
      .then((e) => { setDescription(e.description); setAmount(e.amount); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return toast.error("Descrição é obrigatória.");
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return toast.error("Valor deve ser maior que zero.");
    setSubmitting(true);
    try {
      if (isEditing && id) { await updateExpense(id, { description, amount }); toast.success("Despesa atualizada."); }
      else { await createExpense({ description, amount }); toast.success("Despesa criada."); }
      navigate("/despesas");
    } catch { toast.error("Erro ao guardar despesa."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a despesa." onRetry={load} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <PageHeader title={isEditing ? "Editar Despesa" : "Nova Despesa"} actions={<span style={{ backgroundColor: "#fef08a", color: "#854d0e", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem" }}>[MOCK]</span>} />
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Descrição *</label>
          <input type="text" className="input" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Valor (MT) *</label>
          <input type="number" step="0.01" min="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A guardar..." : "Guardar Despesa"}
        </button>
      </form>
    </div>
  );
}
