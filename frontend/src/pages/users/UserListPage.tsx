import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUsers } from "../../services/userService";
import { getPharmacyAccounts, type PharmacyAccount } from "../../services/pharmacyAccountService";
import { ROLE_LABELS, type ManagedUser, type UserRole, type PaginatedMeta } from "../../types/users";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

import { useAuth } from "../../hooks/useAuth";
import { hasPermission } from "../../utils/permissions";

function isAdminUser(u: ManagedUser): boolean {
  return ((u.roles as any[]) ?? []).some((r: any) => (typeof r === "string" ? r : r?.role?.name ?? r?.role ?? r?.name) === "ADMIN");
}

function badge(active: boolean, on: string, off: string) {
  return (
    <span style={{
      padding: "0.25rem 0.5rem",
      borderRadius: "4px",
      fontSize: "0.875rem",
      backgroundColor: active ? "#dcfce7" : "#fee2e2",
      color: active ? "#166534" : "#991b1b",
    }}>
      {active ? on : off}
    </span>
  );
}

export default function UserListPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [accounts, setAccounts] = useState<PharmacyAccount[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([getUsers({ page, limit: 20 }), getPharmacyAccounts()])
      .then(([res, acc]) => {
        const admins = res.data.filter(isAdminUser);
        const meus = admins.filter((a) => a.id === user?.id);
        setUsers(meus.length > 0 ? meus : admins.slice(0, 1));
        setMeta(res.meta);
        setAccounts(acc);
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
  if (users.length === 0 && accounts.length === 0 && page === 1) {
    return <EmptyState message="Ainda não registaste nenhuma farmácia." actionLabel="Registar farmácia" actionLink="/utilizadores/novo" />;
  }

  function primaryRole(u: ManagedUser): string {
    const bruto: any = (u.roles as any)?.[0];
    const nome: string | undefined =
      typeof bruto === "string" ? bruto : bruto?.role?.name ?? bruto?.role ?? bruto?.name;
    if (!nome || typeof nome !== "string") return "—";
    return ROLE_LABELS[nome as UserRole] ?? nome;
  }

  const canWrite = hasPermission(user?.permissions, "users:write");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>{canWrite ? <Link to="/utilizadores/novo" className="btn btn-primary">+ Nova farmácia</Link> : null}</div>

      {accounts.length > 0 && (
        <div className="card" style={{ padding: "1rem", overflowX: "auto", marginBottom: "1rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Farmácia</th>
                <th>Colaboradores</th>
                <th>Email de acesso</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.operators.filter((o) => o.isActive).map((o) => o.name).join(", ") || "—"}</td>
                  <td>{a.email ?? "—"}</td>
                  <td>{badge(a.status === "ACTIVE", "Ativa", "Inativa")}</td>
                  <td>
                    {canWrite ? (
                      <Link to={`/utilizadores/farmacias/${a.id}/editar`} style={{ color: "#2563eb", textDecoration: "none" }}>Editar</Link>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users.length > 0 && (
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
                  <td>{isAdminUser(u) ? "Administrador" : primaryRole(u)}</td>
                  <td>{badge(u.status === "ACTIVE", "Ativo", "Inativo")}</td>
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
      )}

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