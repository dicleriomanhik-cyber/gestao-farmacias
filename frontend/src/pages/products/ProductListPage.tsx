import PageHeader from "../../components/ui/PageHeader";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, deleteProduct } from "../../services/productService";
import { getStockLots } from "../../services/stockService";
import type { Product, PaginatedMeta } from "../../types/products";
import type { StockLot } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { useToast } from "../../contexts/ToastContext";

export default function ProductListPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<StockLot[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  function load() {
    setLoading(true);
    setError(false);
    Promise.all([
      getProducts({ page, limit: 5, search, status: "ACTIVE" }),
      getStockLots(),
    ])
      .then(([prodRes, lotsRes]) => {
        setProducts(Array.isArray(prodRes?.data) ? prodRes.data : []);
        setMeta(prodRes.meta);
        setLots(Array.isArray(lotsRes) ? lotsRes : []);
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

  function getNearestExpiry(productId: string) {
    const productLots = lots.filter((l) => l.productId === productId && l.quantityAvailable > 0);
    if (productLots.length === 0) return null;
    return productLots.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0].expiryDate;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  async function handleDelete() {
    if (!productToDelete) return;
    setDeletingId(productToDelete.id);
    try {
      await deleteProduct(productToDelete.id);
      toast.success("Produto eliminado com sucesso.");
      setProductToDelete(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao eliminar o produto.");
    } finally {
      setDeletingId(null);
    }
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
              <th style={{ padding: "0.75rem" }}>Validade</th>
              <th style={{ padding: "0.75rem" }}>Preço</th>
              <th style={{ padding: "0.75rem" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const expiry = getNearestExpiry(p.id);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.75rem" }}>{p.name}</td>
                  <td style={{ padding: "0.75rem" }}>{expiry ? formatDate(expiry) : "—"}</td>
                  <td style={{ padding: "0.75rem" }}>{parseFloat(p.salePrice).toFixed(2)} MT</td>
                  <td style={{ padding: "0.75rem", display: "flex", gap: "1rem" }}>
                    <Link to={`/produtos/${p.id}/editar`} style={{ color: "#2563eb", textDecoration: "none" }}>Editar</Link>
                    <button
                      onClick={() => setProductToDelete(p)}
                      disabled={deletingId === p.id}
                      style={{ color: "#b91c1c", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                      {deletingId === p.id ? "A eliminar…" : "Eliminar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {meta && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "0.5rem 1rem", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}>
            Anterior
          </button>
          <span style={{ color: "#6b7280" }}>
            Página {meta.page} de {meta.totalPages} — {meta.total} registos
          </span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} style={{ padding: "0.5rem 1rem", cursor: page >= meta.totalPages ? "not-allowed" : "pointer", opacity: page >= meta.totalPages ? 0.5 : 1 }}>
            Próxima
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO */}
      {productToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setProductToDelete(null)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "450px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.75rem", color: "#1e293b" }}>
              Eliminar Produto
            </h2>
            <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
              Tens a certeza que queres eliminar o produto <strong>"{productToDelete.name}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setProductToDelete(null)}
                disabled={deletingId !== null}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#e2e8f0",
                  color: "#1e293b",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId !== null}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "500",
                  cursor: deletingId !== null ? "not-allowed" : "pointer",
                  opacity: deletingId !== null ? 0.7 : 1,
                }}
              >
                {deletingId ? "A eliminar…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
