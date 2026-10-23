export default function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Dashboard</h1>
        <span style={{ backgroundColor: "#fef08a", color: "#854d0e", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.875rem" }}>
          Modo Demonstração (Dados Fictícios)
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Vendas Hoje</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>12.500,00 MT</p>
          <span style={{ color: "green", fontSize: "0.875rem" }}>↑ 12% vs ontem</span>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Produtos em Stock</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>1.245</p>
          <span style={{ color: "green", fontSize: "0.875rem" }}>3 categorias novas</span>
        </div>
        <div className="card" style={{ padding: "1rem" }}>
          <h3 style={{ color: "#6b7280", fontSize: "0.875rem" }}>Alertas de Validade</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#b91c1c" }}>5</p>
          <span style={{ color: "#b91c1c", fontSize: "0.875rem" }}>Lotes a expirar em 30 dias</span>
        </div>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>Vendas Recentes</h2>
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "0.5rem" }}>ID</th>
              <th style={{ padding: "0.5rem" }}>Cliente</th>
              <th style={{ padding: "0.5rem" }}>Total</th>
              <th style={{ padding: "0.5rem" }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "0.5rem" }}>#001</td>
              <td style={{ padding: "0.5rem" }}>João Silva</td>
              <td style={{ padding: "0.5rem" }}>450,00 MT</td>
              <td style={{ padding: "0.5rem", color: "green" }}>Concluída</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "0.5rem" }}>#002</td>
              <td style={{ padding: "0.5rem" }}>Maria Santos</td>
              <td style={{ padding: "0.5rem" }}>1.200,00 MT</td>
              <td style={{ padding: "0.5rem", color: "green" }}>Concluída</td>
            </tr>
            <tr>
              <td style={{ padding: "0.5rem" }}>#003</td>
              <td style={{ padding: "0.5rem" }}>Carlos Pereira</td>
              <td style={{ padding: "0.5rem" }}>85,00 MT</td>
              <td style={{ padding: "0.5rem", color: "#ca8a04" }}>Pendente</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}