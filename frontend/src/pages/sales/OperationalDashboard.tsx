import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getSales } from "../../services/saleService";
import { getActiveCashSession } from "../../services/cashService";
import type { Sale, CashSession } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";

function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "0.00";
  return parseFloat(String(v)).toFixed(2);
}

export default function OperationalDashboard() {
  const { user } = useAuth();
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [cash, setCash] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.allSettled([
      getSales({ limit: 5 }),
      getActiveCashSession(),
    ]).then(([salesRes, cashRes]) => {
      if (!mounted) return;
      if (salesRes.status === "fulfilled") setRecentSales(salesRes.value.data);
      if (cashRes.status === "fulfilled") setCash(cashRes.value);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Painel do Colaborador</h2>
        <p style={{ color: "#6b7280" }}>Olá, {user?.name || user?.email}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Estado da Caixa</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: cash ? "#166534" : "#b91c1c" }}>
            {cash ? "Aberta" : "Fechada"}
          </p>
          <small style={{ color: "#6b7280" }}>
            {cash ? `Inicial: ${money(cash.openingBalance)} MT` : "Abre a caixa para começar"}
          </small>
          <div style={{ marginTop: "0.5rem" }}>
            <Link to="/caixa" className="btn btn-secondary" style={{ width: "100%", textAlign: "center" }}>
              {cash ? "Gerir Caixa" : "Abrir Caixa"}
            </Link>
          </div>
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Ações Rápidas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Link to="/pos" className="btn btn-primary" style={{ textAlign: "center" }}>🛒 Nova Venda</Link>
            <Link to="/pos/historico" className="btn btn-secondary" style={{ textAlign: "center" }}>📋 Ver Histórico</Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "1rem" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Vendas Recentes (Geral)</h3>
        {recentSales.length === 0 ? (
          <EmptyState message="Nenhuma venda registada." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Total</th>
                <th>Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.saleNumber}</td>
                  <td>{money(s.total)} MT</td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
