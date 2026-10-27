import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStockLots } from "../../services/stockService";

import type { StockLot } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

interface Props {
  hideAdminActions?: boolean;
}

export default function StockLotListPage({ hideAdminActions = false }: Props) {
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
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return expiry - now < thirtyDays && expiry > now;
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr).getTime() < Date.now();
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  // Agrupar os lotes por produto
  const groupedLots = lots.reduce((acc, lot) => {
    const productName = lot.product?.name ?? "Desconhecido";
    if (!acc[productName]) {
      acc[productName] = {
        productName,
        totalQuantity: 0,
        earliestExpiry: lot.expiryDate,
        lotNumbers: [],
        status: lot.status,
      };
    }
    
    acc[productName].totalQuantity += lot.quantityAvailable;
    acc[productName].lotNumbers.push(lot.lotNumber);
    
    // Guardar a validade mais próxima (ou a mais antiga se já expirou)
    if (lot.expiryDate) {
      if (!acc[productName].earliestExpiry || new Date(lot.expiryDate) < new Date(acc[productName].earliestExpiry!)) {
        acc[productName].earliestExpiry = lot.expiryDate;
      }
    }

    return acc;
  }, {} as Record<string, { productName: string; totalQuantity: number; earliestExpiry: string | null; lotNumbers: string[]; status: string }>);

  const groupedArray = Object.values(groupedLots);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os lotes de stock." onRetry={load} />;
  if (groupedArray.length === 0) {
    return <EmptyState message="Nenhum lote em stock. Recebe mercadoria para começar." />;
  }

  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#f1f5f9", paddingBottom: "1rem", paddingTop: "0.5rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <PageHeader
        title="Stock (Agrupado por Produto)"
        actions={
          !hideAdminActions ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link to="/stock/novo" className="btn btn-primary">+ Adicionar Stock</Link>
              <Link to="/stock/ajustar" className="btn btn-warning">Ajustar Stock</Link>
            </div>
          ) : null
        }
      />
      </div>
<div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Lotes</th>
              <th>Qtd Total</th>
              <th>Próx. Validade</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {groupedArray.map((group) => (
              <tr key={group.productName}>
                <td>{group.productName}</td>
                <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{group.lotNumbers.join(", ")}</td>
                <td style={{ fontWeight: "bold" }}>{group.totalQuantity}</td>
                <td
                  style={{
                    fontWeight: group.earliestExpiry && (isExpiringSoon(group.earliestExpiry) || isExpired(group.earliestExpiry)) ? "bold" : "normal",
                    color: !group.earliestExpiry ? "#64748b" : isExpired(group.earliestExpiry) ? "#b91c1c" : isExpiringSoon(group.earliestExpiry) ? "#ca8a04" : "inherit",
                  }}
                >
                  {group.earliestExpiry ? formatDate(group.earliestExpiry) : "Sem validade"}
                  {group.earliestExpiry && isExpired(group.earliestExpiry) && " (Expirado)"}
                  {group.earliestExpiry && !isExpired(group.earliestExpiry) && isExpiringSoon(group.earliestExpiry) && " (A expirar)"}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}







