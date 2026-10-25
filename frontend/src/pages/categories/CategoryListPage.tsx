import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../../services/categoryService";
import type { Category } from "../../types/products";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

export default function CategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getCategories({ limit: 100 })
      .then((res) => {
        // Resposta pode ser 204 (sem corpo) ou { data: [] }
        setCategories(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        setError(true);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar as categorias." onRetry={load} />;
  if (categories.length === 0) {
    return (
      <EmptyState
        message="Nenhuma categoria registada."
        actionLabel="Nova Categoria"
        actionLink="/categorias/novo"
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        actions={<Link to="/categorias/novo" className="btn btn-primary">+ Nova Categoria</Link>}
      />

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.description ?? "—"}</td>
                <td>
                  <Link to={`/categorias/${cat.id}/editar`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
