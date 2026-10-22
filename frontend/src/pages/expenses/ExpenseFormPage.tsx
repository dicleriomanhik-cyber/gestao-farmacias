import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExpenseById, createExpense, updateExpense } from "../../services/expenseService";

export default function ExpenseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      getExpenseById(id).then((e) => {
        setDescription(e.description);
        setAmount(e.amount);
      });
    }
  }, [id, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description || !amount) return alert("Preenche todos os campos.");
    setLoading(true);
    try {
      if (isEditing && id) {
        await updateExpense(id, { description, amount });
      } else {
        await createExpense({ description, amount });
      }
      navigate("/despesas");
    } catch {
      alert("Erro ao guardar despesa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
        {isEditing ? "Editar Despesa" : "Nova Despesa"}
      </h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Descrição *</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }} />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Valor (MT) *</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
          {loading ? "A guardar..." : "Guardar Despesa"}
        </button>
      </form>
    </div>
  );
}
