import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  canAccessSales, canAccessCash, canAccessProducts,
  canAccessStock, canAccessPurchases, canAccessExpenses, canAccessReports,
} from "../utils/permissions";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const allItems = [
    { path: "/", label: "Dashboard", show: true },
    { path: "/produtos", label: "Produtos", show: canAccessProducts(user?.role) },
    { path: "/stock/lotes", label: "Stock", show: canAccessStock(user?.role) },
    { path: "/vendas", label: "Vendas", show: canAccessSales(user?.role) },
    { path: "/caixa", label: "Caixa", show: canAccessCash(user?.role) },
    { path: "/compras", label: "Compras", show: canAccessPurchases(user?.role) },
    { path: "/despesas", label: "Despesas", show: canAccessExpenses(user?.role) },
    { path: "/relatorios", label: "Relatórios", show: canAccessReports(user?.role) },
  ];

  const menuItems = allItems.filter((item) => item.show);

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
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
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

