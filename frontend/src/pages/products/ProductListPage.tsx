import PageHeader from "../../components/ui/PageHeader";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/productService";
import type { Product, PaginatedMeta } from "../../types/products";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getProducts({ page, limit: 5, search })
      .then((res) => {
        setProducts(Array.isArray(res?.data) ? res.data : []);
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
  if (products.length === 0 && page === 1 && !search) {
    return <EmptyState message="Nenhum produto registado." actionLabel="Novo Produto" actionLink="/produtos/novo" />;
  }

  return (
    <div>
      <PageHeader title="Produtos" actions={<Link to="/produtos/novo" className="btn btn-primary">+ Novo Produto</Link>} />

      <form onSubmit={onSearch} style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Pesquisar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
        />
        <button type="submit" style={{ padding: "0.5rem 1rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Pesquisar
        </button>
      </form>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "0.75rem" }}>Nome</th>
              <th style={{ padding: "0.75rem" }}>Categoria</th>
              <th style={{ padding: "0.75rem" }}>Preço</th>
              <th style={{ padding: "0.75rem" }}>Stock</th>
              <th style={{ padding: "0.75rem" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "0.75rem" }}>{p.name}</td>
                <td style={{ padding: "0.75rem" }}>{p.category?.name}</td>
                <td style={{ padding: "0.75rem" }}>{parseFloat(p.salePrice).toFixed(2)} MT</td>
                <td style={{ padding: "0.75rem" }}>—</td>
                <td style={{ padding: "0.75rem" }}>
                  <Link to={`/produtos/${p.id}/editar`} style={{ color: "#2563eb", textDecoration: "none" }}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ padding: "0.5rem 1rem", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
          >
            Anterior
          </button>
          <span style={{ color: "#6b7280" }}>
            Página {meta.page} de {meta.totalPages} — {meta.total} registos
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            style={{ padding: "0.5rem 1rem", cursor: page >= meta.totalPages ? "not-allowed" : "pointer", opacity: page >= meta.totalPages ? 0.5 : 1 }}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}




