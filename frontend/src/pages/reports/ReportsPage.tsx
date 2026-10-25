import { useEffect, useState, useMemo } from "react";
import { getReportSales, getReportExpenses, getReportStock } from "../../services/reportService";
import { getReturns } from "../../services/returnService";
import type { ReportSalesData, ReportExpensesData, ReportStockData } from "../../types/reports";
import type { SaleReturn } from "../../types/returns";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { canAccessFinancialReports } from "../../utils/permissions";

type Period = "day" | "week" | "month" | "year";

function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "0.00";
  return parseFloat(String(v)).toFixed(2);
}

function startOfPeriod(period: Period): Date {
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<ReportSalesData | null>(null);
  const [expenses, setExpenses] = useState<ReportExpensesData | null>(null);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [stock, setStock] = useState<ReportStockData | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canFinancial = canAccessFinancialReports(user?.permissions);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      getReportSales(),
      canFinancial ? getReportExpenses() : Promise.resolve(null),
      getReturns({ page: 1, limit: 200 }),
      getReportStock(),
    ])
      .then(([sa, e, r, st]) => {
        setSales(sa);
        setExpenses(e);
        setReturns(r.data);
        setStock(st);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useMemo(() => startOfPeriod(period), [period]);

  const filteredSales = sales?.sales.filter((s) => new Date(s.createdAt) >= start) ?? [];
  const filteredExpenses = expenses?.expenses.filter((e) => new Date(e.expenseDate) >= start) ?? [];
  const filteredReturns = returns.filter((r) => new Date(r.createdAt) >= start);

  const totalSales = filteredSales.reduce((acc, s) => acc + parseFloat(s.total), 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + parseFloat(s.paid), 0);
  const totalPending = filteredSales.reduce((acc, s) => acc + parseFloat(s.pending), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const totalReturns = filteredReturns.reduce((acc, r) => acc + parseFloat(r.totalRefund), 0);

  const periodLabels: Record<Period, string> = {
    day: "Hoje",
    week: "Esta Semana",
    month: "Este Mês",
    year: "Este Ano",
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os relatórios." onRetry={load} />;

  return (
    <div>
      <PageHeader title="Relatórios" />

      <div className="card" style={{ padding: "0.75rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <label style={{ fontWeight: 500 }}>Período:</label>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="input" style={{ width: "auto" }}>
          <option value="day">Hoje</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mês</option>
          <option value="year">Este Ano</option>
        </select>
        <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
          {periodLabels[period]} — {filteredSales.length} vendas, {filteredExpenses.length} despesas, {filteredReturns.length} devoluções
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Vendas</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#166534" }}>{money(totalSales)} MT</p>
          <small style={{ color: "#6b7280" }}>{filteredSales.length} vendas</small>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Pago</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1e40af" }}>{money(totalPaid)} MT</p>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Pendente</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: totalPending > 0 ? "#ca8a04" : "#166534" }}>{money(totalPending)} MT</p>
        </div>
        {canFinancial && (
          <div className="card" style={{ padding: "1rem" }}>
            <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Despesas</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#b91c1c" }}>{money(totalExpenses)} MT</p>
            <small style={{ color: "#6b7280" }}>{filteredExpenses.length} despesas</small>
          </div>
        )}
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Devoluções</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#b45309" }}>{money(totalReturns)} MT</p>
          <small style={{ color: "#6b7280" }}>{filteredReturns.length} devoluções</small>
        </div>
        {stock && (
          <div className="card" style={{ padding: "1rem" }}>
            <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Lotes a Expirar</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: stock.summary.expiredLotsCount > 0 ? "#b91c1c" : "#166534" }}>
              {stock.summary.expiredLotsCount}
            </p>
            <small style={{ color: "#6b7280" }}>A expirar: {stock.summary.nearExpiryLotsCount}</small>
          </div>
        )}
      </div>

      {filteredSales.length > 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Vendas do Período</h2>
          <table className="table">
            <thead><tr><th>Nº</th><th>Data</th><th>Total</th><th>Pago</th><th>Pendente</th></tr></thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.saleNumber}</td>
                  <td>{new Date(s.createdAt).toLocaleDateString("pt-PT")}</td>
                  <td>{money(s.total)} MT</td>
                  <td>{money(s.paid)} MT</td>
                  <td style={{ color: s.pending !== "0.00" ? "#ca8a04" : "#166534" }}>{money(s.pending)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredReturns.length > 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Devoluções do Período</h2>
          <table className="table">
            <thead><tr><th>Nº</th><th>Venda</th><th>Motivo</th><th>Data</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {filteredReturns.map((r) => (
                <tr key={r.id}>
                  <td>{r.returnNumber}</td>
                  <td>{r.sale?.saleNumber ?? "—"}</td>
                  <td>{r.reason}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString("pt-PT")}</td>
                  <td>{money(r.totalRefund)} MT</td>
                  <td>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      backgroundColor: r.status === "DRAFT" ? "#fef08a" : r.status === "CONFIRMED" ? "#dbeafe" : "#dcfce7",
                      color: r.status === "DRAFT" ? "#854d0e" : r.status === "CONFIRMED" ? "#1e40af" : "#166534",
                    }}>
                      {r.status === "DRAFT" ? "Rascunho" : r.status === "CONFIRMED" ? "Confirmada" : "Concluída"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canFinancial && filteredExpenses.length > 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Despesas do Período</h2>
          <table className="table">
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th>Valor</th></tr></thead>
            <tbody>
              {filteredExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.expenseDate).toLocaleDateString("pt-PT")}</td>
                  <td>{e.description}</td>
                  <td>{e.category}</td>
                  <td>{e.method}</td>
                  <td>{money(e.amount)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stock && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Stock</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <span><strong>Produtos:</strong> {stock.summary.totalProducts}</span>
            <span><strong>Lotes:</strong> {stock.summary.totalLots}</span>
            <span><strong>Valor:</strong> {money(stock.summary.totalStockValue)} MT</span>
            <span><strong>Expirados:</strong> {stock.summary.expiredLotsCount}</span>
          </div>
          <table className="table">
            <thead><tr><th>Produto</th><th>Disponível</th><th>Valor</th></tr></thead>
            <tbody>
              {stock.products.map((p) => (
                <tr key={p.productId}>
                  <td>{p.productName}</td>
                  <td>{p.totalAvailable}</td>
                  <td>{money(p.totalValue)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
