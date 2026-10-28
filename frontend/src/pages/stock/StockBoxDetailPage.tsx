import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStockBox } from "../../services/stockService";
import type { StockBoxDetail } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

function formatDate(s: string | null) {
  if (!s) return "Sem validade";
  const d = new Date(s);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function formatDateTime(s: string) {
  const d = new Date(s);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const INNER_LABEL = { FULL: "", IN_USE: "em uso", DEPLETED: "esgotada" } as const;

export default function StockBoxDetailPage() {
  const { id } = useParams();
  const [box, setBox] = useState<StockBoxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(false);
    getStockBox(id)
      .then(setBox)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  if (loading) return <LoadingState />;
  if (error || !box) return <ErrorState onRetry={load} />;

  const unit = box.saleUnitLabel;
  const sold = box.totalUnits - box.quantityAvailable;
  const pct = box.totalUnits > 0 ? Math.round((box.quantityAvailable / box.totalUnits) * 100) : 0;
  const hasInners = box.inners && box.inners.length > 0;

  return (
    <div>
      <PageHeader
        title={`Caixa ${box.qrCode} · ${box.productName}`}
        actions={<Link to="/stock/caixas" className="btn">Voltar</Link>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div><div style={{ fontSize: 12, color: "#6b7280" }}>Validade</div><b>{box.hasExpiry ? formatDate(box.expiryDate) : "Sem validade"}</b></div>
        <div><div style={{ fontSize: 12, color: "#6b7280" }}>{unit}s restantes</div><b>{box.quantityAvailable} de {box.totalUnits}</b></div>
        <div><div style={{ fontSize: 12, color: "#6b7280" }}>Vendidas até agora</div><b>{sold}</b></div>
      </div>

      <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", maxWidth: 400 }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: "#2f5bd3" }} />
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 16px" }}>{pct}% da caixa ainda disponível</div>

      {hasInners && (
        <>
          <h3>Caixinhas</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {box.inners.map((c) => {
              const done = c.state === "DEPLETED";
              const partial = c.state === "IN_USE";
              return (
                <div
                  key={c.index}
                  style={{
                    border: `1px solid ${partial ? "#b45309" : "#d9dee9"}`,
                    background: partial ? "#fff4e0" : done ? "#f4f6fa" : "transparent",
                    color: done ? "#9aa4b8" : "inherit",
                    textDecoration: done ? "line-through" : "none",
                    borderRadius: 8, padding: "8px 10px", minWidth: 120, fontSize: 14,
                  }}
                >
                  Caixinha {c.index}
                  <small style={{ display: "block", color: "#6b7280" }}>
                    {c.unitsAvailable} de {c.unitsTotal}{INNER_LABEL[c.state] ? ` · ${INNER_LABEL[c.state]}` : ""}
                  </small>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            A caixinha sai da lista quando fica sem carteiras. As caixinhas são consumidas em ordem, por isso só uma fica parcialmente aberta de cada vez.
          </p>
        </>
      )}

      <h3>Histórico de vendas desta caixa</h3>
      {box.saleHistory.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Ainda sem vendas.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Data</th>
              <th align="left">Venda</th>
              <th align="right">{unit}s</th>
              <th align="right">Restam</th>
            </tr>
          </thead>
          <tbody>
            {box.saleHistory.map((h) => (
              <tr key={h.saleId + h.createdAt} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td>{formatDateTime(h.createdAt)}</td>
                <td>#{h.saleNumber}</td>
                <td align="right">−{h.unitsDeducted}</td>
                <td align="right">{h.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
