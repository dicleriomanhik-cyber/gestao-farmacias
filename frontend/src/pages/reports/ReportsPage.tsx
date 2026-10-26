import { useEffect, useState } from "react";
import {
  getReportSummary,
  getReportSales,
  getReportExpenses,
  getReportCash,
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
import { formatDate } from "../../utils/formatDate";

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
  const [returns, setReturns] = useState<SaleReturn[]>([]);
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
      getReturns({ limit: 10 }),
    ])
      .then(([s, sa, e, _, st, r]) => {
        setSummary(s);
        setSales(sa);
        setExpenses(e);
        setStock(st);
        setReturns(r.data);
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

      {canFinancial && expenses && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", overflowX: "auto" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Despesas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <span><strong>Total:</strong> {money(expenses.summary.total)} MT</span>
            <span><strong>Dinheiro:</strong> {money(expenses.summary.cashTotal)} MT</span>
            <span><strong>Digital:</strong> {money(expenses.summary.digitalTotal)} MT</span>
          </div>
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "15%" }}>Data</th><th style={{ width: "40%" }}>Descrição</th><th style={{ width: "20%" }}>Categoria</th><th style={{ width: "15%" }}>Método</th><th style={{ width: "10%" }}>Valor</th></tr>
            </thead>
            <tbody>
              {expenses.expenses.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.expenseDate)}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.description}>{e.description}</td>
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
        <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", overflowX: "auto" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Vendas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <span><strong>Vendido:</strong> {money(sales.summary.totalSold)} MT</span>
            <span><strong>Pago:</strong> {money(sales.summary.totalPaid)} MT</span>
            <span style={{ color: sales.summary.totalPending !== "0.00" ? "#ca8a04" : "#166534" }}><strong>Pendente:</strong> {money(sales.summary.totalPending)} MT</span>
          </div>
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "15%" }}>Nº</th><th style={{ width: "20%" }}>Data</th><th style={{ width: "20%" }}>Total</th><th style={{ width: "20%" }}>Pago</th><th style={{ width: "25%" }}>Pendente</th></tr>
            </thead>
            <tbody>
              {sales.sales.map((s) => (
                <tr key={s.id}>
                  <td>{s.saleNumber}</td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>{money(s.total)} MT</td>
                  <td>{money(s.paid)} MT</td>
                  <td style={{ color: s.pending !== "0.00" ? "#ca8a04" : "#166534" }}>{money(s.pending)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {returns.length > 0 && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", overflowX: "auto" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Devoluções do Período</h2>
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "15%" }}>Nº</th><th style={{ width: "15%" }}>Venda</th><th style={{ width: "50%" }}>Motivo</th><th style={{ width: "20%" }}>Total</th></tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.returnNumber}</td>
                  <td>{r.sale?.saleNumber ?? "—"}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.reason}>{r.reason}</td>
                  <td>{money(r.totalRefund)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stock && (
        <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Stock</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <span><strong>Produtos:</strong> {stock.summary.totalProducts}</span>
            <span><strong>Lotes:</strong> {stock.summary.totalLots}</span>
            <span><strong>Valor:</strong> {money(stock.summary.totalStockValue)} MT</span>
            <span><strong>Expirados:</strong> {stock.summary.expiredLotsCount}</span>
          </div>
          <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr><th style={{ width: "50%" }}>Produto</th><th style={{ width: "25%" }}>Disponível</th><th style={{ width: "25%" }}>Valor</th></tr>
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
