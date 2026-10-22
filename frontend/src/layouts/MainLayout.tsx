import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/", label: "Dashboard" },
    { path: "/produtos", label: "Produtos" },
    { path: "/stock/lotes", label: "Stock" },
    { path: "/vendas", label: "Vendas" },
    { path: "/caixa", label: "Caixa" },
    { path: "/compras", label: "Compras" },
    { path: "/despesas", label: "Despesas" },
    { path: "/relatorios", label: "Relatórios" },
  ];

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">Farmácia MZ</div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <h2>Sistema de Gestão</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontWeight: 500 }}>{user?.name ?? "—"}</span>
            <button onClick={onLogout} type="button">
              Sair
            </button>
          </div>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
