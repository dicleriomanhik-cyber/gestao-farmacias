import { Outlet, useNavigate, Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function OperationalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const navItems = [
    { path: "/pos", label: "Nova Venda", end: true },
    { path: "/pos/historico", label: "Histórico" },
    { path: "/pos/stock", label: "Stock" },
  ];

  return (
    <div className="app-container">
      <main className="main-content">
        {/* HEADER ESCURO */}
        <header style={{ backgroundColor: "#1e293b", color: "white", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Farmácia MZ</h2>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{user?.name || user?.email}</span>
            <Link to="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: "0.875rem" }}>Sair do POS</Link>
            <button onClick={onLogout} type="button" style={{ background: "none", border: "1px solid #64748b", color: "white", padding: "0.25rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.875rem" }}>Sair</button>
          </div>
        </header>

        {/* NAVBAR ESCURA */}
        <nav style={{ backgroundColor: "#334155", display: "flex", overflowX: "auto", padding: "0 1rem" }}>
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

        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
