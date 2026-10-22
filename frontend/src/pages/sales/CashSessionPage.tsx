import { useEffect, useState } from "react";
import { getActiveCashSession, openCash, closeCash, getCashMovements } from "../../services/cashService";
import type { CashSession, CashMovement } from "../../types/sales";
import LoadingState from "../../components/ui/LoadingState";

export default function CashSessionPage() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    Promise.all([getActiveCashSession(), getCashMovements()])
      .then(([sess, movs]) => { setSession(sess); setMovements(movs); })
      .finally(() => setLoading(false));
  }, []);

  async function handleOpen() {
    if (!amount) return alert("Insere o valor inicial.");
    const newSession = await openCash({ initialAmount: amount });
    setSession(newSession);
    setAmount("");
  }

  async function handleClose() {
    if (!amount) return alert("Insere o valor final.");
    await closeCash({ finalAmount: amount });
    setSession({ ...session!, status: "CLOSED", finalAmount: amount });
    setAmount("");
  }

  if (loading) return <LoadingState />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "600px", margin: "0 auto" }}>
      <div className="card">
        <h1 style={{ marginBottom: "1rem" }}>Gestão de Caixa</h1>

        {!session || session.status === "CLOSED" ? (
          <div>
            <p style={{ color: "#b91c1c", marginBottom: "1rem" }}>A caixa está fechada.</p>
            <input
              type="number" placeholder="Valor Inicial (MT)"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
            />
            <button onClick={handleOpen} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#16a34a", color: "white", border: "none" }}>Abrir Caixa</button>
          </div>
        ) : (
          <div>
            <p style={{ color: "#166534", marginBottom: "0.5rem" }}>Caixa Aberta.</p>
            <p style={{ marginBottom: "1rem" }}>Valor Inicial: {session.initialAmount} MT</p>
            <input
              type="number" placeholder="Valor Final (MT)"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
            />
            <button onClick={handleClose} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#b91c1c", color: "white", border: "none" }}>Fechar Caixa</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: "1rem" }}>Movimentos Recentes</h2>
        {movements.length === 0 ? <p>Sem movimentos.</p> : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {movements.map((m) => (
              <li key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
                <span>{m.reason}</span>
                <span style={{ color: m.type === "IN" ? "green" : "red" }}>
                  {m.type === "IN" ? "+" : "-"}{m.amount} MT
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
