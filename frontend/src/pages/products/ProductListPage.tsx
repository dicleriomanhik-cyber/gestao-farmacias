import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/productService";
import type { Product } from "../../types/products";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => window.location.reload()} />;
  if (products.length === 0) return <EmptyState message="Nenhum produto registado." actionLabel="Novo Produto" actionLink="/produtos/novo" />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Produtos</h1>
        <Link to="/produtos/novo" style={{ backgroundColor: "#2563eb", color: "white", padding: "0.5rem 1rem", borderRadius: "4px", textDecoration: "none" }}>
          + Novo Produto
        </Link>
      </div>
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
                <td style={{ padding: "0.75rem" }}>{p.categoryName}</td>
                <td style={{ padding: "0.75rem" }}>{p.price} MT</td>
                <td style={{ padding: "0.75rem" }}>{p.stockQuantity}</td>
                <td style={{ padding: "0.75rem" }}>
                  <Link to={`/produtos/${p.id}/editar`} style={{ color: "#2563eb", textDecoration: "none" }}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
