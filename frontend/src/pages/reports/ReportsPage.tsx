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
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);
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
              <tr><th style={{ width: "12%" }}>Nº</th><th style={{ width: "12%" }}>Venda</th><th style={{ width: "45%" }}>Motivo</th><th style={{ width: "16%" }}>Total</th><th style={{ width: "15%" }}>Ações</th></tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.returnNumber}</td>
                  <td>{r.sale?.saleNumber ?? "—"}</td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.reason}>{r.reason}</td>
                  <td>{money(r.totalRefund)} MT</td>
                  <td>
                    <button onClick={() => setSelectedReturn(r)} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                      Ver
                    </button>
                  </td>
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

      {/* MODAL DE DETALHES DA DEVOLUÇÃO */}
      {selectedReturn && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setSelectedReturn(null)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#1e293b" }}>
              Devolução {selectedReturn.returnNumber}
            </h2>
            <p><strong>Venda:</strong> {selectedReturn.sale?.saleNumber ?? "—"}</p>
            <p><strong>Estado:</strong> {selectedReturn.status}</p>
            <p><strong>Total Reembolso:</strong> {parseFloat(selectedReturn.totalRefund).toFixed(2)} MT</p>
            <p style={{ marginTop: "1rem" }}><strong>Motivo:</strong></p>
            <p style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {selectedReturn.reason}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                onClick={() => setSelectedReturn(null)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#e2e8f0",
                  color: "#1e293b",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
