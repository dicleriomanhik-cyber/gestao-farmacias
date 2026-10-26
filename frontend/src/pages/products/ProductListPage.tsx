import PageHeader from "../../components/ui/PageHeader";
import { useEffect, useState, useRef } from "react";
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  function isExpiringSoon(dateStr: string) {
    const expiry = new Date(dateStr).getTime();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return expiry - now < thirtyDays && expiry > now;
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr).getTime() < Date.now();
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
      <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "#f1f5f9", paddingBottom: "1rem", paddingTop: "0.5rem" }}>
        <PageHeader title="Produtos" actions={<Link to="/produtos/novo" className="btn btn-primary">+ Novo Produto</Link>} />

        <form onSubmit={onSearch} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Pesquisar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "6px", outline: "none" }}
        />
          <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem" }}>
            Pesquisar
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Validade</th>
              <th>Preço</th>
              <th style={{ width: "80px", textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const expiry = getNearestExpiry(p.id);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td
                    style={{
                      fontWeight: expiry && (isExpiringSoon(expiry) || isExpired(expiry)) ? "bold" : "normal",
                      color: expiry && isExpired(expiry) ? "#b91c1c" : expiry && isExpiringSoon(expiry) ? "#ca8a04" : "inherit",
                    }}
                  >
                    {expiry ? formatDate(expiry) : "—"}
                    {expiry && isExpired(expiry) && " (Expirado)"}
                    {expiry && !isExpired(expiry) && isExpiringSoon(expiry) && " (A expirar)"}
                  </td>
                  <td>{parseFloat(p.salePrice).toFixed(2)} MT</td>
                  <td style={{ textAlign: "center", position: "relative" }} ref={openMenuId === p.id ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "1.25rem", padding: "0.25rem 0.5rem",
                        borderRadius: "4px", color: "#64748b",
                      }}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = "#f1f5f9"}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = "transparent"}
                    >
                      ⋯
                    </button>

                    {openMenuId === p.id && (
                      <div
                        style={{
                          position: "absolute", top: "100%", right: 0, marginTop: "4px",
                          backgroundColor: "white", border: "1px solid #e2e8f0",
                          borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          zIndex: 1000, minWidth: "150px",
                        }}
                      >
                        <Link
                          to={`/produtos/${p.id}/editar`}
                          style={{
                            display: "block", padding: "0.75rem 1rem",
                            color: "#1e293b", textDecoration: "none",
                            borderBottom: "1px solid #f1f5f9",
                          }}
                          onClick={() => setOpenMenuId(null)}
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setProductToDelete(p);
                          }}
                          style={{
                            display: "block", width: "100%", textAlign: "left",
                            padding: "0.75rem 1rem", color: "#b91c1c",
                            background: "none", border: "none", cursor: "pointer",
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {meta && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-secondary" style={{ opacity: page <= 1 ? 0.5 : 1 }}>
            Anterior
          </button>
          <span style={{ color: "#6b7280" }}>
            Página {meta.page} de {meta.totalPages} — {meta.total} registos
          </span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="btn btn-secondary" style={{ opacity: page >= meta.totalPages ? 0.5 : 1 }}>
            Próxima
          </button>
        </div>
      )}

      {productToDelete && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={() => setProductToDelete(null)}
        >
          <div
            className="card"
            style={{
              backgroundColor: "white", borderRadius: "12px", padding: "1.5rem",
              maxWidth: "450px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
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
                  padding: "0.5rem 1rem", backgroundColor: "#e2e8f0",
                  color: "#1e293b", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId !== null}
                style={{
                  padding: "0.5rem 1rem", backgroundColor: "#dc2626",
                  color: "white", border: "none", borderRadius: "6px",
                  fontWeight: "500", cursor: deletingId !== null ? "not-allowed" : "pointer",
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



