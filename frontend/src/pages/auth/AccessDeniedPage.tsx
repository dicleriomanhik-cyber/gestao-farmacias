import { Link } from "react-router-dom";

export default function AccessDeniedPage() {
  return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#991b1b", marginBottom: "0.5rem" }}>Acesso negado</h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>Não tens permissão para aceder a esta área.</p>
      <Link to="/" className="btn btn-primary">Voltar ao Dashboard</Link>
    </div>
  );
}
