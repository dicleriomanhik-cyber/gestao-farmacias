import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSuppliers } from "../../services/supplierService";
import type { Supplier, PaginatedMeta } from "../../types/suppliers";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

export default function SupplierListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getSuppliers({ page, limit: 10, search })
      .then((res) => {
        setSuppliers(res.data);
        setMeta(res.meta);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={load} />;
  if (suppliers.length === 0 && page === 1 && !search) {
    return (
      <EmptyState
        message="Nenhum fornecedor registado."
        actionLabel="Novo Fornecedor"
        actionLink="/fornecedores/novo"
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        actions={<Link to="/fornecedores/novo" className="btn btn-primary">+ Novo Fornecedor</Link>}
      />

      <form onSubmit={onSearch} style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          className="input"
          placeholder="Pesquisar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary">Pesquisar</button>
      </form>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>NIF</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.taxId ?? "—"}</td>
                <td>{s.phone ?? "—"}</td>
                <td>{s.email ?? "—"}</td>
                <td>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    backgroundColor: s.status === "ACTIVE" ? "#dcfce7" : "#fee2e2",
                    color: s.status === "ACTIVE" ? "#166534" : "#991b1b",
                  }}>
                    {s.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <Link to={`/fornecedores/${s.id}/editar`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    Editar
                  </Link>
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
