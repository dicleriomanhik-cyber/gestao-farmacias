import { useEffect, useState } from "react";
import {
  getReportSummary,
  getReportSales,
  getReportExpenses,
  getReportStock,
} from "../../services/reportService";
import { getReturns } from "../../services/returnService";
import type {
  ReportSummaryData,
  ReportSalesData,
  ReportExpensesData,
  ReportStockData,
} from "../../types/reports";
import type { SaleReturn } from "../../types/returns";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { canAccessFinancialReports } from "../../utils/permissions";

function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "0.00";
  return parseFloat(String(v)).toFixed(2);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReportSummaryData | null>(null);
  const [sales, setSales] = useState<ReportSalesData | null>(null);
  const [expenses, setExpenses] = useState<ReportExpensesData | null>(null);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [stock, setStock] = useState<ReportStockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canFinancial = canAccessFinancialReports(user?.permissions);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      getReportSummary(),
      getReportSales(),
      canFinancial ? getReportExpenses() : Promise.resolve(null),
      getReturns({ page: 1, limit: 100 }),
      getReportStock(),
    ])
      .then(([s, sa, e, r, st]) => {
        setSummary(s);
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os relatórios." onRetry={load} />;

  const returnsTotal = returns.reduce((acc, r) => acc + parseFloat(r.totalRefund), 0);

  return (
    <div>
      <PageHeader title="Relatórios" />

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="card" style={{ padding: "1rem" }}>
            <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Vendas</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#166534" }}>{money(summary.sales.total)} MT</p>
            <small style={{ color: "#6b7280" }}>{summary.sales.count} vendas</small>
          </div>
          {canFinancial && (
            <div className="card" style={{ padding: "1rem" }}>
              <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Despesas</h3>
              <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#b91c1c" }}>{money(summary.expenses.total)} MT</p>
              <small style={{ color: "#6b7280" }}>{summary.expenses.count} despesas</small>
            </div>
          )}
          <div className="card" style={{ padding: "1rem" }}>
            <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Devoluções</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#b45309" }}>{money(returnsTotal)} MT</p>
            <small style={{ color: "#6b7280" }}>{returns.length} devoluções</small>
          </div>
          <div className="card" style={{ padding: "1rem" }}>
            <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Lotes a Expirar</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: summary.stock.expiredLotsCount > 0 ? "#b91c1c" : "#166534" }}>
              {summary.stock.expiredLotsCount}
            </p>
            <small style={{ color: "#6b7280" }}>Stock baixo: {summary.stock.lowStockCount}</small>
          </div>
        </div>
      )}

      {returns.length > 0 && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Devoluções</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Venda</th>
                <th>Motivo</th>
                <th>Data</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.returnNumber}</td>
                  <td>{r.sale?.saleNumber ?? "—"}</td>
                  <td>{r.reason}</td>
                  <td>{new Date(r.createdAt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</td>
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

      {canFinancial && expenses && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Despesas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <span><strong>Total:</strong> {money(expenses.summary.total)} MT</span>
            <span><strong>Dinheiro:</strong> {money(expenses.summary.cashTotal)} MT</span>
            <span><strong>Digital:</strong> {money(expenses.summary.digitalTotal)} MT</span>
          </div>
          <table className="table">
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th>Valor</th></tr>
            </thead>
            <tbody>
              {expenses.expenses.map((e) => (
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

      {sales && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Vendas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <span><strong>Vendido:</strong> {money(sales.summary.totalSold)} MT</span>
            <span><strong>Pago:</strong> {money(sales.summary.totalPaid)} MT</span>
            <span style={{ color: sales.summary.totalPending !== "0.00" ? "#ca8a04" : "#166534" }}><strong>Pendente:</strong> {money(sales.summary.totalPending)} MT</span>
          </div>
          <table className="table">
            <thead>
              <tr><th>Nº</th><th>Data</th><th>Total</th><th>Pago</th><th>Pendente</th></tr>
            </thead>
            <tbody>
              {sales.sales.map((s) => (
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
            <thead>
              <tr><th>Produto</th><th>Disponível</th><th>Valor</th></tr>
            </thead>
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
