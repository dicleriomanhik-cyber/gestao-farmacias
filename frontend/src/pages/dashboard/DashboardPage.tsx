import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getReportSummary, getReportStock } from "../../services/reportService";
import { formatDateTime } from "../../utils/formatDate";
import { getSales } from "../../services/saleService";
import type { ReportSummaryData, ReportStockData } from "../../types/reports";
import type { Sale } from "../../types/sales";
import EmptyState from "../../components/ui/EmptyState";

function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "0.00";
  return parseFloat(String(v)).toFixed(2);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReportSummaryData | null>(null);
  const [stock, setStock] = useState<ReportStockData | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    // Buscar um número alto de vendas recentes para calcular o "Hoje" no front-end
    Promise.allSettled([
      getReportSummary(),
      getReportStock(),
      getSales({ limit: 100 }), // Puxa as últimas 100 para calcular o dia de hoje
    ]).then(([sumRes, stockRes, salesRes]) => {
      if (!mounted) return;
      
      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      if (stockRes.status === "fulfilled") setStock(stockRes.value);
      
      if (salesRes.status === "fulfilled") {
        const allSales = salesRes.value.data;
        
        // As 5 mais recentes para a tabela
        setRecentSales(allSales.slice(0, 5));

        // Filtrar as de hoje
        const todayStr = new Date().toLocaleDateString("pt-PT");
        const filteredToday = allSales.filter(s => {
          const saleDate = new Date(s.createdAt).toLocaleDateString("pt-PT");
          return saleDate === todayStr;
        });
        setTodaySales(filteredToday);
      }
      
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  // Calcula os totais de hoje com base nas vendas filtradas
  const todayTotal = todaySales.reduce((acc, s) => acc + parseFloat(String(s.total)), 0);
  const todayCount = todaySales.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
          Olá, {user?.name ?? user?.email ?? "—"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
          {new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Vendas Hoje</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#166534" }}>
            {loading ? "…" : `${money(todayTotal)} MT`}
          </p>
          <small style={{ color: "#6b7280" }}>{todayCount} vendas</small>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Produtos</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            {loading ? "…" : stock?.summary.totalProducts ?? 0}
          </p>
          <small style={{ color: "#6b7280" }}>{stock?.summary.totalLots ?? 0} lotes</small>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Lotes a Expirar</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: (summary?.stock.expiredLotsCount ?? 0) > 0 ? "#b91c1c" : "#166534" }}>
            {loading ? "…" : summary?.stock.expiredLotsCount ?? 0}
          </p>
          <small style={{ color: "#6b7280" }}>Stock baixo: {summary?.stock.lowStockCount ?? 0}</small>
        </div>
      </div>

      <div className="card" style={{ padding: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Vendas Recentes</h2>
        {recentSales.length === 0 ? (
          <EmptyState message="Nenhuma venda registada." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Total</th>
                <th>Operador</th>
                <th>Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.saleNumber}</td>
                  <td>{money(s.total)} MT</td>
                  <td>{s.userId ? s.userId.substring(0, 8) + "..." : "—"}</td>
                  <td>{formatDateTime(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
