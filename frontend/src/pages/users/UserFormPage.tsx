import CustomSelect from "../../components/ui/CustomSelect";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createUser, getUserById, updateUser } from "../../services/userService";
import type { UserStatus } from "../../types/users";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import OperatorsPanel from "../../components/users/OperatorsPanel";
import ErrorState from "../../components/ui/ErrorState";

export default function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<UserStatus>("ACTIVE");
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  function load() {
    if (!isEditing || !id) return;
    setLoading(true);
    setError(false);
    getUserById(id)
      .then((u) => {
        setEmail(u.email);
        setIsAdmin(((u.roles as any[]) ?? []).some((r: any) => (typeof r === "string" ? r : r?.role?.name ?? r?.name) === "ADMIN"));
        setFullName(u.fullName);
        setStatus(u.status === "ACTIVE" ? "ACTIVE" : "INACTIVE");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = fullName.trim();
    if (!isEditing && !email.includes("@")) return toast.error("Email inválido.");
    if (!isEditing && nome.length < 3) return toast.error("O nome deve ter pelo menos 3 caracteres.");
    const querPassword = !isEditing || password.length > 0;
    if (querPassword) {
      if (password.length < 8) return toast.error("A password deve ter pelo menos 8 caracteres.");
      if (password !== confirmPassword) return toast.error("As passwords não coincidem.");
    }

    setSubmitting(true);
    try {
      if (isEditing && id) {
        await updateUser(id, { fullName, status, ...(password ? { password } : {}) });
        toast.success("Conta atualizada.");
      } else {
        await createUser({ email: email.trim(), fullName: nome, password, roleName: "COLLABORATOR" });
        toast.success("Conta de colaborador criada.");
      }
      navigate("/utilizadores");
    } catch (err: any) {
      if (!err?.response) {
        toast.error("Sem ligação neste momento. Tenta novamente quando houver internet.");
        return;
      }
      const msg = err.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Erro ao guardar a conta."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a conta." onRetry={load} />;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}><div className="card" style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        {isEditing ? (isAdmin ? "Editar conta de administrador" : "Editar conta de colaborador") : "Nova conta de colaborador"}
      </h1>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        {isEditing
          ? (isAdmin ? "O email n\u00e3o pode ser alterado. Podes redefinir a palavra-passe." : "O email não pode ser alterado. Podes redefinir a password ou desativar a conta.")
          : "O colaborador entra no painel dele com este email e esta password. Entrega-lhe estas credenciais."}
      </p>

      <form onSubmit={handleSubmit} autoComplete="off">
        {!isEditing && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Nome</label>
            <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Email de acesso</label>
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

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            {isEditing ? "Nova password (deixa vazio para manter)" : "Password"}
          </label>
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

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Confirmar password{isEditing ? "" : " *"}</label>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required={!isEditing}
            autoComplete="new-password"
          />
        </div>

        {isEditing && !isAdmin && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Estado da conta</label>
            <CustomSelect value={status} onChange={(v) => setStatus(v as UserStatus)} options={[{ value: "ACTIVE", label: "Ativa" }, { value: "INACTIVE", label: "Inativa (não consegue entrar)" }]} />
          </div>
        )}

        <div style={{ marginBottom: "1.5rem", padding: "0.75rem", backgroundColor: "#f3f4f6", borderRadius: "4px", fontSize: "0.875rem" }}>
          <strong>Função:</strong> {isAdmin ? "Administrador" : "Colaborador"}
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A guardar…" : isEditing ? "Guardar alterações" : "Criar conta"}
        </button>
      </form>
      </div>
      {isEditing && !isAdmin && <OperatorsPanel />}
    </div>
  );
}