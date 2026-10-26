import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSales } from "../../services/saleService";
import { formatDateTime } from "../../utils/formatDate";
import { getReturns } from "../../services/returnService";
import type { Sale, SaleStatus, PaginatedMeta } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { canCreateSales } from "../../utils/permissions";

interface Props {
  hideNewSaleButton?: boolean;
  isOperational?: boolean;
}

type DateFilter = "ALL" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

export default function SaleListPage({ hideNewSaleButton = false, isOperational = false }: Props) {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [returnedSaleIds, setReturnedSaleIds] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "RETURNED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filtros de data
  const [dateFilter, setDateFilter] = useState<DateFilter>(isOperational ? "DAILY" : "ALL");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  function load() {
    setLoading(true);
    setError(false);
    
    Promise.all([
      getSales({ page, limit: 100 }),
      getReturns({ page: 1, limit: 100 }),
    ])
      .then(([salesRes, returnsRes]) => {
        setSales(salesRes.data);
        setMeta(salesRes.meta);
        const ids = new Set<string>();
        returnsRes.data.forEach((r) => {
          if (r.status === "CONFIRMED" || r.status === "COMPLETED") {
            ids.add(r.saleId);
          }
        });
        setReturnedSaleIds(ids);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function statusBadge(status: SaleStatus) {
    const map = {
      DRAFT: { bg: "#fef08a", color: "#854d0e", label: "Rascunho" },
      CONFIRMED: { bg: "#dcfce7", color: "#166534", label: "Concluída" },
      CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelada" },
    };
    const cfg = map[status] || { bg: "#e5e7eb", color: "#374151", label: status };
    return (
      <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    );
  }

  // --- LÓGICA DE FILTRAGEM ---
  let filteredSales = sales;
  if (statusFilter === "CONFIRMED") {
    filteredSales = filteredSales.filter((s) => !returnedSaleIds.has(s.id) && s.status === "CONFIRMED");
  } else if (statusFilter === "RETURNED") {
    filteredSales = filteredSales.filter((s) => returnedSaleIds.has(s.id));
  }

  const now = new Date();
  if (dateFilter === "DAILY") {
    const todayStr = now.toLocaleDateString("pt-PT");
    filteredSales = filteredSales.filter(s => new Date(s.createdAt).toLocaleDateString("pt-PT") === todayStr);
  } else if (dateFilter === "WEEKLY") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    filteredSales = filteredSales.filter(s => new Date(s.createdAt) >= startOfWeek);
  } else if (dateFilter === "MONTHLY") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredSales = filteredSales.filter(s => new Date(s.createdAt) >= startOfMonth);
  } else if (dateFilter === "YEARLY") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    filteredSales = filteredSales.filter(s => new Date(s.createdAt) >= startOfYear);
  } else if (dateFilter === "CUSTOM") {
    if (customStart) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      filteredSales = filteredSales.filter(s => new Date(s.createdAt) >= start);
    }
    if (customEnd) {
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      filteredSales = filteredSales.filter(s => new Date(s.createdAt) <= end);
    }
  }

  const totalPeriod = filteredSales.reduce((acc, s) => acc + parseFloat(s.total), 0);
  const totalCount = filteredSales.length;

  if (loading && sales.length === 0) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Vendas"
        actions={
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {!hideNewSaleButton && canCreateSales(user?.permissions) && (
              <Link to="/pos" className="btn btn-primary">+ Nova Venda</Link>
            )}
            {isOperational && (
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => { setPage(1); setStatusFilter(e.target.value as any); }}
                  className="input"
                  style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                >
                  <option value="ALL">Todos</option>
                  <option value="CONFIRMED">Concluída</option>
                  <option value="RETURNED">Reembolsada</option>
                </select>
                <button
                  onClick={() => setDateFilter(dateFilter === "DAILY" ? "ALL" : "DAILY")}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
                >
                  {dateFilter === "DAILY" ? "Ver Tudo" : "Ver Hoje"}
                </button>
              </>
            )}
          </div>
        }
      />

      {/* BARRA DE FILTROS (apenas para administração) */}
      {!isOperational && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
          
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value as any); }}
              className="input"
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            >
              <option value="ALL">Todos</option>
              <option value="CONFIRMED">Concluída</option>
              <option value="RETURNED">Reembolsada</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Período</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="input"
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            >
              <option value="ALL">Tudo</option>
              <option value="DAILY">Hoje</option>
              <option value="WEEKLY">Esta Semana</option>
              <option value="MONTHLY">Este Mês</option>
              <option value="YEARLY">Este Ano</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
          </div>

          {dateFilter === "CUSTOM" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Início</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input" style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Fim</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input" style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
              </div>
            </>
          )}

          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Total no Período</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#166534" }}>{totalPeriod.toFixed(2)} MT</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{totalCount} vendas</div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA TABELA OU MENSAGEM VAZIA */}
      {filteredSales.length === 0 ? (
        <div className="card" style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
          <p style={{ fontSize: "1.1rem", margin: 0 }}>Nenhuma venda encontrada para este filtro.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => {
                const isReturned = returnedSaleIds.has(s.id);
                return (
                  <tr key={s.id}>
                    <td>{s.saleNumber}</td>
                    <td>{formatDateTime(s.createdAt)}</td>
                    <td>{parseFloat(s.total).toFixed(2)} MT</td>
                    <td>
                      {isReturned ? (
                        <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: "#fef3c7", color: "#92400e" }}>
                          Reembolsada
                        </span>
                      ) : (
                        statusBadge(s.status)
                      )}
                    </td>
                    <td>
                      <Link 
                        to={isOperational ? `/pos/historico/${s.id}` : `/vendas/${s.id}`} 
                        style={{ color: "#2563eb", textDecoration: "underline" }}
                      >
                        Ver Detalhe
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && filteredSales.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-secondary" style={{ opacity: page <= 1 ? 0.5 : 1 }}>
            Anterior
          </button>
          <span style={{ color: "#6b7280" }}>Página {meta.page} de {meta.totalPages} — {meta.total} registos</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="btn btn-secondary" style={{ opacity: page >= meta.totalPages ? 0.5 : 1 }}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}




