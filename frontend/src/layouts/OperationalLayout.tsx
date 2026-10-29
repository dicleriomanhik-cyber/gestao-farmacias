import { Outlet, useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SyncStatusBadge from "../components/offline/SyncStatusBadge";

export default function OperationalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const navItems = [
    { path: "/pos", label: "Nova Venda", end: true },
    { path: "/pos/caixa", label: "Caixa" },
    { path: "/pos/despesas", label: "Despesas" },
    { path: "/pos/stock", label: "Stock" },
    { path: "/pos/devolucoes", label: "Devoluções" },
    { path: "/pos/historico", label: "Histórico" },
    { path: "/pos/movimentos", label: "Movimentos" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", backgroundColor: "#f1f5f9" }}>
      <header className="app-header">
        <h2 className="app-brand">Sistema de Gestão</h2>
        <div className="app-actions">
          <SyncStatusBadge />
          <span className="app-user header-user-name">{user?.name || user?.email}</span>
          <Link to="/" className="app-link-exit">Sair do POS</Link>
          <button type="button" onClick={onLogout} className="app-logout">Sair</button>
        </div>
      </header>

      <nav style={{ backgroundColor: "#334155", display: "flex", overflowX: "auto", padding: "0 1.5rem", flexShrink: 0 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
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

      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}