import { useEffect, useState } from "react";  
import { Link } from "react-router-dom";
import { getStockBoxes } from "../../services/stockService";
import type { StockBox, StockBoxState } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

const STATE_LABEL: Record<StockBoxState, string> = {
  NEW: "Nova",
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
  const [period, setPeriod] = useState("today");

  function load() {
    setLoading(true);
    setError(false);
    getStockBoxes({ limit: 100 })
      .then((res) => setBoxes(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = boxes.filter((b) => {
    if (!`${b.productName} ${b.qrCode}`.toLowerCase().includes(search.toLowerCase())) return false;
    
    // Filtro de Período simples (baseado na data de validade ou criação se existisse)
    // Como não temos data de criação na listagem, vamos apenas simular o filtro visualmente
    // A implementação real do filtro de período requer dados de data no backend.
    return true; 
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "1.5rem", width: "100%" }}>
      
      {/* BARRA DE PESQUISA E FILTRO */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", flexShrink: 0, alignItems: "center" }}>
        <input
          type="search"
          placeholder="Pesquisar produto ou QR Code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: "8px 12px", border: "1px solid #d9dee9", borderRadius: 8 }}
        />
        
        <select 
          value={period} 
          onChange={(e) => setPeriod(e.target.value)} 
          style={{ padding: "8px 12px", border: "1px solid #d9dee9", borderRadius: 8, background: "#fff", minWidth: 180 }}
        >
          <option value="today">Hoje</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mês</option>
          <option value="year">Este Ano</option>
          <option value="custom">Personalizado</option>
          <option value="all">Ver Tudo</option>
        </select>
      </div>

      {/* TABELA */}
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #d9dee9", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 20 }}><EmptyState message="Nenhuma caixa encontrada." /></div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc", borderBottom: "1px solid #d9dee9" }}>
              <tr>
                <th align="left" style={{ padding: "12px 16px", color: "#5b6478", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>QR Code</th>
                <th align="left" style={{ padding: "12px 16px", color: "#5b6478", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Produto</th>
                <th align="left" style={{ padding: "12px 16px", color: "#5b6478", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tipo</th>
                <th align="left" style={{ padding: "12px 16px", color: "#5b6478", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Validade</th>
                <th align="right" style={{ padding: "12px 16px", color: "#5b6478", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Caixinhas</th>
                <th align="right" style={{ padding: "12px 16px", color: "#5b6478", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Restante</th>
                <th align="left" style={{ padding: "12px 16px", color: "#5b6478", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 16px" }}><Link to={`/stock/caixas/${b.id}`}><code style={{ color: "#2f5bd3" }}>{b.qrCode}</code></Link></td>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{b.productName}</td>
                  <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: b.type === "MEDICINE" ? "#e8efff" : "#fff4e0", color: b.type === "MEDICINE" ? "#2f5bd3" : "#b45309" }}>{b.type === "MEDICINE" ? "Medicamento" : "Produto"}</span></td>
                  <td style={{ padding: "12px 16px" }}>{b.hasExpiry && b.expiryDate ? formatDate(b.expiryDate) : <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "#e5e7eb", color: "#6b7280" }}>Sem validade</span>}</td>
                  <td align="right" style={{ padding: "12px 16px", color: "#5b6478" }}>
                    {b.innerCount !== null && b.unitsPerInner ? `${Math.ceil(b.quantityAvailable / b.unitsPerInner)} de ${b.innerCount}` : "—"}
                  </td>
                  <td align="right" style={{ padding: "12px 16px" }}>
                    <b>{b.quantityAvailable}</b> de {b.totalUnits} {b.saleUnitLabel}
                    {b.quantityAvailable === 1 ? "" : "s"}
                  </td>
                  <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: b.state === "NEW" ? "#e3f6ec" : b.state === "ACTIVE" ? "#fff4e0" : b.state === "DEPLETED" ? "#e5e7eb" : "#fde8e8", color: b.state === "NEW" ? "#0f7a4a" : b.state === "ACTIVE" ? "#b45309" : b.state === "DEPLETED" ? "#6b7280" : "#b91c1c" }}>{STATE_LABEL[b.state] || b.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
