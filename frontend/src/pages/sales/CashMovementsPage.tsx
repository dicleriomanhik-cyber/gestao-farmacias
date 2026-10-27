import { useEffect, useState } from "react";
import { apiClient } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";
import LoadingState from "../../components/ui/LoadingState";
import PageHeader from "../../components/ui/PageHeader";

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

export default function CashMovementsPage() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ success: boolean; data: CashMovement[] }>("/cash/movements")
      .then((resp) => setMovements(resp.data.data ?? []))
      .catch(() => {
        // Se a caixa estiver fechada (sem sessão), tratar como "sem movimentos".
        setMovements([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Movimentos de Caixa" />
      {movements.length === 0 ? (
        <div className="card" style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
          <p style={{ fontSize: "1.1rem", margin: 0 }}>Nenhum movimento registado.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr><th>Data</th><th>Tipo</th><th>Motivo</th><th>Valor</th></tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontSize: "0.85rem" }}>{formatDateTime(m.createdAt)}</td>
                  <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>{m.type === "IN" ? "Entrada" : "Saída"}</td>
                  <td style={{ fontSize: "0.85rem" }}>{m.reason}</td>
                  <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>{m.type === "OUT" ? "-" : "+"}{money(m.amount)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
