import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { getStockBox, getStockBoxes } from "../../services/stockService";
import type { StockBox, StockBoxDetail, StockBoxInner } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

const C = {
  border: "#e5e7eb",
  muted: "#6b7280",
  text: "#1d2433",
  accent: "#2f5bd3",
  accentSoft: "#e8efff",
  warn: "#b45309",
  warnSoft: "#fff4e0",
  doneBg: "#f4f6fa",
  doneText: "#9aa4b8",
};

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

const INNER_LABEL: Record<StockBoxInner["state"], string> = {
  FULL: "",
  IN_USE: "em uso",
  DEPLETED: "esgotada",
};

const labelStyle: CSSProperties = { fontSize: 13, color: C.muted, marginBottom: 2 };
const valueStyle: CSSProperties = { fontSize: 16, fontWeight: 600, color: C.text };

const thStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: "#ffffff",
  padding: "8px 10px",
  borderBottom: `1px solid ${C.border}`,
  textAlign: "left",
  fontSize: 12,
  color: C.muted,
  fontWeight: 600,
  textTransform: "uppercase",
};

const tdStyle: CSSProperties = {
  padding: "10px",
  borderBottom: `1px solid ${C.border}`,
  fontSize: 14,
  color: C.text,
};

export default function StockBoxDetailPage() {
  const { id } = useParams();
  const [box, setBox] = useState<StockBoxDetail | null>(null);
  const [todas, setTodas] = useState<StockBox[]>([]);
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

  useEffect(() => {
    getStockBoxes({ limit: 100 })
      .then((res) => setTodas(res.data ?? []))
      .catch(() => setTodas([]));
  }, []);

  if (loading) return <LoadingState />;
  if (error || !box) return <ErrorState onRetry={load} />;

  const unitPlural = `${box.saleUnitLabel}s`;
  const sold = box.totalUnits - box.quantityAvailable;
  const pct = box.totalUnits > 0 ? Math.round((box.quantityAvailable / box.totalUnits) * 100) : 0;
  const inners: StockBoxInner[] = box.inners ?? [];
  const saleHistory = box.salesHistory ?? [];

  return (
    <div style={{ width: "100%", maxWidth: 1060, margin: "0 auto", boxSizing: "border-box" }}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Caixa</span>
          <code style={{ fontSize: 13, background: "#f1f3f8", color: C.accent, padding: "3px 8px", borderRadius: 6 }}>{box.qrCode}</code>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>· {box.productName}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>Validade</div>
            <div style={valueStyle}>{box.hasExpiry ? formatDate(box.expiryDate) : "Sem validade"}</div>
          </div>
          <div>
            <div style={labelStyle}>{unitPlural} restantes</div>
            <div style={valueStyle}>{box.quantityAvailable} de {box.totalUnits}</div>
          </div>
          <div>
            <div style={labelStyle}>Vendidas até agora</div>
            <div style={valueStyle}>{sold}</div>
          </div>
        </div>

        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: C.accent }} />
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{pct}% da caixa ainda disponível</div>

        {todas.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 12px" }}>Caixas em stock</h3>
            <div className="box-grid">
              {todas.map((b, i) => {
                const ativa = b.id === box.id;
                return (
                  <Link
                    key={b.id}
                    to={`/stock/caixas/${b.id}`}
                    style={{
                      border: `1px solid ${ativa ? C.accent : C.border}`,
                      background: ativa ? C.accentSoft : "#ffffff",
                      color: C.text,
                      borderRadius: 8,
                      padding: "10px 14px",
                      minWidth: 0,
                      fontSize: 14,
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Caixa {i + 1}</div>
                    <code style={{ fontSize: 12, color: C.muted }}>{b.qrCode}</code>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {inners.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 12px" }}>Caixinhas</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {inners.map((c) => {
                const done = c.state === "DEPLETED";
                const partial = c.state === "IN_USE";
                return (
                  <div
                    key={c.index}
                    style={{
                      border: `1px solid ${partial ? C.warn : C.border}`,
                      background: partial ? C.warnSoft : done ? C.doneBg : "#ffffff",
                      color: done ? C.doneText : C.text,
                      borderRadius: 8,
                      padding: "10px 14px",
                      minWidth: 130,
                      fontSize: 14,
                    }}
                  >
                    <div style={{ textDecoration: done ? "line-through" : "none" }}>Caixinha {c.index}</div>
                    <div style={{ fontSize: 12, color: done ? C.doneText : C.muted, marginTop: 2, textDecoration: done ? "line-through" : "none" }}>
                      {c.unitsAvailable} de {c.unitsTotal}
                      {INNER_LABEL[c.state] ? ` · ${INNER_LABEL[c.state]}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 12, marginBottom: 0 }}>
              A caixinha {inners.find((c) => c.state !== "DEPLETED")?.index ?? 1} sai da lista quando fica sem {unitPlural.toLowerCase()}. As caixinhas são consumidas em ordem, por isso só uma fica parcialmente aberta de cada vez.
            </p>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 12px" }}>Histórico de vendas desta caixa</h3>
          {saleHistory.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Ainda sem vendas.</p>
          ) : (
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Venda</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>{unitPlural}</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Restam</th>
                  </tr>
                </thead>
                <tbody>
                  {saleHistory.map((h) => (
                    <tr key={h.saleId}>
                      <td style={tdStyle}>{formatDateTime(h.soldAt)}</td>
                      <td style={tdStyle}>#{h.saleNumber}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>−{h.units}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{h.balanceAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}