import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getPurchases, getPurchaseById, markLineDamaged, closePurchaseLine } from "../../services/purchaseService";
import { createStockBoxesBatch } from "../../services/stockService";
import type { Purchase } from "../../types/purchases";
import { useToast } from "../../contexts/ToastContext";
import { confirmDialog } from "../../components/ui/confirmDialog";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import { MonthField } from "./StockBoxFormPage";
import { fmtMoney, apiError } from "../../utils/supplierFormat";
import CustomSelect from "../../components/ui/CustomSelect";
import useIsMobile from "../../hooks/useIsMobile";

const monthEnd = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0, 23, 59, 59)).toISOString();
};

const inputStyle: CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d9dee9", borderRadius: 6, font: "inherit", boxSizing: "border-box" };
const lab: CSSProperties = { display: "block", marginBottom: 4, fontSize: "0.85rem", color: "#5b6478", fontWeight: 500 };
const box: CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 8, padding: "1rem", marginBottom: "1rem", background: "#fff" };

export default function StockReceiveFormPage() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [lineId, setLineId] = useState("");
  const [qrText, setQrText] = useState("");
  const [expiry, setExpiry] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dmgQty, setDmgQty] = useState("");
  const [dmgNote, setDmgNote] = useState("");

  function load() {
    setLoading(true);
    setError(false);
    getPurchases({ status: "CONFIRMED", limit: 100 })
      .then((r) => setPurchases(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setLineId("");
    setQrText("");
    if (!purchaseId) {
      setPurchase(null);
      return;
    }
    getPurchaseById(purchaseId)
      .then(setPurchase)
      .catch(() => toast.error("Erro ao carregar a fatura."));
  }, [purchaseId]);

  const suppliers = useMemo(() => {
    const m = new Map<string, string>();
    purchases.forEach((p) => m.set(p.supplierId, p.supplier?.name ?? "?"));
    return Array.from(m.entries());
  }, [purchases]);

  const invoices = purchases.filter((p) => p.supplierId === supplierId);
  const lines = purchase?.lines ?? [];
  const line = lines.find((l) => l.id === lineId);
  const falta = line ? line.quantity - (line.received ?? 0) - (line.quantityDamaged ?? 0) : 0;
  const qrs = qrText.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const medicine = line?.product?.type === "MEDICINE";
  const cur = purchase?.currency ?? "MZN";

  async function confirmar() {
    if (!line) return toast.error("Escolhe a linha que chegou.");
    if (qrs.length === 0) return toast.error("Lê pelo menos um QR.");
    if (new Set(qrs).size !== qrs.length) return toast.error("Há QR repetidos na lista.");
    if (qrs.length > falta) return toast.error("Só faltam " + falta + " caixas nesta linha.");
    if (!noExpiry) {
      if (!expiry) return toast.error("Indica a validade ou marca que não tem validade.");
      if (new Date(monthEnd(expiry)) <= new Date()) return toast.error("A validade deve ser no futuro.");
    }
    const price = parseFloat(salePrice.replace(",", "."));
    if (isNaN(price) || price < 0) return toast.error("Indica o preço de venda por unidade.");
    setBusy(true);
    try {
      await createStockBoxesBatch({
        purchaseLineId: line.id,
        qrCodes: qrs,
        ...(noExpiry ? { noExpiry: true } : { expiryDate: monthEnd(expiry) }),
        salePrice: price,
      });
      toast.success(qrs.length + " caixa(s) recebida(s).");
      const p = await getPurchaseById(purchaseId);
      setPurchase(p);
      setQrText("");
      const l = p.lines?.find((x) => x.id === line.id);
      if (l && l.quantity - (l.received ?? 0) <= 0) setLineId("");
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao receber a mercadoria."));
    } finally {
      setBusy(false);
    }
  }

  async function afterLineChange(id: string) {
    const p = await getPurchaseById(purchaseId);
    setPurchase(p);
    setDmgQty("");
    setDmgNote("");
    const l = p.lines?.find((x) => x.id === id);
    if (l && (l.closed || l.quantity - (l.received ?? 0) - (l.quantityDamaged ?? 0) <= 0)) setLineId("");
  }

  async function danificar() {
    if (!line) return;
    const q = parseInt(dmgQty, 10);
    if (isNaN(q) || q < 1) return toast.error("Indica quantas caixas vieram danificadas.");
    if (q > falta) return toast.error("Só faltam " + falta + " caixas nesta linha.");
    setBusy(true);
    try {
      await markLineDamaged(line.id, q, dmgNote.trim() || undefined);
      toast.success(q + " caixa(s) danificada(s) registada(s).");
      await afterLineChange(line.id);
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao registar caixas danificadas."));
    } finally {
      setBusy(false);
    }
  }

  async function fecharLinha() {
    if (!line) return;
    if (!(await confirmDialog({ title: "Fechar esta linha?", message: "As " + falta + " caixas em falta deixam de ser esperadas.", confirmLabel: "Fechar linha", cancelLabel: "Voltar" }))) return;
    setBusy(true);
    try {
      await closePurchaseLine(line.id);
      toast.success("Linha fechada.");
      await afterLineChange(line.id);
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao fechar a linha."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar as faturas." onRetry={load} />;

  return (
    <div style={{ maxWidth: 850, width: "100%", margin: "0 auto", overflowY: "auto", paddingBottom: "2rem" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 0 }}>Receber mercadoria</h2>

      {purchases.length === 0 ? (
        <div style={box}>Não há faturas confirmadas. Cria e confirma uma fatura em Fornecedores.</div>
      ) : (
        <div style={{ ...box, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={lab}>Fornecedor</label>
            <CustomSelect value={supplierId} onChange={(v) => { setSupplierId(v); setPurchaseId(""); }} placeholder="Escolhe o fornecedor" options={suppliers.map(([id, name]) => ({ value: id, label: name }))} />
          </div>
          <div>
            <label style={lab}>Fatura</label>
            <CustomSelect value={purchaseId} onChange={setPurchaseId} disabled={!supplierId} placeholder="Escolhe a fatura" options={invoices.map((p) => ({ value: p.id, label: p.documentNumber }))} />
          </div>
        </div>
      )}

      {purchase && (
        <div style={box}>
          {isMobile ? (
            <div>
              {lines.map((l) => {
                const r = l.received ?? 0;
                const dm = l.quantityDamaged ?? 0;
                const done = !!l.closed || r + dm >= l.quantity;
                return (
                  <div key={l.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", marginBottom: "0.5rem", background: l.id === lineId ? "#e8efff" : "#fff" }}>
                    <div style={{ fontWeight: 600 }}>{l.product?.name ?? "?"}{l.product?.strength ? " " + l.product.strength : ""}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 0" }}>{l.closed ? "Fechada \u2014 " : done ? "Completo \u2014 " : ""}recebido {r}{dm > 0 ? ", danificado " + dm : ""} de {l.quantity}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{fmtMoney(l.unitCost, cur)} por caixa</div>
                    <button type="button" className="btn btn-secondary" disabled={done} style={{ marginTop: "0.5rem", width: "100%" }} onClick={() => { setLineId(l.id); setQrText(""); }}>Receber</button>
                  </div>
                );
              })}
            </div>
          ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Recebido</th>
                <th>Preço por caixa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const r = l.received ?? 0;
                const dm = l.quantityDamaged ?? 0;
                const done = !!l.closed || r + dm >= l.quantity;
                return (
                  <tr key={l.id} style={l.id === lineId ? { background: "#e8efff" } : undefined}>
                    <td>{l.product?.name ?? "?"}{l.product?.strength ? " " + l.product.strength : ""}</td>
                    <td>{l.closed ? "Fechada — " : done ? "Completo — " : ""}recebido {r}{dm > 0 ? ", danificado " + dm : ""} de {l.quantity}</td>
                    <td>{fmtMoney(l.unitCost, cur)}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" disabled={done} onClick={() => { setLineId(l.id); setQrText(""); }}>
                        Receber
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      )}

      {line && (
        <div style={box}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
            {line.product?.name}{line.product?.strength ? " " + line.product.strength : ""} — faltam {falta} caixas
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={lab}>QR de cada caixa (um por linha ou separados por vírgula) — {qrs.length} lida(s)</label>
              <textarea style={{ ...inputStyle, minHeight: 140 }} value={qrText} onChange={(e) => setQrText(e.target.value)} placeholder="Lê o QR de cada caixa" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={lab}>Validade</label>
                  <label style={{ fontSize: "0.8rem", color: "#5b6478", cursor: "pointer" }}>
                    <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} /> Sem validade
                  </label>
                </div>
                <MonthField value={expiry} onChange={setExpiry} disabled={noExpiry} style={{ ...inputStyle, opacity: noExpiry ? 0.6 : 1 }} />
              </div>
              <div>
                <label style={lab}>{medicine ? "Preço de venda por carteira (MT)" : "Preço de venda por unidade (MT)"}</label>
                <input type="number" min="0" step="0.01" style={inputStyle} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "1rem", paddingTop: "1rem", display: "grid", gridTemplateColumns: "120px 1fr auto auto", gap: "0.75rem", alignItems: "end" }}>
            <div>
              <label style={lab}>Danificadas</label>
              <input type="number" min="1" style={inputStyle} value={dmgQty} onChange={(e) => setDmgQty(e.target.value)} />
            </div>
            <div>
              <label style={lab}>Motivo (opcional)</label>
              <input type="text" maxLength={200} style={inputStyle} value={dmgNote} onChange={(e) => setDmgNote(e.target.value)} />
            </div>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={danificar}>Registar danificadas</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={fecharLinha}>Fechar linha</button>
          </div>
          <button type="button" className="btn btn-primary" disabled={busy} style={{ marginTop: "1rem" }} onClick={confirmar}>
            {busy ? "A guardar..." : "Confirmar recepção"}
          </button>
        </div>
      )}
    </div>
  );
}