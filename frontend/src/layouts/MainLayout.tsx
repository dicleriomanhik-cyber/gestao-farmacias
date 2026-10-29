import { Outlet, useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasPermission } from "../utils/permissions";
import SyncStatusBadge from "../components/offline/SyncStatusBadge";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const permissions = user?.permissions ?? [];
  const displayName = user?.name || user?.email || "—";

  const allItems = [
    { path: "/", label: "Dashboard", show: true },
    { path: "/caixa-admin", label: "Gestão de Caixa", show: hasPermission(permissions, "cash:open") },
    { path: "/produtos", label: "Produtos", show: hasPermission(permissions, "products:read") },
    { path: "/stock/caixas", label: "Stock", show: hasPermission(permissions, "stock:read") },
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
    <div className="app-shell">
      <header className="app-header">
        <h2 className="app-brand">Sistema de Gestão</h2>
        <div className="app-actions">
          <SyncStatusBadge />
          <span className="app-user header-user-name">{displayName}</span>
          <Link to="/pos" className="app-link-pos">Abrir POS</Link>
          <button type="button" onClick={onLogout} className="app-logout">Sair</button>
        </div>
      </header>

      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === "/"}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="app-content">
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}