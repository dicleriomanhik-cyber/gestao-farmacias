import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getSaleById, getSales } from "../../services/saleService";
import { getReturns, createReturn } from "../../services/returnService";
import { formatDateTime } from "../../utils/formatDate";
import type { Sale } from "../../types/sales";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";

export default function OperationalReturnPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returnedSaleIds, setReturnedSaleIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<{ saleLineId: string; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [dateFilter, setDateFilter] = useState<"ALL" | "DAILY">("DAILY");

  useEffect(() => {
    if (saleId) {
      setLoading(true);
      getSaleById(saleId)
        .then((s) => {
          setSale(s);
          setLines((s.lines ?? []).map((l) => ({ saleLineId: l.id, quantity: 1 })));
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      Promise.all([
        getSales({ limit: 100, status: "CONFIRMED" }),
        getReturns({ page: 1, limit: 100 })
      ])
        .then(([salesRes, returnsRes]) => {
          setSales(salesRes.data);
          const ids = new Set<string>();
          returnsRes.data.forEach((r) => {
            if (r.status === "CONFIRMED" || r.status === "COMPLETED" || r.status === "DRAFT") {
              ids.add(r.saleId);
            }
          });
          setReturnedSaleIds(ids);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, [saleId]);

  function updateLineQty(saleLineId: string, qty: number) {
    setLines((prev) => prev.map((l) => l.saleLineId === saleLineId ? { ...l, quantity: Math.max(1, qty) } : l));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!saleId || !reason.trim()) return toast.error("Motivo é obrigatório.");
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
    filteredSales = filteredSales.filter(s => !returnedSaleIds.has(s.id));

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
          <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
            <p style={{ marginBottom: "1rem", color: "#64748b" }}>Selecione a venda que deseja devolver:</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Produtos</th>
                  <th>Data</th>
                  <th>Total</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.saleNumber}</td>
                    <td>{(s.lines ?? []).map((l) => l.product?.name ?? "").join(", ")}</td>
                    <td>{formatDateTime(s.createdAt)}</td>
                    <td>{parseFloat(s.total).toFixed(2)} MT</td>
                    <td>
                      <Link to={`/pos/devolucoes/nova/${s.id}`} className="btn btn-primary" style={{ padding: "0.25rem 0.75rem" }}>
                        Selecionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (!sale) return <ErrorState message="Venda não encontrada." onRetry={() => navigate("/pos/devolucoes")} />;

  return (
    <div>
      <PageHeader title={`Nova Devolução — ${sale.saleNumber}`} />
      <form onSubmit={handleSubmit} className="card" style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Motivo *</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} required className="input" style={{ width: "100%", marginBottom: "1.5rem" }} />

        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Linhas a devolver</h3>
        {(sale.lines ?? []).map((line) => (
          <div key={line.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid #e2e8f0" }}>
            <span>{line.product?.name ?? line.productId.substring(0, 8)}</span>
            <span>{line.quantity} x {parseFloat(line.unitPrice).toFixed(2)} MT</span>
            <input
              type="number"
              min="1"
              max={line.quantity}
              value={lines.find((l) => l.saleLineId === line.id)?.quantity ?? 1}
              onChange={(e) => updateLineQty(line.id, parseInt(e.target.value, 10))}
              className="input"
              style={{ width: "80px", textAlign: "center" }}
            />
          </div>
        ))}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem", marginTop: "1.5rem" }}>
          {submitting ? "A guardar…" : "Criar Devolução"}
        </button>
      </form>
    </div>
  );
}

