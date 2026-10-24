import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
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
    { path: "/categorias", label: "Categorias", show: hasPermission(permissions, "products:read") },
    { path: "/fornecedores", label: "Fornecedores", show: hasPermission(permissions, "suppliers:read") },
    { path: "/stock/lotes", label: "Stock", show: hasPermission(permissions, "stock:read") },
    { path: "/vendas", label: "Vendas", show: hasPermission(permissions, "sales:read") },
    { path: "/caixa", label: "Caixa", show: hasPermission(permissions, "cash:open") },
    { path: "/compras", label: "Compras", show: hasPermission(permissions, "purchases:read") },
    { path: "/despesas", label: "Despesas", show: hasPermission(permissions, "expenses:read") },
    { path: "/relatorios", label: "Relatórios", show: hasPermission(permissions, "reports:read") },
    { path: "/utilizadores", label: "Utilizadores", show: hasPermission(permissions, "users:read") },
    { path: "/farmacia", label: "Farmácia", show: hasPermission(permissions, "pharmacy:config:read") },
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
        
        {/* Botão de Atalho para o Modo Operação */}
        {hasPermission(permissions, "sales:create") && (
          <div style={{ padding: "0 1rem 1rem 1rem" }}>
            <Link to="/pos" style={{ display: "block", textAlign: "center", backgroundColor: "#2563eb", color: "white", padding: "0.5rem", borderRadius: "4px", textDecoration: "none", fontWeight: "bold" }}>
              🛒 Abrir POS
            </Link>
          </div>
        )}

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
            <span style={{ fontWeight: 500 }}>{displayName}</span>
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
