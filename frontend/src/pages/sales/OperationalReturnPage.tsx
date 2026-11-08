import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getSaleById, getSales } from "../../services/saleService";
import { getReturns, createReturn } from "../../services/returnService";
import { useDataChanged } from "../../offline/dataChanged";
import { returnedQtyBySaleLine, refundedBySale, saleReturnState } from "../../utils/refundStatus";
import { formatDateTime } from "../../utils/formatDate";
import type { Sale } from "../../types/sales";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ScrollTable from "../../components/ui/ScrollTable";

export default function OperationalReturnPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returnedSaleIds, setReturnedSaleIds] = useState<Set<string>>(new Set()); const [returnsAll, setReturnsAll] = useState<any[]>([]); const [returnedQty, setReturnedQty] = useState<Map<string, number>>(new Map());
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<{ saleLineId: string; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tick, setTick] = useState(0);
  useDataChanged(() => { if (!saleId) setTick((t) => t + 1); });
  
  const [dateFilter, setDateFilter] = useState<"ALL" | "DAILY">("DAILY");

  useEffect(() => {
    if (saleId) {
      setLoading(true);
      Promise.all([getSaleById(saleId), getReturns({ page: 1, limit: 100 })]).then(([s, rr]) => { const qty = returnedQtyBySaleLine((rr.data as any[]).filter((x: any) => x.saleId === saleId)); setReturnedQty(qty);
          setSale(s);
          setLines((s.lines ?? []).filter((l) => Number(l.quantity) - (qty.get(l.id) ?? 0) > 0).map((l) => ({ saleLineId: l.id, quantity: 0 })));
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      if (tick === 0) setLoading(true);
      Promise.all([
        getSales({ limit: 100, status: "CONFIRMED" }),
        getReturns({ page: 1, limit: 100 })
      ])
        .then(([salesRes, returnsRes]) => {
          setSales(salesRes.data);
          { const qm = returnedQtyBySaleLine(returnsRes.data); const full = new Set<string>(); for (const s of salesRes.data as any[]) { if (saleReturnState(s, qm) === "FULL") full.add(s.id); } setReturnedSaleIds(full); setReturnsAll(returnsRes.data); }
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, [saleId, tick]);

  function updateLineQty(saleLineId: string, qty: number) {
    setLines((prev) => prev.map((l) => l.saleLineId === saleLineId ? { ...l, quantity: Number.isFinite(qty) && qty > 0 ? qty : 0 } : l));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!saleId || !reason.trim()) return toast.error("Motivo é obrigatório."); const chosen = lines.filter((l) => l.quantity > 0); if (chosen.length === 0) { const f = e.currentTarget as HTMLFormElement; const first = Array.from(f.querySelectorAll<HTMLInputElement>("input[data-qty]")).find((i) => !i.value) ?? f.querySelector<HTMLInputElement>("input[data-qty]"); if (first) { first.setCustomValidity("Preencha a quantidade a devolver."); first.reportValidity(); } else { toast.error("Indique a quantidade a devolver."); } return; } for (const c of chosen) { const sl = (sale?.lines ?? []).find((x) => x.id === c.saleLineId); const max = sl ? Number(sl.quantity) - (returnedQty.get(sl.id) ?? 0) : 0; if (c.quantity > max) return toast.error("Quantidade acima do vendido: o m\u00e1ximo para " + (sl?.product?.name ?? "este produto") + " \u00e9 " + max + "."); }
    setSubmitting(true);
    try {
      const draft = await createReturn({
        saleId,
        reason: reason.trim(),
        lines: lines.filter((l) => l.quantity > 0),
      });
      toast.success("Devolução criada. Aguarda confirmação.");
      navigate(`/pos/devolucoes/${draft.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao criar devolução.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Erro ao carregar dados." onRetry={() => window.location.reload()} />;

  if (!saleId) {
    // Filtrar vendas por data e excluir canceladas
    let filteredSales = sales.filter(s => s.status !== "CANCELLED");
    
    if (dateFilter === "DAILY") {
      const todayStr = new Date().toLocaleDateString("pt-PT");
      filteredSales = filteredSales.filter(s => new Date(s.createdAt).toLocaleDateString("pt-PT") === todayStr);
    }

    // Remover vendas já devolvidas
    filteredSales = filteredSales.filter(s => !returnedSaleIds.has(s.id)); const qtyAll = returnedQtyBySaleLine(returnsAll); const refAll = refundedBySale(returnsAll); const remainingOf = (l: any) => Number(l.quantity) - (qtyAll.get(l.id) ?? 0);

    return (
      <div>
        <PageHeader
          title="Devoluções"
          actions={
            <button
              onClick={() => setDateFilter(dateFilter === "DAILY" ? "ALL" : "DAILY")}
              className="btn btn-secondary"
            >
              {dateFilter === "DAILY" ? "Ver Tudo" : "Ver Hoje"}
            </button>
          }
        />
        
        {filteredSales.length === 0 ? (
          <EmptyState message={dateFilter === "DAILY" ? "Nenhuma venda disponível para devolução hoje." : "Nenhuma venda disponível para devolução."} />
        ) : (
          <><p style={{ marginBottom: "0.75rem", color: "#64748b" }}>Seleccione a venda que deseja devolver:</p>
          <ScrollTable>
            <table className="table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Produtos</th>
                  <th>Data</th>
                  <th>Total</th>
                  <th>Acção</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.saleNumber}</td>
                    <td>{(s.lines ?? []).filter((l: any) => remainingOf(l) > 0).map((l: any) => (l.product?.name ?? "") + (remainingOf(l) > 1 ? " (x" + remainingOf(l) + ")" : "")).join(", ")}</td>
                    <td>{formatDateTime(s.createdAt)}</td>
                    <td>{Math.max(0, parseFloat(s.total) - (refAll.get(s.id) ?? 0)).toFixed(2)} MT</td>
                    <td>
                      <Link to={`/pos/devolucoes/nova/${s.id}`} className="btn btn-primary" style={{ padding: "0.25rem 0.75rem" }}>
                        Selecionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable></>
        )}
      </div>
    );
  }

  if (!sale) return <ErrorState message="Venda não encontrada." onRetry={() => navigate("/pos/devolucoes")} />;

  return (
    <div>
      <PageHeader title={`Nova Devolução — ${sale.saleNumber}`} />
      <form onSubmit={handleSubmit} className="card" style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Motivo</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} required className="input" style={{ width: "100%", marginBottom: "1.5rem" }} />

        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Linhas a devolver</h3>
        {(sale.lines ?? []).filter((line) => Number(line.quantity) - (returnedQty.get(line.id) ?? 0) > 0).map((line) => (
          <div key={line.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid #e2e8f0" }}>
            <span>{line.product?.name ?? line.productId.substring(0, 8)}</span>
            <span>{Number(line.quantity) - (returnedQty.get(line.id) ?? 0)} x {parseFloat(line.unitPrice).toFixed(2)} MT</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <input
              type="number"
              min="1" data-qty="1"
              max={Number(line.quantity) - (returnedQty.get(line.id) ?? 0)}
              value={(lines.find((l) => l.saleLineId === line.id)?.quantity ?? 0) || ""}
              onChange={(e) => { e.target.setCustomValidity(""); updateLineQty(line.id, parseInt(e.target.value, 10)); }}
              className="input"
              style={{ width: "80px", textAlign: "center" }}
            />
            <small style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.25rem" }}>Quantidade a devolver</small>
            </div>
          </div>
        ))}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem", marginTop: "1.5rem" }}>
          {submitting ? "A guardar…" : "Criar Devolução"}
        </button>
      </form>
    </div>
  );
}

