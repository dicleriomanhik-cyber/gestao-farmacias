import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createProduct, getProductById, updateProduct, getCategories } from "../../services/productService";
import { getStockLots } from "../../services/stockService";
import type { ProductRequest } from "../../types/products";
import PageHeader from "../../components/ui/PageHeader";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories().then((cats) => {
      if (cats.length > 0) setCategoryId(cats[0].id);
    });

    if (isEdit && id) {
      setLoading(true);
      setError(false);
      Promise.all([getProductById(id), getStockLots()])
        .then(([p, lots]) => {
          setName(p.name);
          setDescription(p.description ?? "");
          setSalePrice(p.salePrice);
          if (p.categoryId) setCategoryId(p.categoryId);

          const productLot = lots.find((l) => l.productId === p.id);
          if (productLot) {
            setExpiryDate(productLot.expiryDate);
          }
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Nenhuma categoria configurada no sistema.");
      return;
    }
    setSubmitting(true);
    const data: ProductRequest = {
      name,
      description,
      salePrice: parseFloat(salePrice),
      categoryId,
    };
    try {
      if (isEdit && id) {
        await updateProduct(id, data);
        toast.success("Produto atualizado com sucesso.");
      } else {
        await createProduct(data);
        toast.success("Produto criado com sucesso.");
      }
      navigate("/produtos");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao guardar o produto.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar o produto." onRetry={() => navigate("/produtos")} />;

  return (
    <div>
      <PageHeader title={isEdit ? "Editar Produto" : "Novo Produto"} />
      <form onSubmit={handleSubmit} className="card" style={{ padding: "1.5rem", maxWidth: "600px", margin: "0 auto" }}>
        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>Nome *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" style={{ width: "100%", marginBottom: "1rem" }} />

        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>Descrição</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={3} style={{ width: "100%", marginBottom: "1rem" }} />

        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>Preço (MT) *</label>
        <input type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required className="input" style={{ width: "100%", marginBottom: "1rem" }} />

        {isEdit && expiryDate && (
          <>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>Validade do Lote</label>
            <input type="date" value={expiryDate.split("T")[0]} className="input" style={{ width: "100%", marginBottom: "0.5rem", backgroundColor: "#f3f4f6", color: "#6b7280" }} disabled />
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "1.5rem" }}>
              A validade é gerida na página de Stock. A alteração não está disponível nesta versão (limitação do Back-end).
            </p>
          </>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
          {submitting ? "A guardar…" : "Guardar Produto"}
        </button>
      </form>
    </div>
  );
}
