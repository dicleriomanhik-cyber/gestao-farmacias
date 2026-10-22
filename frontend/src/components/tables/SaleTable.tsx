import { Link } from "react-router-dom";
import type { Sale } from "../../types/sales";

export default function SaleTable({ sales }: { sales: Sale[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
            <th style={{ padding: "0.75rem" }}>ID</th>
            <th style={{ padding: "0.75rem" }}>Data</th>
            <th style={{ padding: "0.75rem" }}>Método</th>
            <th style={{ padding: "0.75rem" }}>Total</th>
            <th style={{ padding: "0.75rem" }}>Estado</th>
            <th style={{ padding: "0.75rem" }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "0.75rem" }}>#{sale.id.substring(0, 6)}</td>
              <td style={{ padding: "0.75rem" }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: "0.75rem" }}>{sale.paymentMethod}</td>
              <td style={{ padding: "0.75rem" }}>{sale.total} MT</td>
              <td style={{ padding: "0.75rem" }}>
                <span style={{
                  padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem",
                  backgroundColor: sale.status === "CONFIRMED" ? "#dcfce7" : "#fef08a",
                  color: sale.status === "CONFIRMED" ? "#166534" : "#854d0e"
                }}>
                  {sale.status}
                </span>
              </td>
              <td style={{ padding: "0.75rem" }}>
                <Link to={`/vendas/${sale.id}`} style={{ color: "#2563eb", textDecoration: "none" }}>Ver Detalhe</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
