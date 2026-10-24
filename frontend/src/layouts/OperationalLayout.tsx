import { Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function OperationalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f9fafb" }}>
      <header style={{ backgroundColor: "#1e293b", color: "white", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Farmácia MZ</h1>
          <span style={{ backgroundColor: "#3b82f6", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>MODO OPERAÇÃO</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.875rem" }}>
          <span>{user?.name || user?.email}</span>
          <Link to="/" style={{ color: "#93c5fd", textDecoration: "none" }}>Sair do POS</Link>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #64748b", color: "white", padding: "0.25rem 0.75rem", borderRadius: "4px", cursor: "pointer" }}>Sair</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: "1rem", maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <Outlet />
      </main>
    </div>
  );
}
