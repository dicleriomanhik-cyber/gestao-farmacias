import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers } from "../../services/userService";
import { ROLE_LABELS, type ManagedUser, type UserRole, type PaginatedMeta } from "../../types/users";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission } from "../../utils/permissions";

export default function UserListPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getUsers({ page, limit: 20 })
      .then((res) => {
        setUsers(res.data);
        setMeta(res.meta);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;
  if (users.length === 0 && page === 1) {
    return <EmptyState message="Nenhum utilizador registado." />;
  }

  function primaryRole(u: ManagedUser): string {
    const role = u.roles?.[0] as UserRole | undefined;
    return role ? ROLE_LABELS[role] ?? role : "—";
  }

  const canWrite = hasPermission(user?.permissions, "users:write");

  return (
    <div>
      <PageHeader
        title="Utilizadores"
        actions={canWrite ? <Link to="/utilizadores/novo" className="btn btn-primary">+ Novo Utilizador</Link> : null}
      />

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Função</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{primaryRole(u)}</td>
                <td>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    backgroundColor: u.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                    color: u.status === "ACTIVE" ? "#166534" : "#991b1b",
                  }}>
                    {u.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  {canWrite ? (
                    <Link to={`/utilizadores/${u.id}/editar`} style={{ color: "#2563eb", textDecoration: "none" }}>
                      Editar
                    </Link>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-secondary" style={{ opacity: page <= 1 ? 0.5 : 1 }}>
            Anterior
          </button>
          <span style={{ color: "#6b7280" }}>Página {meta.page} de {meta.totalPages} — {meta.total} registos</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="btn btn-secondary" style={{ opacity: page >= meta.totalPages ? 0.5 : 1 }}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
