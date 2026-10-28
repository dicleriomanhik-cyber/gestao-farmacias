import { NavLink, Outlet, useParams } from "react-router-dom";

const base = { padding: "8px 14px", borderRadius: 8, border: "1px solid #d9dee9", fontSize: 14, textDecoration: "none", cursor: "pointer" } as const;

export default function StockLayout() {
  const { id } = useParams();
  const tab = (active: boolean) => ({
    ...base,
    background: active ? "#2f5bd3" : "#ffffff",
    color: active ? "#ffffff" : "#1d2433",
    borderColor: active ? "#2f5bd3" : "#d9dee9",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <NavLink to="/stock/caixas/nova" end style={({ isActive }) => tab(isActive)}>Registar caixa</NavLink>
        <NavLink to="/stock/caixas" end style={({ isActive }) => tab(isActive)}>Caixas em stock</NavLink>
        {id ? (
          <span style={tab(true)}>Detalhe da caixa</span>
        ) : (
          <span style={{ ...base, background: "#f4f6fa", color: "#9aa4b8", cursor: "not-allowed" }} title="Escolhe uma caixa em Caixas em stock">Detalhe da caixa</span>
        )}
      </div>
      <Outlet />
    </div>
  );
}
