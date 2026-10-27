import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createExpense } from "../../services/expenseService";
import { getActiveCashSession, getPayments } from "../../services/cashService";
import { apiClient } from "../../services/api";
import type { ExpenseCategory, ExpenseMethod } from "../../types/expenses";
import { useToast } from "../../contexts/ToastContext";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "RENT", label: "Renda" },
  { value: "UTILITIES", label: "Utilidades" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "CONSUMABLES", label: "Consumíveis" },
  { value: "MAINTENANCE", label: "Manutenção" },
  { value: "SALARIES", label: "Salários" },
  { value: "TAXES", label: "Impostos" },
  { value: "OTHER", label: "Outro" },
];

const METHODS: { value: ExpenseMethod; label: string }[] = [
  { value: "CASH", label: "Dinheiro" },
  { value: "CARD", label: "Cartão" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "EMOLA", label: "e-Mola" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" },
];

interface Props { isOperational?: boolean }

export default function ExpenseFormPage({ isOperational = false }: Props) {
  const navigate = useNavigate();
  const toast = useToast();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [method, setMethod] = useState<ExpenseMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);
  
  // Saldo total (para validação no POS)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);

  // Buscar saldo total se for POS
  useEffect(() => {
    if (!isOperational) return;
    Promise.all([
      getActiveCashSession(),
      getPayments(),
      apiClient.get<{ success: boolean; data: any[] }>("/cash/movements"),
    ]).then(([session, payments, movements]) => {
      if (!session) { setAvailableBalance(0); return; }
      
      const totalOut = movements.data.data.filter((m: any) => m.type === "OUT").reduce((acc: number, m: any) => acc + parseFloat(m.amount), 0);
      const totalIn = movements.data.data.filter((m: any) => m.type === "IN").reduce((acc: number, m: any) => acc + parseFloat(m.amount), 0);
      
      const totalAllMethods = 
        (payments.totalsByMethod.CASH || 0) + 
        (payments.totalsByMethod.CARD || 0) + 
        (payments.totalsByMethod.MPESA || 0) + 
        (payments.totalsByMethod.EMOLA || 0);
      
      const balance = parseFloat(session.openingBalance.toString()) + totalAllMethods + totalIn - totalOut;
      setAvailableBalance(balance);
    }).catch(() => setAvailableBalance(null));
  }, [isOperational]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return toast.error("Descrição é obrigatória.");
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return toast.error("Valor deve ser maior que zero.");

    // Validar se no POS o valor excede o saldo total disponível
    if (isOperational && availableBalance !== null && num > availableBalance) {
      return toast.error(`Saldo total insuficiente. Disponível: ${availableBalance.toFixed(2)} MT.`);
    }

    setSubmitting(true);
    try {
      await createExpense({
        description: description.trim(),
        amount: num,
        category: isOperational ? "OTHER" : category,
        method,
      });
      toast.success("Despesa criada como rascunho.");
      navigate(isOperational ? "/pos/despesas" : "/despesas");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Erro ao criar despesa."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Nova Despesa</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Descrição *</label>
          <input type="text" className="input" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Ex: Transporte, Refeição…" />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Valor (MT) *</label>
          <input type="number" step="0.01" min="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="Ex: 100.00" />
        </div>

        {!isOperational && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Categoria *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="input">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Método de Pagamento *</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as ExpenseMethod)} className="input">
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {isOperational && availableBalance !== null && (
          <p style={{ fontSize: "0.85rem", color: availableBalance < parseFloat(amount || "0") ? "#b91c1c" : "#475569", marginBottom: "1rem", fontWeight: availableBalance < parseFloat(amount || "0") ? "bold" : "normal" }}>
            💰 Saldo total disponível: <strong>{availableBalance.toFixed(2)} MT</strong>
            {availableBalance < parseFloat(amount || "0") && " — valor excede o saldo disponível!"}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A criar…" : "Criar Despesa"}
        </button>
      </form>
    </div>
  );
}
