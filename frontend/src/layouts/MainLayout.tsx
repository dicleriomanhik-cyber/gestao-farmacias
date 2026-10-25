import { Outlet, useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasPermission } from "../utils/permissions";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const permissions = user?.permissions ?? [];
  const displayName = user?.name || user?.email || "—";

  const allItems = [
    { path: "/", label: "Dashboard", show: true },
    { path: "/produtos", label: "Produtos", show: hasPermission(permissions, "products:read") },
    { path: "/stock/lotes", label: "Stock", show: hasPermission(permissions, "stock:read") },

    { path: "/despesas", label: "Despesas", show: hasPermission(permissions, "expenses:read") },
    { path: "/devolucoes", label: "Devoluções", show: hasPermission(permissions, "returns:read") },
    { path: "/relatorios", label: "Relatórios", show: hasPermission(permissions, "reports:read") },
    { path: "/utilizadores", label: "Utilizadores", show: hasPermission(permissions, "users:read") },
  ];

  const navItems = allItems.filter((item) => item.show);

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", backgroundColor: "#f1f5f9" }}>
      <header style={{ backgroundColor: "#1e293b", color: "white", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold" }}>Sistema de Gestão</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <span style={{ fontSize: "0.875rem" }}>{displayName}</span>
          <Link to="/pos" style={{ color: "#93c5fd", textDecoration: "none", fontSize: "0.875rem" }}>Abrir POS</Link>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #475569", color: "white", padding: "0.4rem 1rem", borderRadius: "6px", cursor: "pointer" }}>
            Sair
          </button>
        </div>
      </header>

      <nav style={{ backgroundColor: "#334155", display: "flex", overflowX: "auto", padding: "0 1.5rem", flexShrink: 0 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            style={({ isActive }) => ({
              padding: "0.75rem 1rem",
              color: isActive ? "#fff" : "#94a3b8",
              textDecoration: "none",
              fontWeight: isActive ? "bold" : "normal",
              borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
              whiteSpace: "nowrap",
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", width: "100%", boxSizing: "border-box" }}>
        <Outlet />
      </div>
    </div>
  );
}
