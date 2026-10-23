import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProductById, createProduct, updateProduct, getCategories } from "../../services/productService";
import type { Category } from "../../types/products";
import { useToast } from "../../contexts/ToastContext";

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
    if (isEditing && id) {
      getProductById(id).then((p) => {
        setName(p.name);
        setDescription(p.description ?? "");
        setPrice(p.salePrice);
        setCategoryId(p.categoryId);
      });
    }
  }, [id, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome é obrigatório.");
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return toast.error("Preço deve ser maior que zero.");
    if (!categoryId) return toast.error("Categoria é obrigatória.");

    setLoading(true);
    try {
      if (isEditing && id) {
        await updateProduct(id, { name, description, salePrice: parseFloat(price), categoryId });
        toast.success("Produto atualizado.");
      } else {
        await createProduct({ name, description, salePrice: parseFloat(price), categoryId });
        toast.success("Produto criado.");
      }
      navigate("/produtos");
    } catch {
      toast.error("Erro ao guardar produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
        {isEditing ? "Editar Produto" : "Novo Produto"}
      </h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Nome *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px", minHeight: "80px" }} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Preço (MT) *</label>
          <input type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }} />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Categoria *</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}>
            <option value="">Seleciona uma categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}>
          {loading ? "A guardar..." : "Guardar Produto"}
        </button>
      </form>
    </div>
  );
}



