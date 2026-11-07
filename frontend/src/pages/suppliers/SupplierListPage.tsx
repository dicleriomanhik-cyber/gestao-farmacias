import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSuppliers } from "../../services/supplierService";
import { getSettings } from "../../services/settingsService";
import type { Supplier, PaginatedMeta } from "../../types/suppliers";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";
import { fmtMt } from "../../utils/supplierFormat";
import useIsMobile from "../../hooks/useIsMobile";

export default function SupplierListPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [payables, setPayables] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isMobile = useIsMobile();
  const reqId = useRef(0);

  function load(p: number, s: string, silent = false) {
    const id = ++reqId.current;
    if (!silent) setLoading(true);
    setError(false);
    getSuppliers({ page: p, limit: 10, search: s })
      .then((res) => {
        if (id !== reqId.current) return;
        setSuppliers(res.data);
        setMeta(res.meta);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    getSettings()
      .then((st) => setPayables(Boolean(st.usePayables)))
      .catch(() => setPayables(false));
  }, []);

  useEffect(() => {
    load(page, search, isMobile && suppliers.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(1, search, true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(1, search);
  }

  if (loading && suppliers.length === 0 && !search) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => load(page, search)} />;
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
        actions={<Link to="/fornecedores/novo" className="btn btn-primary">Novo Fornecedor</Link>}
      />

      <form onSubmit={onSearch} className="sup-search" style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <label className="sup-search-label">Pesquisar fornecedor</label>
        <input
          type="text"
          className="input"
          placeholder="Pesquisar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
      </form>

      {suppliers.length === 0 && search.trim() !== "" && (<p style={{ color: "#64748b", textAlign: "center", padding: "0.75rem 0" }}>Nenhum fornecedor encontrado para {"\u00ab"}{search}{"\u00bb"}.</p>)}
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone / WhatsApp</th>
              <th>Cidade</th>
              <th>Total comprado</th>
              {payables && <th>Em dívida</th>}
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{[s.phone, s.whatsapp].filter(Boolean).join(" / ") || "—"}</td>
                <td>{s.city ?? "—"}</td>
                <td>{fmtMt(s.totalPurchased)}</td>
                {payables && <td>{fmtMt(s.debt)}</td>}
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
                <td style={{ whiteSpace: "nowrap" }}>
                  <Link to={`/fornecedores/${s.id}`} className="btn-soft" style={{ marginRight: "0.5rem" }}>
                    Ficha
                  </Link>
                  <Link to={`/fornecedores/${s.id}/editar`} className="btn-soft">
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