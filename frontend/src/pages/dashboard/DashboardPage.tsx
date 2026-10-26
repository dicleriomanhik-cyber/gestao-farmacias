import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getReportSummary, getReportStock } from "../../services/reportService";
import { formatDateTime } from "../../utils/formatDate";
import { getSales } from "../../services/saleService";
import { getActiveCashSession, getPayments } from "../../services/cashService";
import { apiClient } from "../../services/api";
import type { ReportSummaryData, ReportStockData } from "../../types/reports";
import type { Sale, CashSession, PaymentMethod } from "../../types/sales";
import EmptyState from "../../components/ui/EmptyState";

function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "0.00";
  return parseFloat(String(v)).toFixed(2);
}

interface CashMovement {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  reason: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReportSummaryData | null>(null);
  const [stock, setStock] = useState<ReportStockData | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para o Caixa (espelho do POS)
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [totals, setTotals] = useState<Record<PaymentMethod, number>>({ CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 });
  const [movements, setMovements] = useState<CashMovement[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([
      getReportSummary(),
      getReportStock(),
      getSales({ limit: 5 }),
      getActiveCashSession(),
    ]).then(async ([sumRes, stockRes, salesRes, cashRes]) => {
      if (!mounted) return;

      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      if (stockRes.status === "fulfilled") setStock(stockRes.value);
      if (salesRes.status === "fulfilled") setRecentSales(salesRes.value.data);

      if (cashRes.status === "fulfilled" && cashRes.value) {
        setCashSession(cashRes.value);
        try {
          const data = await getPayments();
          if (mounted) setTotals(data.totalsByMethod);
          
          const resp = await apiClient.get<{ success: boolean; data: CashMovement[] }>("/cash/movements");
          if (mounted) setMovements(resp.data.data ?? []);
        } catch {
          // ignora falhas
        }
      }

      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, []);

  // Cálculo do Saldo Total (igual ao POS)
  const totalAllMethods = (totals.CASH || 0) + (totals.CARD || 0) + (totals.MPESA || 0) + (totals.EMOLA || 0);
  const totalOut = movements.filter((m) => m.type === "OUT").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  const totalIn = movements.filter((m) => m.type === "IN").reduce((acc, m) => acc + parseFloat(m.amount), 0);
  
  // Saldo Total = Fundo de Maneio + Todas as vendas + Entradas - Saídas
  const expectedTotalBalance = cashSession ? parseFloat(cashSession.openingBalance.toString()) + totalAllMethods + totalIn - totalOut : 0;

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
        <div className="card" style={{ padding: "1rem", borderLeft: "4px solid #2563eb" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Saldo Total (Caixa)</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2563eb" }}>
            {loading ? "…" : `${money(expectedTotalBalance)} MT`}
          </p>
          <small style={{ color: "#6b7280" }}>
            {cashSession ? "Caixa aberta" : "Caixa fechada"}
          </small>
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
