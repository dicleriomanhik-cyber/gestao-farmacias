import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPurchase } from "../../services/purchaseService";
import { getSuppliers } from "../../services/supplierService";
import { getSettings } from "../../services/settingsService";
import type { Supplier } from "../../types/suppliers";
import type { PharmacySettings } from "../../types/settings";
import type { PurchaseRequest } from "../../types/purchases";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import { apiError } from "../../utils/supplierFormat";

const labelStyle = { display: "block", marginBottom: "0.5rem", fontWeight: 500 } as const;

export default function PurchaseFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [transportCost, setTransportCost] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [currency, setCurrency] = useState("MZN");
  const [exchangeRate, setExchangeRate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "CREDIT">("PAID");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([getSuppliers({ page: 1, limit: 100 }), getSettings().catch(() => null)])
      .then(([s, st]) => {
        setSuppliers(s.data.filter((x) => x.status === "ACTIVE"));
        setSettings(st);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) return toast.error("Seleciona um fornecedor.");
    if (!documentNumber.trim()) return toast.error("Número da fatura é obrigatório.");

    const body: PurchaseRequest = { supplierId, documentNumber: documentNumber.trim() };
    if (notes.trim()) body.notes = notes.trim();
    const t = parseFloat(transportCost);
    if (!isNaN(t) && t > 0) body.transportCost = t;
    const o = parseFloat(otherCosts);
    if (!isNaN(o) && o > 0) body.otherCosts = o;
    const inv = parseFloat(invoiceTotal);
    if (!isNaN(inv) && inv >= 0 && invoiceTotal.trim() !== "") body.invoiceTotal = inv;

    if (settings?.multiCurrency && currency.trim().toUpperCase() !== "MZN") {
      const rate = parseFloat(exchangeRate);
      if (isNaN(rate) || rate <= 0) return toast.error("Indica o câmbio para metical.");
      body.currency = currency.trim().toUpperCase();
      body.exchangeRate = rate;
    }

    if (settings?.usePayables) {
      body.paymentStatus = paymentStatus;
      if (paymentStatus === "CREDIT" && dueDate) body.dueDate = dueDate;
    }

    setSubmitting(true);
    try {
      const created = await createPurchase(body);
      toast.success("Compra criada em rascunho. Regista agora as caixas.");
      navigate(`/fornecedores/compras/${created.id}`);
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao criar compra."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="A carregar dados…" />;
  if (error) return <ErrorState message="Não foi possível carregar os fornecedores." onRetry={load} />;

  const foreign = Boolean(settings?.multiCurrency) && currency.trim().toUpperCase() !== "MZN";

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "760px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Nova Compra</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Fornecedor *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className="input">
              <option value="">Seleciona um fornecedor</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Nº da fatura *</label>
            <input type="text" className="input" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Transporte (MT)</label>
            <input type="number" min="0" step="0.01" className="input" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Outros custos (MT)</label>
            <input type="number" min="0" step="0.01" className="input" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Total da fatura (conferência)</label>
            <input type="number" min="0" step="0.01" className="input" value={invoiceTotal} onChange={(e) => setInvoiceTotal(e.target.value)} />
          </div>
        </div>

        {settings?.multiCurrency && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Moeda</label>
              <input type="text" className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </div>
            {foreign && (
              <div>
                <label style={labelStyle}>Câmbio (1 {currency || "—"} = ? MT)</label>
                <input type="number" min="0" step="0.0001" className="input" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {settings?.usePayables && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Pagamento</label>
              <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as "PAID" | "CREDIT")}>
                <option value="PAID">Pago na confirmação</option>
                <option value="CREDIT">A prazo</option>
              </select>
            </div>
            {paymentStatus === "CREDIT" && (
              <div>
                <label style={labelStyle}>Data limite</label>
                <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>Notas</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A criar…" : "Criar compra (rascunho)"}
        </button>
      </form>
    </div>
  );
}