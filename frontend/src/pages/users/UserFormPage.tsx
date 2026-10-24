import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createUser, getUserById, updateUser } from "../../services/userService";
import { ROLE_LABELS, type UserRole } from "../../types/users";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

const ROLES: UserRole[] = ["ADMIN", "PHARMACIST", "CASHIER", "STOCK_MANAGER"];

export default function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState<UserRole>("PHARMACIST");
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    if (!isEditing || !id) return;
    setLoading(true);
    setError(false);
    getUserById(id)
      .then((u) => {
        setEmail(u.email);
        setFullName(u.fullName);
        const role = (u.roles?.[0] as UserRole) ?? "PHARMACIST";
        setRoleName(role);
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
    if (!isEditing && !email.includes("@")) return toast.error("Email inválido.");
    if (!fullName.trim()) return toast.error("Nome é obrigatório.");
    if (!isEditing && password.length < 8) return toast.error("Password deve ter pelo menos 8 caracteres.");

    setSubmitting(true);
    try {
      if (isEditing && id) {
        await updateUser(id, { fullName: fullName.trim() });
        toast.success("Utilizador atualizado.");
      } else {
        await createUser({ email: email.trim(), fullName: fullName.trim(), password, roleName });
        toast.success("Utilizador criado.");
      }
      navigate("/utilizadores");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Erro ao guardar utilizador."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar o utilizador." onRetry={load} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
        {isEditing ? "Editar Utilizador" : "Novo Utilizador"}
      </h1>

      {isEditing && (
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
          O email e a função não podem ser alterados. Contacta o administrador para alterar.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Nome *</label>
          <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Email *</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isEditing}
            style={{ opacity: isEditing ? 0.6 : 1 }}
          />
        </div>

        {!isEditing && (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Password *</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Função *</label>
              <select value={roleName} onChange={(e) => setRoleName(e.target.value as UserRole)} className="input">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </>
        )}

        {isEditing && (
          <div style={{ marginBottom: "1.5rem", padding: "0.75rem", backgroundColor: "#f3f4f6", borderRadius: "4px", fontSize: "0.875rem" }}>
            <strong>Função:</strong> {ROLE_LABELS[roleName] ?? roleName}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A guardar…" : "Guardar Utilizador"}
        </button>
      </form>
    </div>
  );
}
