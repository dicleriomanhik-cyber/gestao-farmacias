import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSupplierSummary } from "../../services/supplierService";
import { getSettings } from "../../services/settingsService";
import type { SupplierSummary } from "../../types/suppliers";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import Badge from "../../components/suppliers/Badge";
import { METHOD_LABEL, PAID_FROM_LABEL, fmtDate, fmtMoney, fmtMt } from "../../utils/supplierFormat";

const cardStyle = { padding: "1rem" } as const;
const cardLabel = { fontSize: "0.8rem", color: "#64748b", marginBottom: "0.25rem" } as const;
const cardValue = { fontSize: "1.25rem", fontWeight: 600, color: "#1e293b" } as const;
const sectionTitle = { fontSize: "1.1rem", fontWeight: 600, margin: "1.5rem 0 0.5rem" } as const;

export default function SupplierProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SupplierSummary | null>(null);
  const [payables, setPayables] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(false);
    Promise.all([getSupplierSummary(id), getSettings().catch(() => null)])
      .then(([d, st]) => {
        setData(d);
        setPayables(Boolean(st?.usePayables));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Não foi possível carregar a ficha do fornecedor." onRetry={load} />;

  const { supplier, summary, purchases, products, payments } = data;

  return (
    <div style={{ overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{supplier.name}</h1>
          <div style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            {[supplier.phone, supplier.whatsapp, supplier.email, supplier.city].filter(Boolean).join(" · ") || "Sem contactos"}
            {supplier.taxId ? ` · NUIT ${supplier.taxId}` : ""}
          </div>
        </div>
        <Link to={`/fornecedores/${supplier.id}/editar`} className="btn btn-secondary">Editar</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        <div className="card" style={cardStyle}>
          <div style={cardLabel}>Total comprado</div>
          <div style={cardValue}>{fmtMt(summary.totalPurchased)}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={cardLabel}>Número de compras</div>
          <div style={cardValue}>{summary.purchaseCount}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={cardLabel}>Última compra</div>
          <div style={cardValue}>{fmtDate(summary.lastPurchaseDate)}</div>
        </div>
        {payables && (
          <div className="card" style={cardStyle}>
            <div style={cardLabel}>Dívida atual</div>
            <div style={cardValue}>{fmtMt(summary.debt)}</div>
          </div>
        )}
      </div>

      <h2 style={sectionTitle}>Compras</h2>
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        {purchases.length === 0 ? (
          <div style={{ color: "#64748b" }}>Sem compras.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Data</th>
                <th>Total</th>
                {payables && <th>Pago</th>}
                {payables && <th>Em dívida</th>}
                {payables && <th>Pagamento</th>}
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/fornecedores/compras/${p.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>{p.documentNumber}</Link>
                  </td>
                  <td>{fmtDate(p.purchaseDate)}</td>
                  <td>{fmtMt(p.dueMzn)}</td>
                  {payables && <td>{fmtMt(p.paidTotal)}</td>}
                  {payables && <td>{fmtMt(p.outstanding)}</td>}
                  {payables && <td><Badge kind="payment" value={p.paymentStatus} /></td>}
                  <td><Badge kind="purchase" value={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={sectionTitle}>Produtos fornecidos</h2>
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        {products.length === 0 ? (
          <div style={{ color: "#64748b" }}>Sem produtos registados em compras confirmadas.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Último custo pago</th>
                <th>Quantidade</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td>{fmtMt(p.lastUnitCost)}</td>
                  <td>{p.lastQuantity}</td>
                  <td>{fmtDate(p.lastDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={sectionTitle}>Pagamentos</h2>
      <div className="card" style={{ padding: "1rem", overflowX: "auto", marginBottom: "1.5rem" }}>
        {payments.length === 0 ? (
          <div style={{ color: "#64748b" }}>Sem pagamentos.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Compra</th>
                <th>Valor</th>
                <th>Pago com</th>
                <th>Método</th>
                <th>Registado por</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.paidAt)}</td>
                  <td>{p.purchase?.documentNumber ?? "—"}</td>
                  <td>{fmtMoney(p.amount)}</td>
                  <td>{PAID_FROM_LABEL[p.paidFrom] ?? p.paidFrom}</td>
                  <td>{METHOD_LABEL[p.method] ?? p.method}</td>
                  <td>{p.user?.fullName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}