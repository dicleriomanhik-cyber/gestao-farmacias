import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../contexts/ToastContext";
import type { ApiErrorEnvelope } from "../../types/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage({ variant = "admin" }: { variant?: "admin" | "pos" }) {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email)) {
      setError("Email inválido.");
      toast.error("Email inválido.");
      return;
    }
    if (password.length < 6) {
      setError("Password deve ter pelo menos 6 caracteres.");
      toast.error("Password deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await login({ email, password, accessType: variant === "pos" ? "COLLABORATOR" : "ADMIN" });
      toast.success("Sessão iniciada com sucesso.");
      const to = location.state?.from?.pathname ?? (variant === "pos" ? "/pos" : "/");
      navigate(to, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<ApiErrorEnvelope>;
      const status = ax.response?.status;
      const code = ax.response?.data?.error?.code;

      let msg: string;

      if (!ax.response) {
        msg = "Não foi possível ligar à internet.";
      } else if (status === 401) {
        msg = "Credenciais inválidas.";
      } else if (status === 403 && code === "INVALID_CREDENTIALS") {
        msg = "Credenciais inválidas.";
      } else if (status === 403) {
        msg = "Acesso negado.";
      } else if (status === 400) {
        msg = "Dados inválidos. Verifica os campos.";
      } else if (status && status >= 500) {
        msg = "Não foi possível concluir. Tenta novamente mais tarde.";
      } else {
        msg = ax.response?.data?.error?.message ?? "Não foi possível autenticar.";
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6", padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <h1 className="card-title" style={{ textAlign: "center", marginBottom: "1.5rem" }}>Entrar</h1>
<div style={{ display: "flex", marginBottom: "1.25rem", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
<Link to="/login" replace style={{ flex: 1, textAlign: "center", padding: "0.5rem", textDecoration: "none", fontWeight: 600, backgroundColor: variant === "admin" ? "#2563eb" : "white", color: variant === "admin" ? "white" : "#475569" }}>Administrador</Link>
<Link to="/pos/login" replace style={{ flex: 1, textAlign: "center", padding: "0.5rem", textDecoration: "none", fontWeight: 600, backgroundColor: variant === "pos" ? "#2563eb" : "white", color: variant === "pos" ? "white" : "#475569" }}>POS</Link>
</div>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }}
            />
          </div>
          {error && (
            <div role="alert" style={{ color: "crimson", marginBottom: "1rem", textAlign: "center" }}>{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer", fontWeight: "bold", opacity: loading ? 0.6 : 1 }}>
            {loading ? "A entrar…" : "Entrar"}
          </button>
        </form>
        {variant === "admin" && (
          <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
            <Link to="/esqueci-password" style={{ color: "#2563eb" }}>Esqueci a palavra-passe</Link>
            <div style={{ marginTop: "0.75rem", color: "#475569" }}>
              Ainda não tens conta? <Link to="/criar-conta" style={{ color: "#2563eb", fontWeight: 600 }}>Criar conta</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
