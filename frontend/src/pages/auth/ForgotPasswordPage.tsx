import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordReset, verifyResetCode } from "../../services/accountService";
import { useToast } from "../../contexts/ToastContext";
import AuthCard, { authButton, authInput, authLabel } from "./AuthCard";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
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

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("O código tem 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const token = await verifyResetCode(email.trim(), code.trim());
      navigate("/redefinir-password?token=" + encodeURIComponent(token), { replace: true });
    } catch (err: any) {
      if (!err?.response) toast.error("Não foi possível ligar à internet.");
      else if (err.response.status === 400) toast.error("Código inválido ou expirado.");
      else toast.error("Não foi possível concluir. Tenta novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Recuperar palavra-passe">
      {sent ? (
        <form onSubmit={onVerify} autoComplete="off">
          <p style={{ color: "#475569", fontSize: "0.9rem", marginTop: 0 }}>
            Se o email existir, enviámos um código de confirmação de 6 dígitos. Introduz o código abaixo.
          </p>
          <div style={{ marginBottom: "1rem" }}>
            <label style={authLabel}>Código de confirmação</label>
            <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoComplete="one-time-code" style={{ ...authInput, letterSpacing: "0.4em", textAlign: "center", fontSize: "1.2rem" }} />
          </div>
          <button type="submit" disabled={loading} style={authButton(loading)}>
            {loading ? "A verificar…" : "Confirmar código"}
          </button>
          <div style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.9rem" }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setSent(false); setCode(""); }} style={{ color: "#2563eb" }}>Pedir novo código</a>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmit}>
          <p style={{ color: "#475569", fontSize: "0.9rem", marginTop: 0 }}>
            Indica o email da tua conta e enviamos-te um código de confirmação.
          </p>
          <div style={{ marginBottom: "1rem" }}>
            <label style={authLabel}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={authInput} />
          </div>
          <button type="submit" disabled={loading} style={authButton(loading)}>
            {loading ? "A enviar…" : "Enviar código"}
          </button>
        </form>
      )}
      <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
        <Link to="/login" style={{ color: "#2563eb" }}>Voltar a entrar</Link>
      </div>
    </AuthCard>
  );
}