import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { getProducts, deleteProduct } from "../../services/productService";
import { getStockLots } from "../../services/stockService";
import type { Product, PaginatedMeta } from "../../types/products";
import type { StockLot } from "../../types/stock";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import { useToast } from "../../contexts/ToastContext";
import { getCatalogProducts, getCatalogLots } from "../../offline/catalog";
import { useDataChanged } from "../../offline/dataChanged";

const PAGE_SIZE = 20;

const head: CSSProperties = {
  padding: "10px 16px",
  borderRight: "1px solid #e5e7eb",
  color: "#5b6478",
  fontWeight: 600,
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  textAlign: "left",
};
const cell: CSSProperties = { padding: "10px 16px", borderRight: "1px solid #e5e7eb", verticalAlign: "middle" };
const btnBase: CSSProperties = {
  padding: "6px 0",
  width: 92,
  borderRadius: 6,
  fontSize: "0.85rem",
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  lineHeight: 1.4,
  background: "#fff",
  boxSizing: "border-box",
};
const btnEdit: CSSProperties = { ...btnBase, color: "#1e40af", background: "#dbeafe", border: "none", borderRadius: 999 };
const btnDelete: CSSProperties = { ...btnBase, color: "#991b1b", background: "#fee2e2", border: "none", borderRadius: 999, font: "inherit", fontSize: "0.85rem", fontWeight: 500 };

function formatDate(dateStr: string): string {
  if (!dateStr) return "Sem validade";
  const d = new Date(dateStr);
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export default function StockProductListPage() {
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

  function load(targetPage: number = page, term: string = search, silent: boolean = false) {
    if (!silent) setLoading(true);
    setError(false);
    Promise.all([getProducts({ page: targetPage, limit: PAGE_SIZE, search: term, status: "ACTIVE" }), getStockLots()])
      .then(([prodRes, lotsRes]) => {
        setProducts(Array.isArray(prodRes?.data) ? prodRes.data : []);
        setMeta(prodRes.meta);
        setLots(Array.isArray(lotsRes) ? lotsRes : []);
      })
      .catch(async () => {
        const cached = await getCatalogProducts(term);
        const cachedLots = await getCatalogLots();
        if (cached.length === 0 && cachedLots.length === 0) {
          setError(true);
          return;
        }
        setProducts(cached);
        setLots(cachedLots);
        setMeta(null);
      })
      .finally(() => setLoading(false));
  }

  const firstLoad = useRef(true);
  useEffect(() => {
    const silent = !firstLoad.current;
    const t = setTimeout(() => {
      load(page, search, silent);
      firstLoad.current = false;
    }, silent ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  useDataChanged(() => load(page, search, true));

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (page === 1) load(1, search);
    else setPage(1);
  }

  function getNearestExpiry(productId: string) {
    const withExpiry = lots.filter((l) => l.productId === productId && l.quantityAvailable > 0 && l.expiryDate !== null);
    if (withExpiry.length === 0) return null;
    return withExpiry.sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())[0].expiryDate;
  }

  function isExpiringSoon(dateStr: string) {
    const expiry = new Date(dateStr).getTime();
    const now = Date.now();
    return expiry - now < 30 * 24 * 60 * 60 * 1000 && expiry > now;
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
  if (error) return <ErrorState onRetry={() => load()} />;
  if (products.length === 0 && page === 1 && !search) {
    return <EmptyState message="Nenhum produto registado." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <form
        onSubmit={onSearch}
        style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", padding: "1rem 1.5rem", marginBottom: "1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.03)", display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "#5b6478", marginBottom: 4, fontWeight: 500 }}>Pesquisar</label>
          <input
            type="search"
            placeholder="Pesquisar produto..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid #d9dee9", borderRadius: 6, background: "#fff", color: "#1d2433", fontSize: "0.9rem", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ textAlign: "right", minWidth: 110 }}>
          <div style={{ fontSize: "0.75rem", color: "#5b6478", marginBottom: 2 }}>Total de produtos</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2f5bd3" }}>{meta?.total ?? products.length}</div>
        </div>
      </form>

      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", overflowX: "auto" }}>
        {products.length === 0 ? (
          <div style={{ padding: 20 }}><EmptyState message={search.trim() ? "Nenhum produto encontrado para \u00ab" + search.trim() + "\u00bb." : "Nenhum produto encontrado."} /></div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 560 }}>
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                <th style={head}>Nome</th>
                <th style={head}>Validade</th>
                <th style={head}>Preço</th>
                <th style={{ ...head, borderRight: 0, textAlign: "center" }}>Acções</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const expiry = getNearestExpiry(p.id);
                const expired = !!expiry && isExpired(expiry);
                const soon = !!expiry && !expired && isExpiringSoon(expiry);
                const dosLotes = lots.filter((l) => l.productId === p.id);
                const disp = dosLotes.reduce((s, l) => s + (Number(l.quantityAvailable) || 0), 0);
                const rec = dosLotes.reduce((s, l) => s + (Number(l.totalUnits) || Number(l.quantityReceived) || 0), 0);
                const esgotar = disp > 0 && rec > 0 && disp / rec <= 0.1;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ ...cell, fontWeight: 500 }}>{p.name}{esgotar && <span style={{ marginLeft: 8, fontSize: "0.75rem", fontWeight: 700, color: "#c2410c" }}>(A esgotar)</span>}</td>
                    <td style={{ ...cell, fontWeight: expired || soon ? 700 : 400, color: expired ? "#b91c1c" : soon ? "#ca8a04" : "inherit" }}>
                      {expiry ? formatDate(expiry) : "—"}
                      {expired && " (Expirado)"}
                      {soon && " (A expirar)"}
                    </td>
                    <td style={cell}>{parseFloat(p.salePrice).toFixed(2)} MT</td>
                    <td style={{ ...cell, borderRight: 0 }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <Link to={`/stock/produtos/${p.id}/editar`} style={btnEdit}>Editar</Link>
                        <button type="button" onClick={() => setProductToDelete(p)} style={btnDelete}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
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
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "1rem" }}
          onClick={() => setProductToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{ backgroundColor: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 420, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#0f172a", marginBottom: "0.5rem" }}>Eliminar produto?</div>
            <div style={{ fontSize: "0.9rem", color: "#334155", marginBottom: "1.25rem" }}>
              Vais eliminar <strong>{productToDelete.name}</strong>. Esta ação não pode ser desfeita.
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setProductToDelete(null)}
                disabled={deletingId !== null}
                style={{ padding: "0.55rem 1.1rem", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", cursor: "pointer", fontSize: "0.9rem" }}
              >
                Cancelar
              </button>
              <button
                autoFocus
                onClick={handleDelete}
                disabled={deletingId !== null}
                style={{ padding: "0.55rem 1.1rem", borderRadius: 999, border: "none", background: "#e11d1d", color: "#fff", cursor: deletingId !== null ? "not-allowed" : "pointer", fontSize: "0.9rem", fontWeight: 600, opacity: deletingId !== null ? 0.7 : 1 }}
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