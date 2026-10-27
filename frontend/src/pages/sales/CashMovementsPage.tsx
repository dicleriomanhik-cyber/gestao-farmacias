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
  const [selectedMovement, setSelectedMovement] = useState<CashMovement | null>(null);

  useEffect(() => {
    apiClient.get<{ success: boolean; data: CashMovement[] }>("/cash/movements")
      .then((resp) => setMovements(resp.data.data ?? []))
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  // Simplificar motivo (apenas o tipo)
  function getSimplifiedReason(m: CashMovement) {
    if (m.type === "OUT" && m.reason.toLowerCase().includes("despesa")) return "Despesa";
    if (m.type === "OUT" && m.reason.toLowerCase().includes("reembolso")) return "Reembolso";
    if (m.type === "IN") return "Entrada";
    return m.type === "OUT" ? "Saída" : "Entrada";
  }

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
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontSize: "0.85rem" }}>{formatDateTime(m.createdAt)}</td>
                  <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>
                    {m.type === "IN" ? "Entrada" : "Saída"}
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>{getSimplifiedReason(m)}</td>
                  <td style={{ color: m.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>
                    {m.type === "OUT" ? "-" : "+"}{money(m.amount)} MT
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedMovement(m)}
                      style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Ver Detalhe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {selectedMovement && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={() => setSelectedMovement(null)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white", borderRadius: "12px", padding: "1.5rem",
              maxWidth: "500px", width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#1e293b" }}>
              Detalhe do Movimento
            </h2>
            <p><strong>Data:</strong> {formatDateTime(selectedMovement.createdAt)}</p>
            <p><strong>Tipo:</strong>{" "}
              <span style={{ color: selectedMovement.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>
                {selectedMovement.type === "IN" ? "Entrada" : "Saída"}
              </span>
            </p>
            <p><strong>Valor:</strong>{" "}
              <span style={{ color: selectedMovement.type === "IN" ? "#166534" : "#b91c1c", fontWeight: "bold" }}>
                {selectedMovement.type === "OUT" ? "-" : "+"}{money(selectedMovement.amount)} MT
              </span>
            </p>
            <p style={{ marginTop: "1rem" }}><strong>Motivo completo:</strong></p>
            <p style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {selectedMovement.reason}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                onClick={() => setSelectedMovement(null)}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#e2e8f0",
                  color: "#1e293b", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: "pointer",
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
