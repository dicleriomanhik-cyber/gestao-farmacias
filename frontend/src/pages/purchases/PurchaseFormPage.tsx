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
import CustomSelect from "../../components/ui/CustomSelect";
import InvoiceLinesEditor, { linesTotal, newLine, toLineRequests } from "../../components/suppliers/InvoiceLinesEditor";
import type { LineDraft } from "../../components/suppliers/InvoiceLinesEditor";
import { apiError, fmtMoney } from "../../utils/supplierFormat";

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
  const [currency, setCurrency] = useState("MZN");
  const [exchangeRate, setExchangeRate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "CREDIT">("PAID");
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
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
    const r = toLineRequests(lines);
    if (!r.ok) return toast.error(r.error);

    const body: PurchaseRequest = { supplierId, documentNumber: documentNumber.trim(), lines: r.lines };
    const t = parseFloat(transportCost);
    if (!isNaN(t) && t > 0) body.transportCost = t;
    const o = parseFloat(otherCosts);
    if (!isNaN(o) && o > 0) body.otherCosts = o;

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
      toast.success("Fatura criada em rascunho.");
      navigate(`/fornecedores/compras/${created.id}`);
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao criar a fatura."));
    } finally {
      setSubmitting(false);
    }
  }
  if (loading) return <LoadingState message="A carregar dados…" />;
  if (error) return <ErrorState message="Não foi possível carregar os fornecedores." onRetry={load} />;

  const foreign = Boolean(settings?.multiCurrency) && currency.trim().toUpperCase() !== "MZN";
  const cur = foreign ? currency.trim().toUpperCase() : "MZN";
  const goods = linesTotal(lines);
  const tv = parseFloat(transportCost);
  const ov = parseFloat(otherCosts);
  const grand = goods + (isNaN(tv) ? 0 : tv) + (isNaN(ov) ? 0 : ov);

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Nova fatura de fornecedor</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Fornecedor</label>
            <CustomSelect value={supplierId} onChange={setSupplierId} placeholder="Seleciona um fornecedor" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
          </div>
          <div>
            <label style={labelStyle}>Nº da fatura</label>
            <input type="text" className="input" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required />
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

        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "1.25rem 0 0.75rem" }}>Linhas da fatura</h2>
        <InvoiceLinesEditor lines={lines} onChange={setLines} currency={cur} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", margin: "1.25rem 0 1rem" }}>
          <div>
            <label style={labelStyle}>Transporte</label>
            <input type="number" min="0" step="0.01" className="input" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Outros custos</label>
            <input type="number" min="0" step="0.01" className="input" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} />
          </div>
        </div>

        {settings?.usePayables && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Pagamento</label>
              <CustomSelect value={paymentStatus} onChange={(v) => setPaymentStatus(v as "PAID" | "CREDIT")} options={[{ value: "PAID", label: "Pago na confirmação" }, { value: "CREDIT", label: "A prazo" }]} />
            </div>
            {paymentStatus === "CREDIT" && (
              <div>
                <label style={labelStyle}>Data limite</label>
                <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: "1.1rem", fontWeight: 600, margin: "1rem 0 1.5rem" }}>Total da fatura: {fmtMoney(grand, cur)}</div>

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A criar…" : "Criar fatura (rascunho)"}
        </button>
      </form>
    </div>
  );
}