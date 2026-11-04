import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerPharmacy } from "../../services/accountService";
import { useToast } from "../../contexts/ToastContext";
import AuthCard, { authButton, authInput, authLabel } from "./AuthCard";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [pharmacyName, setPharmacyName] = useState("");
  
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const fail = (m: string) => {
      setError(m);
      toast.error(m);
    };
    if (pharmacyName.trim().length < 2) return fail("Indica o nome da farmácia.");
    if (adminName.trim().length < 3) return fail("Indica o teu nome.");
    if (!EMAIL_REGEX.test(email)) return fail("Email inválido.");
    if (password.length < 8) return fail("A palavra-passe deve ter pelo menos 8 caracteres.");
    if (password !== confirm) return fail("As palavras-passe não coincidem.");

    setLoading(true);
    try {
      await registerPharmacy({
        pharmacyName: pharmacyName.trim(),
        
        adminName: adminName.trim(),
        email: email.trim(),
        password,
      });
      toast.success("Conta criada. Já podes entrar.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      if (!err?.response) return fail("Não foi possível ligar à internet.");
      const m = err.response?.data?.error?.message;
      fail(Array.isArray(m) ? m.join(" ") : (m ?? "Não foi possível criar a conta."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Criar conta">
      <form onSubmit={onSubmit} autoComplete="off">
        <div style={{ marginBottom: "1rem" }}>
          <label style={authLabel}>Nome da farmácia</label>
          <input type="text" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} required style={authInput} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={authLabel}>O teu nome</label>
          <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} required style={authInput} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={authLabel}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={authInput} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={authLabel}>Palavra-passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" style={authInput} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={authLabel}>Confirmar palavra-passe</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" style={authInput} />
        </div>
        {error && <div role="alert" style={{ color: "crimson", marginBottom: "1rem", textAlign: "center" }}>{error}</div>}
        <button type="submit" disabled={loading} style={authButton(loading)}>
          {loading ? "A criar…" : "Criar conta"}
        </button>
      </form>
      <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.9rem", color: "#475569" }}>
        Já tenho conta? <Link to="/login" style={{ color: "#2563eb", fontWeight: 600 }}>Entrar</Link>
      </div>
    </AuthCard>
  );
}