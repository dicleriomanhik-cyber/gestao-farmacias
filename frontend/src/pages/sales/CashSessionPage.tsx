import { useEffect, useState } from "react";
import { getActiveCashSession, openCash, closeCash } from "../../services/cashService";
import type { CashSession } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { canAccessCash } from "../../utils/permissions";
import { useToast } from "../../contexts/ToastContext";

export default function CashSessionPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const allowed = canAccessCash(user?.permissions);

  function load() {
    setLoading(true);
    setError(false);
    getActiveCashSession()
      .then(setSession)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return toast.error("Valor inicial inválido.");
    setSubmitting(true);
    try {
      await openCash({ openingBalance: num });
      toast.success("Caixa aberto.");
      setAmount("");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao abrir caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return toast.error("Valor contado inválido.");
    setSubmitting(true);
    try {
      await closeCash(session.id, { countedBalance: num });
      toast.success("Caixa fechado.");
      setAmount("");
      setSession(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao fechar caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a caixa." onRetry={load} />;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <PageHeader title="Gestão de Caixa" />

      {!session && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <p style={{ color: "#b91c1c", marginBottom: "1rem", fontWeight: 500 }}>
            A caixa está fechada.
          </p>
          {allowed ? (
            <form onSubmit={handleOpen}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Valor Inicial (MT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 1000.00"
                required
                style={{ marginBottom: "1rem" }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-success"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                {submitting ? "A abrir…" : "Abrir Caixa"}
              </button>
            </form>
          ) : (
            <p style={{ color: "#6b7280" }}>Não tens permissão para abrir a caixa.</p>
          )}
        </div>
      )}

      {session && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <p style={{ color: "#166534", marginBottom: "0.5rem", fontWeight: 500 }}>
            Caixa aberta.
          </p>
          <p style={{ marginBottom: "0.25rem" }}>
            <strong>Aberta em:</strong> {new Date(session.openedAt).toLocaleString()}
          </p>
          <p style={{ marginBottom: "1rem" }}>
            <strong>Valor Inicial:</strong> {parseFloat(session.openingBalance).toFixed(2)} MT
          </p>

          {allowed ? (
            <form onSubmit={handleClose}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Valor Contado (MT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 1050.00"
                required
                style={{ marginBottom: "1rem" }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-danger"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                {submitting ? "A fechar…" : "Fechar Caixa"}
              </button>
            </form>
          ) : (
            <p style={{ color: "#6b7280" }}>Não tens permissão para fechar a caixa.</p>
          )}
        </div>
      )}
    </div>
  );
}
