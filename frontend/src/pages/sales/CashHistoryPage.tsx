import { useEffect, useState } from "react";
import { apiClient } from "../../services/api";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

interface CashMovement {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  reason: string;
  createdAt: string;
}

function money(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "0.00";
  return parseFloat(String(v)).toFixed(2);
}

export default function CashHistoryPage() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    apiClient.get<{ success: boolean; data: CashMovement[] }>("/cash/movements")
      .then((res) => setMovements(res.data.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os movimentos." onRetry={load} />;

  return (
    <div>
      <PageHeader title="Histórico de Caixa" />
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        {movements.length === 0 ? (
          <p style={{ color: "#64748b" }}>Nenhum movimento registado.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                  <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>
                    {m.type === "IN" ? "Entrada" : "Saída"}
                  </td>
                  <td>{m.reason.replace(/Ã£/g, "ã").replace(/Ã§/g, "ç").replace(/Ã¡/g, "á").replace(/Ã©/g, "é").replace(/Ã­/g, "í").replace(/Ã³/g, "ó").replace(/Ãº/g, "ú")}</td>
                  <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>
                    {m.type === "OUT" ? "-" : "+"}{money(m.amount)} MT
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
