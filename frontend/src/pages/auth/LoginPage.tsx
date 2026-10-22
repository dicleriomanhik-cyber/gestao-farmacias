import { type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../contexts/ToastContext";
import type { ApiErrorEnvelope } from "../../types/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login, loginAsDemo } = useAuth();
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
      await login({ email, password });
      toast.success("Sessão iniciada com sucesso.");
      const to = location.state?.from?.pathname ?? "/";
      navigate(to, { replace: true });
    } catch (err) {
      const ax = err as AxiosError<ApiErrorEnvelope>;
      let msg = "Não foi possível autenticar.";
      if (!ax.response) msg = "Falha de rede. Tente novamente.";
      else if (ax.response.status === 401) msg = "Credenciais inválidas.";
      else if (ax.response.status >= 500) msg = "Erro no servidor.";
      else msg = ax.response.data?.error?.message ?? msg;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDemo() {
    loginAsDemo();
    toast.info("Sessão de demonstração iniciada.");
    navigate("/", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6", padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <h1 className="card-title" style={{ textAlign: "center", marginBottom: "1.5rem" }}>Entrar</h1>
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
          <button type="button" onClick={handleDemo} style={{ width: "100%", padding: "0.75rem", marginTop: "1rem", backgroundColor: "#e5e7eb", color: "#374151", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Entrar (Modo Demo)
          </button>
        </form>
      </div>
    </div>
  );
}
