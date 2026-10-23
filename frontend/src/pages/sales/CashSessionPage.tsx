import { useEffect, useState } from "react";
import { getActiveCashSession, openCash, closeCash, getCashMovements } from "../../services/cashService";
import type { CashSession, CashMovement } from "../../types/sales";
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
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [amount, setAmount] = useState("");
  const allowed = canAccessCash(user?.permissions);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([getActiveCashSession(), getCashMovements()])
      .then(([s, m]) => { setSession(s); setMovements(m); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleOpen() {
    if (!amount) return toast.error("Insere o valor inicial.");
    const s = await openCash({ initialAmount: amount });
    setSession(s); setAmount("");
    toast.success("Caixa aberta.");
  }
  async function handleClose() {
    if (!amount) return toast.error("Insere o valor final.");
    await closeCash({ finalAmount: amount });
    setSession({ ...session!, status: "CLOSED", finalAmount: amount });
    setAmount("");
    toast.success("Caixa fechada.");
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a caixa." onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "600px", margin: "0 auto" }}>
      <PageHeader title="Gestão de Caixa" actions={<span style={{ backgroundColor: "#fef08a", color: "#854d0e", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem" }}>[MOCK]</span>} />

      <div className="card">
        {!session || session.status === "CLOSED" ? (
          <div>
            <p style={{ color: "#b91c1c", marginBottom: "1rem" }}>A caixa está fechada.</p>
            {allowed && (
              <>
                <input type="number" placeholder="Valor Inicial (MT)" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginBottom: "1rem" }} />
                <button onClick={handleOpen} className="btn btn-success" style={{ width: "100%", padding: "0.75rem" }}>Abrir Caixa</button>
              </>
            )}
          </div>
        ) : (
          <div>
            <p style={{ color: "#166534", marginBottom: "0.5rem" }}>Caixa Aberta.</p>
            <p style={{ marginBottom: "1rem" }}>Valor Inicial: {session.initialAmount} MT</p>
            {allowed && (
              <>
                <input type="number" placeholder="Valor Final (MT)" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginBottom: "1rem" }} />
                <button onClick={handleClose} className="btn btn-danger" style={{ width: "100%", padding: "0.75rem" }}>Fechar Caixa</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Movimentos Recentes</h2>
        {movements.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Sem movimentos registados.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {movements.map((m) => (
              <li key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
                <span>{m.reason}</span>
                <span style={{ color: m.type === "IN" ? "green" : "red" }}>{m.type === "IN" ? "+" : "-"}{m.amount} MT</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

