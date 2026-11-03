import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../services/accountService";
import { useToast } from "../../contexts/ToastContext";
import AuthCard, { authButton, authInput, authLabel } from "./AuthCard";

export default function ResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success("Palavra-passe alterada. Já podes entrar.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      if (!err?.response) toast.error("Não foi possível ligar à internet.");
      else if (err.response.status === 400) toast.error("A ligação é inválida ou já expirou. Pede uma nova.");
      else toast.error("Não foi possível concluir. Tenta novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthCard title="Nova palavra-passe">
        <div style={{ textAlign: "center", color: "#334155" }}>A ligação é inválida. Pede uma nova.</div>
        <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
          <Link to="/esqueci-password" style={{ color: "#2563eb" }}>Pedir nova ligação</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nova palavra-passe">
      <form onSubmit={onSubmit} autoComplete="off">
        <div style={{ marginBottom: "1rem" }}>
          <label style={authLabel}>Nova palavra-passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" style={authInput} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={authLabel}>Confirmar palavra-passe</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" style={authInput} />
        </div>
        <button type="submit" disabled={loading} style={authButton(loading)}>
          {loading ? "A guardar…" : "Guardar palavra-passe"}
        </button>
      </form>
    </AuthCard>
  );
}