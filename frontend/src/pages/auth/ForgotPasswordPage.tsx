import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/accountService";
import { useToast } from "../../contexts/ToastContext";
import AuthCard, { authButton, authInput, authLabel } from "./AuthCard";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      toast.error("Email inválido.");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response ? "Não foi possível concluir. Tenta novamente mais tarde." : "Não foi possível ligar à internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Recuperar palavra-passe">
      {sent ? (
        <div style={{ textAlign: "center", color: "#334155" }}>
          Se o email existir, enviámos uma ligação para redefinir a palavra-passe. Verifica a tua caixa de entrada.
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <p style={{ color: "#475569", fontSize: "0.9rem", marginTop: 0 }}>
            Indica o email da tua conta e enviamos-te uma ligação para escolheres uma nova palavra-passe.
          </p>
          <div style={{ marginBottom: "1rem" }}>
            <label style={authLabel}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={authInput} />
          </div>
          <button type="submit" disabled={loading} style={authButton(loading)}>
            {loading ? "A enviar…" : "Enviar ligação"}
          </button>
        </form>
      )}
      <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
        <Link to="/login" style={{ color: "#2563eb" }}>Voltar a entrar</Link>
      </div>
    </AuthCard>
  );
}