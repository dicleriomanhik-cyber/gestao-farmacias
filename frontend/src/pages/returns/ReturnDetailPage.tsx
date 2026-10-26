import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getReturnById } from "../../services/returnService";
import type { SaleReturn } from "../../types/returns";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  CONFIRMED: "Confirmada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const conditionLabels: Record<string, string> = {
  RESELLABLE: "Reutilizável",
  DAMAGED: "Danificado",
  EXPIRED: "Expirado",
  LOST: "Perdido",
  PENDING_INSPECTION: "Pendente de Inspeção",
};

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ret, setRet] = useState<SaleReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getReturnById(id)
      .then(setRet)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Devolução não encontrada." onRetry={() => window.location.reload()} />;
  if (!ret) return <ErrorState message="Devolução não encontrada." onRetry={() => window.location.reload()} />;

  return (
    <div>
      <PageHeader title={`Devolução ${ret.returnNumber}`} actions={<Link to="/devolucoes" className="btn btn-secondary">Voltar</Link>} />

      <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <p><strong>Venda:</strong> {ret.sale?.saleNumber ?? "—"}</p>
        <p style={{ marginTop: "0.5rem" }}><strong>Motivo:</strong></p>
        <p style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {ret.reason}
        </p>
        <p><strong>Total Reembolso:</strong> {parseFloat(ret.totalRefund).toFixed(2)} MT</p>
        <p><strong>Estado:</strong> {statusLabels[ret.status] ?? ret.status}</p>
      </div>

      <div className="card" style={{ padding: "1rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Linhas</h3>
        <table className="table" style={{ tableLayout: "fixed", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Produto</th>
              <th style={{ width: "15%" }}>Qtd</th>
              <th style={{ width: "30%" }}>Condição</th>
              <th style={{ width: "15%" }}>Libertado</th>
            </tr>
          </thead>
          <tbody>
            {(ret.lines ?? []).map((line) => (
              <tr key={line.id}>
                <td>{line.product?.name ?? line.productId.substring(0, 8)}</td>
                <td>{line.quantity}</td>
                <td>{conditionLabels[line.condition ?? "PENDING_INSPECTION"] ?? line.condition ?? "Pendente de Inspeção"}</td>
                <td>{line.quantityReleased}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
