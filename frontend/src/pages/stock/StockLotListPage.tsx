import { useEffect, useState } from "react";
import { getStockLots } from "../../services/stockService";
import type { StockLot } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

interface Props {
  hideAdminActions?: boolean;
}

// Só os campos que esta página usa, lidos do produto do lote.
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

export default function StockLotListPage(_props: Props) {
  const [lots, setLots] = useState<StockLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const groupedArray = Object.values(groups);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar o stock." onRetry={load} />;
  if (groupedArray.length === 0) {
    return <EmptyState message="Nenhum stock disponível de momento." />;
  }

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#f1f5f9", paddingBottom: "1rem", paddingTop: "0.5rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <PageHeader title="Stock (Agrupado por Produto)" actions={null} />
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "32%" }}>Produto</th>
              <th style={{ textAlign: "right" }}>Disponível</th>
              <th>Próx. Validade</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {groupedArray.map((group) => {
              const expired = group.earliestExpiry ? isExpired(group.earliestExpiry) : false;
              const soon = group.earliestExpiry ? isExpiringSoon(group.earliestExpiry) : false;

              return (
                <tr key={group.productName}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{group.productName}</div>
                    {group.subtitle && (
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{group.subtitle}</div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{group.totalQuantity}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {group.isMedicine ? "carteiras" : "unidades"}
                    </div>
                  </td>
                  <td
                    style={{
                      fontWeight: expired || soon ? "bold" : "normal",
                      color: !group.earliestExpiry ? "#64748b" : expired ? "#b91c1c" : soon ? "#ca8a04" : "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.earliestExpiry ? formatDate(group.earliestExpiry) : "Sem validade"}
                    {expired && " (Expirado)"}
                    {!expired && soon && " (A expirar)"}
                  </td>
                  <td>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      backgroundColor: group.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                      color: group.status === "ACTIVE" ? "#166534" : "#991b1b",
                    }}>
                      {group.status}
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
