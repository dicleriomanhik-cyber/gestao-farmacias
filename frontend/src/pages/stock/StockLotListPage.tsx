import { useState } from "react";
import { getStockLots } from "../../services/stockService";
import type { StockLot } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useEffect } from "react";

interface Props {
  hideAdminActions?: boolean;
}

type LotProduct = {
  name?: string;
  type?: string;
  dosageForm?: string | null;
};

interface Group {
  productName: string;
  subtitle: string | null;
  isMedicine: boolean;
  totalQuantity: number;
  earliestExpiry: string | null;
  status: string;
}

const DIVIDER = "1px solid #e2e8f0";
const cell = { padding: "0.8rem 1rem", verticalAlign: "middle" } as const;
const divided = { ...cell, borderLeft: DIVIDER } as const;

export default function StockLotListPage(_props: Props) {
  const [lots, setLots] = useState<StockLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  function load() {
    setLoading(true);
    setError(false);
    getStockLots()
      .then(setLots)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function isExpiringSoon(dateStr: string) {
    const expiry = new Date(dateStr).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return expiry - Date.now() < thirtyDays && expiry > Date.now();
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr).getTime() < Date.now();
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getUTCFullYear()}`;
  }

  const groups: Record<string, Group> = {};
  for (const lot of lots) {
    const product = lot.product as LotProduct | undefined;
    const productName = product?.name ?? "Desconhecido";

    if (!groups[productName]) {
      groups[productName] = {
        productName,
        subtitle: product?.dosageForm || null,
        isMedicine: product?.type === "MEDICINE",
        totalQuantity: 0,
        earliestExpiry: lot.expiryDate,
        status: lot.status,
      };
    }

    const group = groups[productName];
    group.totalQuantity += lot.quantityAvailable;

    if (lot.expiryDate) {
      if (!group.earliestExpiry || new Date(lot.expiryDate) < new Date(group.earliestExpiry)) {
        group.earliestExpiry = lot.expiryDate;
      }
    }
  }

  const term = query.trim().toLowerCase();
  const groupedArray = Object.values(groups).filter((g) =>
    g.productName.toLowerCase().includes(term)
  );
  const hasAny = Object.keys(groups).length > 0;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar o stock." onRetry={load} />;
  if (!hasAny) {
    return <EmptyState message="Nenhum stock disponível de momento." />;
  }

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#f1f5f9", paddingBottom: "1rem", paddingTop: "0.5rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <PageHeader title="Stock" actions={null} />
        <input
          type="search"
          placeholder="Pesquisar produto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #d9dee9", borderRadius: 8, font: "inherit", background: "#fff", marginTop: "0.5rem" }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ ...cell, width: "44%" }}>Produto</th>
              <th style={{ ...divided, width: "18%", textAlign: "left" }}>Carteiras disponíveis</th>
              <th style={{ ...divided, width: "20%", textAlign: "center" }}>Próxima validade</th>
              <th style={{ ...divided, width: "18%", textAlign: "center" }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {groupedArray.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...cell, textAlign: "center", color: "#64748b" }}>
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {groupedArray.map((group) => {
              const expired = group.earliestExpiry ? isExpired(group.earliestExpiry) : false;
              const soon = group.earliestExpiry ? isExpiringSoon(group.earliestExpiry) : false;

              return (
                <tr key={group.productName}>
                  <td style={cell}>
                    <div style={{ fontWeight: 600 }}>{group.productName}</div>
                    {group.subtitle && (
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{group.subtitle}</div>
                    )}
                  </td>
                  <td style={{ ...divided, textAlign: "left" }}>
                    <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{group.totalQuantity}</span>{" "}
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {group.isMedicine ? "carteiras" : "unidades"}
                    </span>
                  </td>
                  <td
                    style={{
                      ...divided,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      fontWeight: expired || soon ? "bold" : "normal",
                      color: !group.earliestExpiry ? "#64748b" : expired ? "#b91c1c" : soon ? "#ca8a04" : "inherit",
                    }}
                  >
                    {group.earliestExpiry ? formatDate(group.earliestExpiry) : "Sem validade"}
                    {expired && " (Expirado)"}
                    {!expired && soon && " (A expirar)"}
                  </td>
                  <td style={{ ...divided, textAlign: "center" }}>
                    <span style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "999px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      backgroundColor: group.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                      color: group.status === "ACTIVE" ? "#166534" : "#991b1b",
                    }}>
                      {group.status === "ACTIVE" ? "Disponível" : group.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
