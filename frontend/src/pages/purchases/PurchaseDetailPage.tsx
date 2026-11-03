import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cancelPurchase, confirmPurchase, getPurchaseById, updatePurchase } from "../../services/purchaseService";
import { createSupplierPayment } from "../../services/supplierPaymentService";
import { getSettings } from "../../services/settingsService";
import type { Purchase } from "../../types/purchases";
import type { PharmacySettings } from "../../types/settings";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import Badge from "../../components/suppliers/Badge";
import PaidFromFields from "../../components/suppliers/PaidFromFields";
import { useToast } from "../../contexts/ToastContext";
import { METHOD_LABEL, PAID_FROM_LABEL, apiError, fmtDate, fmtMoney, fmtMt, num } from "../../utils/supplierFormat";

const labelStyle = { display: "block", marginBottom: "0.5rem", fontWeight: 500 } as const;
const sectionTitle = { fontSize: "1.1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" } as const;
const boxStyle = { border: "1px solid #e2e8f0", borderRadius: 8, padding: "1rem", marginTop: "1rem" } as const;

export default function PurchaseDetailPage() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cfFrom, setCfFrom] = useState("");
  const [cfMethod, setCfMethod] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payFrom, setPayFrom] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [transport, setTransport] = useState("");
  const [others, setOthers] = useState("");
  const [invoice, setInvoice] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");

  function fill(p: Purchase) {
    setTransport(String(num(p.transportCost)));
    setOthers(String(num(p.otherCosts)));
    setInvoice(p.invoiceTotal === null || p.invoiceTotal === undefined ? "" : String(num(p.invoiceTotal)));
    setDue(p.dueDate ? p.dueDate.slice(0, 10) : "");
    setNotes(p.notes ?? "");
    setPayAmount(String(num(p.outstanding)));
  }

  function load(silent = false) {
    if (!purchaseId) return;
    if (!silent) setLoading(true);
    setError(false);
    Promise.all([getPurchaseById(purchaseId), getSettings().catch(() => null)])
      .then(([p, s]) => {
        setPurchase(p);
        setSettings(s);
        fill(p);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId]);

  async function handleConfirm() {
    if (!purchaseId || !purchase) return;
    const needsPay = purchase.paymentStatus === "PAID";
    if (needsPay && (!cfFrom || !cfMethod)) return toast.error("Indica com o que foi paga a compra.");
    setBusy(true);
    try {
      await confirmPurchase(purchaseId, needsPay ? { paidFrom: cfFrom, method: cfMethod } : undefined);
      toast.success("Compra confirmada.");
      load(true);
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao confirmar compra."));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!purchaseId) return;
    if (!window.confirm("Tens a certeza que queres cancelar esta compra?")) return;
    setBusy(true);
    try {
      await cancelPurchase(purchaseId);
      toast.success("Compra cancelada.");
      load(true);
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao cancelar compra."));
    } finally {
      setBusy(false);
    }
  }

  async function saveCosts() {
    if (!purchaseId) return;
    setBusy(true);
    try {
      await updatePurchase(purchaseId, {
        transportCost: parseFloat(transport) || 0,
        otherCosts: parseFloat(others) || 0,
        invoiceTotal: invoice.trim() === "" ? null : parseFloat(invoice),
        notes: notes.trim() === "" ? null : notes.trim(),
        ...(settings?.usePayables ? { dueDate: due || null } : {}),
      });
      toast.success("Custos guardados.");
      load(true);
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao guardar os custos."));
    } finally {
      setBusy(false);
    }
  }

  async function savePayment() {
    if (!purchaseId) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return toast.error("Indica o valor do pagamento.");
    if (!payFrom || !payMethod) return toast.error("Indica com o que pagas.");
    setBusy(true);
    try {
      await createSupplierPayment({ purchaseId, amount, paidFrom: payFrom, method: payMethod });
      toast.success("Pagamento registado.");
      setPayFrom("");
      setPayMethod("");
      load(true);
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao registar o pagamento."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a compra." onRetry={() => load()} />;
  if (!purchase) return <ErrorState message="Compra não encontrada." onRetry={() => navigate("/fornecedores/compras")} />;

  const cur = purchase.currency;
  const conf = purchase.conference;
  const boxes = purchase.boxes ?? [];
  const lines = purchase.lines ?? [];
  const payments = purchase.supplierPayments ?? [];
  const allowCash = settings?.allowCashExpenses ?? true;
  const outstanding = num(purchase.outstanding);
  const canPay = purchase.status === "CONFIRMED" && purchase.paymentStatus !== "PAID" && outstanding > 0.005;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>Compra {purchase.documentNumber}</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {settings?.usePayables && <Badge kind="payment" value={purchase.paymentStatus} />}
          <Badge kind="purchase" value={purchase.status} />
        </div>
      </div>

      <p>
        <strong>Fornecedor:</strong>{" "}
        {purchase.supplier ? (
          <Link to={`/fornecedores/${purchase.supplierId}`} style={{ color: "#2563eb", textDecoration: "none" }}>{purchase.supplier.name}</Link>
        ) : "—"}
      </p>
      <p><strong>Data:</strong> {fmtDate(purchase.purchaseDate)}</p>
      {purchase.dueDate && <p><strong>Data limite:</strong> {fmtDate(purchase.dueDate)}</p>}

      {conf && conf.invoiceTotal !== null && conf.matches === false && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#78350f", borderRadius: 8, padding: "0.75rem 1rem", margin: "1rem 0" }}>
          A soma das caixas ({fmtMoney(conf.goodsTotal, cur)}) não bate com o total da fatura ({fmtMoney(conf.invoiceTotal, cur)}). Diferença: {fmtMoney(conf.diff, cur)}.
        </div>
      )}
      {conf && conf.invoiceTotal !== null && conf.matches === true && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", borderRadius: 8, padding: "0.75rem 1rem", margin: "1rem 0" }}>
          A soma das caixas bate com o total da fatura.
        </div>
      )}

      <h2 style={sectionTitle}>Valores</h2>
      <table className="table">
        <tbody>
          <tr><td>Mercadoria (soma das caixas e linhas)</td><td style={{ textAlign: "right" }}>{fmtMoney(purchase.totalAmount, cur)}</td></tr>
          <tr><td>Transporte</td><td style={{ textAlign: "right" }}>{fmtMoney(purchase.transportCost, cur)}</td></tr>
          <tr><td>Outros custos</td><td style={{ textAlign: "right" }}>{fmtMoney(purchase.otherCosts, cur)}</td></tr>
          {cur !== "MZN" && <tr><td>Câmbio</td><td style={{ textAlign: "right" }}>{num(purchase.exchangeRate)}</td></tr>}
          <tr><td><strong>Total a pagar</strong></td><td style={{ textAlign: "right" }}><strong>{fmtMt(purchase.dueMzn)}</strong></td></tr>
          <tr><td>Pago</td><td style={{ textAlign: "right" }}>{fmtMt(purchase.paidTotal)}</td></tr>
          <tr><td>Em dívida</td><td style={{ textAlign: "right" }}>{fmtMt(purchase.outstanding)}</td></tr>
        </tbody>
      </table>

      <h2 style={sectionTitle}>Caixas</h2>
      {boxes.length === 0 ? (
        <div style={{ color: "#64748b" }}>Ainda sem caixas registadas nesta compra.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>QR Code</th>
              <th>Produto</th>
              <th>Unidades</th>
              <th>Custo de aquisição</th>
            </tr>
          </thead>
          <tbody>
            {boxes.map((b) => (
              <tr key={b.id}>
                <td>{b.qrCode}</td>
                <td>{b.product?.name ?? "—"}</td>
                <td>{b.totalUnits}</td>
                <td>{fmtMoney(b.acquisitionCost, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {purchase.status === "DRAFT" && (
        <button type="button" className="btn btn-secondary" style={{ marginTop: "0.75rem" }} onClick={() => navigate(`/stock/caixas/nova?compra=${purchase.id}`)}>
          + Registar caixa nesta compra
        </button>
      )}

      {lines.length > 0 && (
        <>
          <h2 style={sectionTitle}>Linhas</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Custo Unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.product?.name ?? "—"}</td>
                  <td>{line.quantity}</td>
                  <td>{fmtMoney(line.unitCost, cur)}</td>
                  <td>{fmtMoney(line.subtotal, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {purchase.status !== "CANCELLED" && (
        <div style={boxStyle}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Custos e fatura</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Transporte</label>
              <input type="number" min="0" step="0.01" className="input" value={transport} onChange={(e) => setTransport(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Outros custos</label>
              <input type="number" min="0" step="0.01" className="input" value={others} onChange={(e) => setOthers(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Total da fatura</label>
              <input type="number" min="0" step="0.01" className="input" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
            </div>
          </div>
          {settings?.usePayables && (
            <div style={{ maxWidth: "260px", marginBottom: "1rem" }}>
              <label style={labelStyle}>Data limite</label>
              <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Notas</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={saveCosts}>Guardar custos</button>
        </div>
      )}

      {purchase.status === "DRAFT" && (
        <div style={boxStyle}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Confirmar compra</div>
          {purchase.paymentStatus === "PAID" ? (
            <PaidFromFields
              paidFrom={cfFrom}
              method={cfMethod}
              allowCash={allowCash}
              onChange={(f, m) => {
                setCfFrom(f);
                setCfMethod(m);
              }}
            />
          ) : (
            <div style={{ color: "#64748b" }}>Compra a prazo: o pagamento regista-se depois da confirmação.</div>
          )}
          {num(purchase.totalAmount) <= 0 && (
            <div style={{ color: "#b91c1c", marginTop: "0.75rem" }}>Regista pelo menos uma caixa antes de confirmar.</div>
          )}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button onClick={handleConfirm} disabled={busy || num(purchase.totalAmount) <= 0} className="btn btn-success" style={{ flex: 1, padding: "0.75rem" }}>
              {busy ? "A processar…" : "Confirmar Compra"}
            </button>
            <button onClick={handleCancel} disabled={busy} className="btn btn-danger" style={{ flex: 1, padding: "0.75rem" }}>
              {busy ? "A processar…" : "Cancelar Compra"}
            </button>
          </div>
        </div>
      )}

      {canPay && (
        <div style={boxStyle}>
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Registar pagamento (em dívida: {fmtMt(outstanding)})</div>
          <div style={{ maxWidth: "260px", marginBottom: "1rem" }}>
            <label style={labelStyle}>Valor (MT)</label>
            <input type="number" min="0" step="0.01" className="input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </div>
          <PaidFromFields
            paidFrom={payFrom}
            method={payMethod}
            allowCash={allowCash}
            onChange={(f, m) => {
              setPayFrom(f);
              setPayMethod(m);
            }}
          />
          <button type="button" className="btn btn-primary" disabled={busy} style={{ marginTop: "1rem" }} onClick={savePayment}>
            {busy ? "A processar…" : "Registar pagamento"}
          </button>
        </div>
      )}

      {payments.length > 0 && (
        <>
          <h2 style={sectionTitle}>Pagamentos</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor</th>
                <th>Pago com</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.paidAt)}</td>
                  <td>{fmtMt(p.amount)}</td>
                  <td>{PAID_FROM_LABEL[p.paidFrom] ?? p.paidFrom}</td>
                  <td>{METHOD_LABEL[p.method] ?? p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {purchase.status === "CONFIRMED" && (
        <div style={{ marginTop: "1.5rem" }}>
          <button onClick={handleCancel} disabled={busy} className="btn btn-danger" style={{ width: "100%", padding: "0.75rem" }}>
            {busy ? "A processar…" : "Cancelar Compra"}
          </button>
        </div>
      )}
    </div>
  );
}