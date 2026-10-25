import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getReturnById, confirmReturn, inspectReturnLine, createRefund } from "../../services/returnService";
import { getSalePayments } from "../../services/saleService";
import type { SaleReturn, ReturnLineCondition } from "../../types/returns";
import type { Payment } from "../../types/sales";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [ret, setRet] = useState<SaleReturn | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [inspectLine, setInspectLine] = useState<string | null>(null);
  const [condition, setCondition] = useState<ReturnLineCondition>("RESELLABLE");
  const [quantityToRelease, setQuantityToRelease] = useState(1);
  const [refundMethod, setRefundMethod] = useState<"CASH" | "CARD" | "MPESA" | "EMOLA">("CASH");
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [selectedLine, setSelectedLine] = useState<string>("");

  function load() {
    if (!id) return;
    setLoading(true);
    setError(false);
    getReturnById(id)
      .then(async (r) => {
        setRet(r);
        if (r.saleId) {
          try {
            const p = await getSalePayments(r.saleId);
            setPayments(p);
            if (p.length > 0) setSelectedPayment(p[0].id);
          } catch {
            setPayments([]);
          }
        }
        if (r.lines && r.lines.length > 0) {
          setSelectedLine(r.lines[0].id);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function handleConfirm() {
    if (!id) return;
    setActionLoading(true);
    try {
      await confirmReturn(id);
      toast.success("Devolução confirmada. Artigos em quarentena.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao confirmar.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInspect() {
    if (!id || !inspectLine) return;
    setActionLoading(true);
    try {
      await inspectReturnLine(id, inspectLine, { condition, quantityToRelease });
      toast.success("Inspeção registada.");
      setInspectLine(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao inspecionar.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefund() {
    if (!id || !ret || !selectedLine || !selectedPayment) {
      return toast.error("Selecione a linha e o pagamento original.");
    }
    setActionLoading(true);
    try {
      await createRefund(id, {
        returnLineId: selectedLine,
        salePaymentId: selectedPayment,
        method: refundMethod,
        amount: parseFloat(ret.lines?.find(l => l.id === selectedLine)?.subtotal ?? ret.totalRefund),
      });
      toast.success("Reembolso registado.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao reembolsar.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Devolução não encontrada." onRetry={() => window.location.reload()} />;
  if (!ret) return <ErrorState message="Devolução não encontrada." onRetry={() => window.location.reload()} />;

  return (
    <div>
      <PageHeader title={`Devolução ${ret.returnNumber}`} actions={<Link to="/devolucoes" className="btn btn-secondary">Voltar</Link>} />

      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <p><strong>Venda:</strong> {ret.sale?.saleNumber ?? "—"}</p>
        <p><strong>Motivo:</strong> {ret.reason}</p>
        <p><strong>Total Reembolso:</strong> {parseFloat(ret.totalRefund).toFixed(2)} MT</p>
        <p><strong>Estado:</strong> {ret.status}</p>
      </div>

      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Linhas</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Condição</th>
              <th>Libertado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {(ret.lines ?? []).map((line) => (
              <tr key={line.id}>
                <td>{line.product?.name ?? line.productId.substring(0, 8)}</td>
                <td>{line.quantity}</td>
                <td>{line.condition ?? "PENDING_INSPECTION"}</td>
                <td>{line.quantityReleased}</td>
                <td>
                  {ret.status === "CONFIRMED" && (!line.condition) && (
                    <button onClick={() => setInspectLine(line.id)} className="btn btn-warning" style={{ padding: "0.25rem 0.5rem" }}>Inspecionar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inspectLine && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Inspecionar Linha</h3>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Condição:</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value as ReturnLineCondition)} className="input" style={{ marginBottom: "1rem" }}>
            <option value="RESELLABLE">Reutilizável</option>
            <option value="DAMAGED">Danificado</option>
            <option value="EXPIRED">Expirado</option>
            <option value="LOST">Perdido</option>
          </select>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Quantidade a libertar:</label>
          <input type="number" min="1" value={quantityToRelease} onChange={(e) => setQuantityToRelease(parseInt(e.target.value, 10) || 1)} className="input" style={{ marginBottom: "1rem" }} />
          <button onClick={handleInspect} disabled={actionLoading} className="btn btn-primary">{actionLoading ? "A processar…" : "Confirmar Inspeção"}</button>
        </div>
      )}

      {ret.status === "CONFIRMED" && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Reembolso</h3>
          
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Linha a reembolsar:</label>
          <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)} className="input" style={{ marginBottom: "1rem" }}>
            {(ret.lines ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.product?.name ?? l.productId.substring(0, 8)} — {parseFloat(l.subtotal).toFixed(2)} MT</option>
            ))}
          </select>

          <label style={{ display: "block", marginBottom: "0.5rem" }}>Pagamento original:</label>
          <select value={selectedPayment} onChange={(e) => setSelectedPayment(e.target.value)} className="input" style={{ marginBottom: "1rem" }}>
            {payments.map((p) => (
              <option key={p.id} value={p.id}>{p.method} — {parseFloat(p.amount).toFixed(2)} MT</option>
            ))}
          </select>

          <label style={{ display: "block", marginBottom: "0.5rem" }}>Método de reembolso:</label>
          <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)} className="input" style={{ marginBottom: "1rem" }}>
            <option value="CASH">Dinheiro</option>
            <option value="CARD">Cartão</option>
            <option value="MPESA">M-Pesa</option>
            <option value="EMOLA">e-Mola</option>
          </select>

          <button onClick={handleRefund} disabled={actionLoading} className="btn btn-success">{actionLoading ? "A processar…" : "Registar Reembolso"}</button>
        </div>
      )}

      {ret.status === "DRAFT" && (
        <button onClick={handleConfirm} disabled={actionLoading} className="btn btn-success" style={{ width: "100%", padding: "0.75rem", marginTop: "1rem" }}>
          {actionLoading ? "A confirmar…" : "Confirmar Devolução"}
        </button>
      )}
    </div>
  );
}
