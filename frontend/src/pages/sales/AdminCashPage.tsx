import { useEffect, useState } from "react";
import { getActiveCashSession, closeCash } from "../../services/cashService";
import type { CashSession } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useToast } from "../../contexts/ToastContext";

export default function AdminCashPage() {
  const toast = useToast();
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forcing, setForcing] = useState(false);

  useEffect(() => {
    getActiveCashSession()
      .then(setSession)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleForceClose() {
    if (!session) return;
    if (!window.confirm("Tens a certeza que queres forçar o fecho da caixa? O saldo ficará a zero para o colaborador.")) return;
    setForcing(true);
    try {
      await closeCash(session.id, { countedBalance: 0 });
      toast.success("Caixa forçado a fechar com sucesso.");
      setSession(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao forçar fecho.");
    } finally {
      setForcing(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Erro ao carregar a caixa." onRetry={() => window.location.reload()} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <PageHeader title="Gestão de Caixa" />
      {!session ? (
        <p style={{ color: "#64748b" }}>A caixa está fechada.</p>
      ) : (
        <div>
          <p><strong>Estado:</strong> Caixa aberta</p>
          <p><strong>Aberta em:</strong> {new Date(session.openedAt).toLocaleString("pt-PT")}</p>
          <p><strong>Valor Inicial:</strong> {parseFloat(session.openingBalance.toString()).toFixed(2)} MT</p>

          <button
            onClick={handleForceClose}
            disabled={forcing}
            className="btn btn-danger"
            style={{ width: "100%", padding: "1rem", marginTop: "1.5rem" }}
          >
            {forcing ? "A forçar…" : "Forçar Fecho de Caixa"}
          </button>
        </div>
      )}
    </div>
  );
}
