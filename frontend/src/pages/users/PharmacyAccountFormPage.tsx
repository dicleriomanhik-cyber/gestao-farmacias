import CustomSelect from "../../components/ui/CustomSelect";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import {
  addAccountOperator,
  createPharmacyAccount,
  getPharmacyAccount,
  updateAccountOperator,
  updatePharmacyAccount,
  type PharmacyAccount,
} from "../../services/pharmacyAccountService";

const labelStyle = { display: "block", marginBottom: "0.5rem", fontWeight: 500 } as const;
const rowStyle = { marginBottom: "1rem" } as const;
const linkBtn = { color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" } as const;

function msgOf(err: any, fallback: string): string {
  if (!err?.response) return "Sem ligação neste momento. Tenta novamente quando houver internet.";
  const m = err.response?.data?.error?.message;
  return Array.isArray(m) ? m.join(" ") : (m ?? fallback);
}

export default function PharmacyAccountFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [pharmacyName, setPharmacyName] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [account, setAccount] = useState<PharmacyAccount | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function applyAccount(a: PharmacyAccount) {
    setAccount(a);
    setPharmacyName(a.name);
    setEmail(a.email ?? "");
    setStatus(a.status === "ACTIVE" ? "ACTIVE" : "INACTIVE");
  }

  function load() {
    if (!isEditing || !id) return;
    setLoading(true);
    setError(false);
    getPharmacyAccount(id)
      .then(applyAccount)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addName() {
    const n = newName.trim();
    if (n.length < 2) return toast.error("O nome deve ter pelo menos 2 caracteres.");
    if (isEditing && id) {
      setSubmitting(true);
      try {
        await addAccountOperator(id, n);
        setNewName("");
        setAccount(await getPharmacyAccount(id));
      } catch (err: any) {
        toast.error(msgOf(err, "Erro ao adicionar o colaborador."));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (names.some((x) => x.toLowerCase() === n.toLowerCase())) return toast.error("Esse nome já foi adicionado.");
    setNames([...names, n]);
    setNewName("");
  }

  async function toggleOperator(opId: string, isActive: boolean) {
    if (!id) return;
    setSubmitting(true);
    try {
      await updateAccountOperator(id, opId, { isActive });
      setAccount(await getPharmacyAccount(id));
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao actualizar o colaborador."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const farmacia = pharmacyName.trim();
    if (farmacia.length < 2) return toast.error("Indica o nome da farmácia.");
    const querPassword = !isEditing || password.length > 0;
    if (!isEditing) {
      if (!email.includes("@")) return toast.error("Email inválido.");
    }
    if (querPassword) {
      if (password.length < 8) return toast.error("A password deve ter pelo menos 8 caracteres.");
      if (password !== confirmPassword) return toast.error("As passwords não coincidem.");
    }
    const lista = [...names];
    const pendente = newName.trim();
    if (!isEditing && pendente.length >= 2 && !lista.some((x) => x.toLowerCase() === pendente.toLowerCase())) lista.push(pendente);
    if (!isEditing && lista.length === 0) return toast.error("Adiciona pelo menos um colaborador.");

    setSubmitting(true);
    try {
      if (isEditing && id) {
        await updatePharmacyAccount(id, { pharmacyName: farmacia, status, ...(password ? { password } : {}) });
        toast.success("Farmácia actualizada.");
      } else {
        await createPharmacyAccount({ pharmacyName: farmacia, operatorNames: lista, email: email.trim(), password });
        toast.success("Farmácia registada.");
      }
      navigate("/utilizadores");
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao guardar a farmácia."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a farmácia." onRetry={load} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}><button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>Voltar</button></div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        {isEditing ? "Editar farmácia" : "Nova farmácia"}
      </h1>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        {isEditing
          ? "O email não pode ser alterado. Podes renomear a farmácia, gerir os colaboradores e redefinir a password."
          : "O caixa entra no painel com este email e esta password e escolhe o seu nome na barra superior antes de vender."}
      </p>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div style={rowStyle}>
          <label style={labelStyle}>Nome da farmácia</label>
          <input type="text" className="input" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} required />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Nomes dos colaboradores</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              className="input"
              placeholder="Nome do colaborador"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!submitting) void addName();
                }
              }}
              style={{ flex: 1, minWidth: "200px" }}
            />
            <button type="button" className="btn btn-primary" onClick={addName} disabled={submitting}>Adicionar</button>
          </div>

          {!isEditing && names.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0" }}>
              {names.map((n) => (
                <li key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", backgroundColor: "#f3f4f6", borderRadius: "4px", marginBottom: "0.4rem" }}>
                  <span>{n}</span>
                  <button type="button" onClick={() => setNames(names.filter((x) => x !== n))} className="btn-soft-danger">Remover</button>
                </li>
              ))}
            </ul>
          )}

          {isEditing && account && account.operators.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0" }}>
              {account.operators.map((o) => (
                <li key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", backgroundColor: "#f3f4f6", borderRadius: "4px", marginBottom: "0.4rem", opacity: o.isActive ? 1 : 0.6 }}>
                  <span>{o.name}{o.isActive ? "" : " (inactivo)"}</span>
                  <button type="button" disabled={submitting} onClick={() => toggleOperator(o.id, !o.isActive)} style={linkBtn}>{o.isActive ? "Desactivar" : "Activar"}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Email de acesso</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isEditing}
            autoComplete="off"
            style={{ opacity: isEditing ? 0.6 : 1 }}
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>{isEditing ? "Nova password (deixa vazio para manter)" : "Password"}</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isEditing && password.length === 0 ? undefined : 8}
            required={!isEditing}
            autoComplete="new-password"
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Confirmar password</label>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required={!isEditing}
            autoComplete="new-password"
          />
        </div>

        {isEditing && (
          <div style={rowStyle}>
            <label style={labelStyle}>Estado da conta</label>
            <CustomSelect value={status} onChange={(v) => setStatus(v as "ACTIVE" | "INACTIVE")} options={[{ value: "ACTIVE", label: "Activa" }, { value: "INACTIVE", label: "Inactiva (não consegue entrar)" }]} />
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A guardar…" : isEditing ? "Guardar alterações" : "Registar farmácia"}
        </button>
      </form>
    </div>
  );
}