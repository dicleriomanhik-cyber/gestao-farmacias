import CustomSelect from "../../components/ui/CustomSelect";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createExpense, getExpenseById, updateExpense } from "../../services/expenseService";
import { getActiveCashSession, getPayments } from "../../services/cashService";
import { apiClient } from "../../services/api";
import type { ExpenseCategory, ExpenseMethod, ExpensePaidFrom } from "../../types/expenses";
import { getSettings } from "../../services/settingsService";
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

const PAID_FROM: { value: ExpensePaidFrom; label: string }[] = [
  { value: "PHARMACY_CASH", label: "Caixa da farmácia" },
  { value: "OWNER_CASH", label: "Dinheiro do dono ou do colaborador" },
  { value: "BANK", label: "Banco / transferência" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "EMOLA", label: "e-Mola" },
  { value: "OTHER", label: "Outro" },
];

function derivePaidFrom(m: ExpenseMethod, allowCash = true): ExpensePaidFrom {
  if (m === "CASH") return allowCash ? "PHARMACY_CASH" : "OWNER_CASH";
  if (m === "MPESA") return "MPESA";
  if (m === "EMOLA") return "EMOLA";
  if (m === "CARD" || m === "TRANSFER") return "BANK";
  return "OTHER";
}

interface Props { isOperational?: boolean }

export default function ExpenseFormPage({ isOperational = false }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [method, setMethod] = useState<ExpenseMethod>("CASH");
  const [paidFrom, setPaidFrom] = useState<ExpensePaidFrom>("PHARMACY_CASH");
  const [allowCash, setAllowCash] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(isEdit);

  const [availableBalance, setAvailableBalance] = useState<number | null>(null);

  useEffect(() => {
    getSettings()
      .then((st) => {
        setAllowCash(st.allowCashExpenses);
        if (isOperational && !st.allowCashExpenses) {
          toast.error("Despesas desativadas pelo administrador.");
          navigate("/pos/despesas", { replace: true });
          return;
        }
        if (!st.allowCashExpenses) setPaidFrom((p) => (p === "PHARMACY_CASH" ? "OWNER_CASH" : p));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    getExpenseById(id)
      .then((e) => {
        setDescription(e.description);
        setAmount(String(parseFloat(e.amount)));
        setCategory(e.category);
        setMethod(e.method);
        setPaidFrom(e.paidFrom ?? derivePaidFrom(e.method));
      })
      .catch(() => toast.error("Não foi possível carregar a despesa."))
      .finally(() => setLoadingExpense(false));
  }, [id]);

  useEffect(() => {
    if (!isOperational) return;
    Promise.all([
      getActiveCashSession(),
      getPayments(),
      apiClient.get<{ success: boolean; data: any[] }>("/cash/movements"),
    ]).then(([session, payments, movements]) => {
      if (!session) { setAvailableBalance(0); return; }

      const totalOut = movements.data.data.filter((m: any) => m.type === "OUT" && (m.method ?? "CASH") === "CASH").reduce((acc: number, m: any) => acc + parseFloat(m.amount), 0);
      const totalIn = movements.data.data.filter((m: any) => m.type === "IN" && (m.method ?? "CASH") === "CASH").reduce((acc: number, m: any) => acc + parseFloat(m.amount), 0);

      const cashOnly = payments.totalsByMethod.CASH || 0;

      const balance = parseFloat(session.openingBalance.toString()) + cashOnly + totalIn - totalOut;
      setAvailableBalance(balance);
    }).catch(() => setAvailableBalance(null));
  }, [isOperational]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return toast.error("Descrição é obrigatória.");
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return toast.error("Valor deve ser maior que zero.");

    if (isOperational && paidFrom === "PHARMACY_CASH" && availableBalance !== null && num > availableBalance) {
      return toast.error(`Saldo da gaveta insuficiente. Disponível: ${availableBalance.toFixed(2)} MT.`);
    }

    const payload = {
      paidFrom,
      description: description.trim(),
      amount: num,
      category: isOperational && !isEdit ? "OTHER" : category,
      method,
    } as const;

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateExpense(id!, { ...payload, category: payload.category as ExpenseCategory, method: payload.method as ExpenseMethod });
        toast.success("Despesa atualizada.");
      } else {
        await createExpense({ ...payload, origin: isOperational ? "COLLABORATOR" : "ADMIN", category: payload.category as ExpenseCategory, method: payload.method as ExpenseMethod });
        toast.success("Despesa criada como rascunho.");
      }
      navigate(isOperational ? "/pos/despesas" : "/despesas");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(" ") : (msg ?? (isEdit ? "Erro ao atualizar despesa." : "Erro ao criar despesa.")));
    } finally {
      setSubmitting(false);
    }
  }

  if (isEdit && loadingExpense) {
    return <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>A carregar…</div>;
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>{isEdit ? "Editar Despesa" : "Nova Despesa"}</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Descrição</label>
          <input type="text" className="input" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Ex: Transporte, Refeição…" />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Valor (MT) *</label>
          <input type="number" step="0.01" min="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="Ex: 100.00" />
        </div>

        {!isOperational && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Categoria</label>
            <CustomSelect value={category} onChange={(v) => setCategory(v as ExpenseCategory)} options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
          </div>
        )}

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Método de Pagamento</label>
          <CustomSelect value={method} onChange={(v) => { const m = v as ExpenseMethod; setMethod(m); setPaidFrom(derivePaidFrom(m, allowCash)); }} options={METHODS.map((m) => ({ value: m.value, label: m.label }))} />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Pago com</label>
          <CustomSelect value={paidFrom} onChange={(v) => setPaidFrom(v as ExpensePaidFrom)} options={PAID_FROM.filter((o) => o.value !== "PHARMACY_CASH" || allowCash).map((o) => ({ value: o.value, label: o.label }))} />
        </div>

        {isOperational && paidFrom === "PHARMACY_CASH" && availableBalance !== null && (
          <p style={{ fontSize: "0.85rem", color: availableBalance < parseFloat(amount || "0") ? "#b91c1c" : "#475569", marginBottom: "1rem", fontWeight: availableBalance < parseFloat(amount || "0") ? "bold" : "normal" }}>
            💰 Saldo da gaveta: <strong>{availableBalance.toFixed(2)} MT</strong>
            {availableBalance < parseFloat(amount || "0") && " — valor excede o saldo disponível!"}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A guardar…" : isEdit ? "Guardar Alterações" : "Criar Despesa"}
        </button>
      </form>
    </div>
  );
}