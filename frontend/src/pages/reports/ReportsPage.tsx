import { useEffect, useState } from "react";
import {
  getReportSummary,
  getReportSales,
  getReportExpenses,
  getReportCash,
  getReportStock,
} from "../../services/reportService";
import type {
  ReportSummaryData,
  ReportSalesData,
  ReportExpensesData,

  ReportStockData,
} from "../../types/reports";
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
      canFinancial ? getReportCash() : Promise.resolve(null),
      getReportStock(),
    ])
      .then(([s, sa, e, _, st]) => {
        setSummary(s);
        setSales(sa);
        setExpenses(e);
        
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
            <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Lotes a Expirar</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: summary.stock.expiredLotsCount > 0 ? "#b91c1c" : "#166534" }}>
              {summary.stock.expiredLotsCount}
            </p>
            <small style={{ color: "#6b7280" }}>Stock baixo: {summary.stock.lowStockCount}</small>
          </div>
        </div>
      )}

      {/* Secção CAIXA removida conforme pedido da Central */}

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
                  <td>{new Date(e.expenseDate).toLocaleDateString()}</td>
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
                  <td>{new Date(s.createdAt).toLocaleDateString()}</td>
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
