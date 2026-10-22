import { useEffect, useState } from "react";
import { getReportSummary, getReportSales, getReportExpenses, getReportCash, getReportStock } from "../../services/reportService";
import type { ReportSummary, ReportSales, ReportExpenses, ReportCash, ReportStock } from "../../types/reports";
import LoadingState from "../../components/ui/LoadingState";

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [sales, setSales] = useState<ReportSales | null>(null);
  const [expenses, setExpenses] = useState<ReportExpenses | null>(null);
  const [cash, setCash] = useState<ReportCash | null>(null);
  const [stock, setStock] = useState<ReportStock | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReportSummary(), getReportSales(), getReportExpenses(), getReportCash(), getReportStock()])
      .then(([s, sa, e, c, st]) => {
        setSummary(s); setSales(sa); setExpenses(e); setCash(c); setStock(st);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Relatórios</h1>
        <span style={{ backgroundColor: "#fef08a", color: "#854d0e", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem" }}>
          [MOCK] Dados Simulados
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Vendas</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#166534" }}>{summary?.totalSales} MT</p>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Despesas</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#b91c1c" }}>{summary?.totalExpenses} MT</p>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Lucro Líquido</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: parseFloat(summary?.netProfit || "0") >= 0 ? "#166534" : "#b91c1c" }}>{summary?.netProfit} MT</p>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Saldo de Caixa</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{summary?.cashBalance} MT</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Vendas</h2>
          <p>Total: <strong>{sales?.totalSales} MT</strong></p>
          <p>Nº de vendas: <strong>{sales?.countSales}</strong></p>
          <p>Ticket médio: <strong>{sales?.averageTicket} MT</strong></p>
        </div>
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Despesas</h2>
          <p>Total: <strong>{expenses?.totalExpenses} MT</strong></p>
          <p>Nº de despesas: <strong>{expenses?.countExpenses}</strong></p>
        </div>
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Caixa</h2>
          <p>Entradas: <strong style={{ color: "#166534" }}>{cash?.totalIn} MT</strong></p>
          <p>Saídas: <strong style={{ color: "#b91c1c" }}>{cash?.totalOut} MT</strong></p>
          <p>Saldo: <strong>{cash?.balance} MT</strong></p>
        </div>
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Stock</h2>
          <p>Total de produtos: <strong>{stock?.totalProducts}</strong></p>
          <p>Stock baixo: <strong style={{ color: "#ca8a04" }}>{stock?.lowStockCount}</strong></p>
          <p>A expirar: <strong style={{ color: "#b91c1c" }}>{stock?.expiringLotsCount}</strong></p>
        </div>
      </div>
    </div>
  );
}
