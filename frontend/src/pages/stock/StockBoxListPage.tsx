import { useEffect, useState } from "react";
import { getStockBoxes } from "../../services/stockService";
import type { StockBox, StockBoxState } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

const STATE_LABEL: Record<StockBoxState, string> = {
  ACTIVE: "Em uso",
  DEPLETED: "Esgotada",
  EXPIRED: "Expirada",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export default function StockBoxListPage() {
  const [boxes, setBoxes] = useState<StockBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<StockBoxState | "">("");

  function load() {
    setLoading(true);
    setError(false);
    getStockBoxes({ limit: 100, state: state || undefined })
      .then((res) => setBoxes(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [state]);

  const filtered = boxes.filter((b) =>
    `${b.productName} ${b.qrCode}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <div>
      <PageHeader title="Caixas em stock" />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Pesquisar produto ou QR Code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: 8 }}
        />
        <select value={state} onChange={(e) => setState(e.target.value as StockBoxState | "")} style={{ padding: 8 }}>
          <option value="">Todos os estados</option>
          <option value="ACTIVE">Em uso</option>
          <option value="DEPLETED">Esgotada</option>
          <option value="EXPIRED">Expirada</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhuma caixa encontrada." />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">QR Code</th>
              <th align="left">Produto</th>
              <th align="left">Tipo</th>
              <th align="left">Validade</th>
              <th align="right">Caixinhas</th>
              <th align="right">Restante</th>
              <th align="left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td><code>{b.qrCode}</code></td>
                <td>{b.productName}</td>
                <td>{b.type === "MEDICINE" ? "Medicamento" : "Produto"}</td>
                <td>{b.hasExpiry && b.expiryDate ? formatDate(b.expiryDate) : "Sem validade"}</td>
                <td align="right">
                  {b.innerCount !== null ? `${b.innerCount}` : "—"}
                </td>
                <td align="right">
                  <b>{b.quantityAvailable}</b> de {b.totalUnits} {b.saleUnitLabel}
                  {b.quantityAvailable === 1 ? "" : "s"}
                </td>
                <td>{STATE_LABEL[b.state]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

