import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { hasPermission } from "../utils/permissions";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const permissions = user?.permissions ?? [];
  const displayName = user?.name || user?.email || "—";

  const allItems = [
    { path: "/", label: "Dashboard", show: true },
    { path: "/produtos", label: "Produtos", show: hasPermission(permissions, "products:read") },
    { path: "/stock/lotes", label: "Stock", show: hasPermission(permissions, "stock:read") },
    { path: "/despesas", label: "Despesas", show: hasPermission(permissions, "expenses:read") },
    { path: "/relatorios", label: "Relatórios", show: hasPermission(permissions, "reports:read") },
    { path: "/utilizadores", label: "Utilizadores", show: hasPermission(permissions, "users:read") },
  ];

  const menuItems = allItems.filter((item) => item.show);

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-container" style={{ position: "relative" }}>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 999 }}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">Farmácia MZ</div>
        
        {hasPermission(permissions, "sales:create") && (
          <div style={{ padding: "0 1rem 1rem 1rem" }}>
            <Link to="/pos" style={{ display: "block", textAlign: "center", backgroundColor: "#2563eb", color: "white", padding: "0.5rem", borderRadius: "4px", textDecoration: "none", fontWeight: "bold" }}>
              🛒 Abrir POS
            </Link>
          </div>
        )}

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}
              className="mobile-menu-btn"
            >
              ☰
            </button>
            <h2>Sistema de Gestão</h2>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="header-user-name" style={{ fontWeight: 500 }}>{displayName}</span>
            <button onClick={onLogout} type="button">Sair</button>
          </div>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
