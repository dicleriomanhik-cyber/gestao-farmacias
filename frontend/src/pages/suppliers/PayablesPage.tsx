import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPayables } from "../../services/supplierPaymentService";
import { getSettings } from "../../services/settingsService";
import type { PayableGroup } from "../../types/suppliers";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import Badge from "../../components/suppliers/Badge";
import { fmtDate, fmtMt } from "../../utils/supplierFormat";

export default function PayablesPage() {
  const [groups, setGroups] = useState<PayableGroup[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([getSettings().catch(() => null), getPayables()])
      .then(([st, g]) => {
        setEnabled(st ? Boolean(st.usePayables) : true);
        setGroups(g);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar as contas a pagar." onRetry={load} />;
  if (!enabled) {
    return (
      <div className="card" style={{ padding: "2rem", maxWidth: "640px", margin: "0 auto" }}>
        Ativa "Usar contas a pagar" em Definições para acompanhar compras a prazo e pagamentos parciais.
      </div>
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const total = groups.reduce((acc, g) => acc + g.totalDue, 0);

  return (
    <div style={{ overflowY: "auto" }}>
      <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Dívida total a fornecedores</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{fmtMt(total)}</div>
      </div>

      {groups.length === 0 ? (
        <div className="card" style={{ padding: "1rem", color: "#64748b" }}>Não há dívidas a fornecedores.</div>
      ) : (
        groups.map((g) => (
          <div key={g.supplierId} className="card" style={{ padding: "1rem", marginBottom: "1rem", overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <div>
                <Link to={`/fornecedores/${g.supplierId}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600, fontSize: "1.05rem" }}>{g.supplierName}</Link>
                <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  {[g.phone, g.whatsapp].filter(Boolean).join(" / ") || "Sem contactos"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600 }}>{fmtMt(g.totalDue)}</div>
                <div style={{ color: "#64748b", fontSize: "0.85rem" }}>Próxima data limite: {fmtDate(g.nextDueDate)}</div>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Nº da fatura</th>
                  <th>Data</th>
                  <th>Data limite</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Em dívida</th>
                  <th>Pagamento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {g.purchases.map((p) => {
                  const vencida = Boolean(p.dueDate) && String(p.dueDate).slice(0, 10) < hoje;
                  return (
                    <tr key={p.id}>
                      <td>{p.documentNumber}</td>
                      <td>{fmtDate(p.purchaseDate)}</td>
                      <td style={{ color: vencida ? "#b91c1c" : undefined }}>{fmtDate(p.dueDate)}{vencida ? " (vencida)" : ""}</td>
                      <td>{fmtMt(p.total)}</td>
                      <td>{fmtMt(p.paid)}</td>
                      <td>{fmtMt(p.outstanding)}</td>
                      <td><Badge kind="payment" value={p.paymentStatus} /></td>
                      <td>
                        <Link to={`/fornecedores/compras/${p.id}`} className="btn-soft">Pagar</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}