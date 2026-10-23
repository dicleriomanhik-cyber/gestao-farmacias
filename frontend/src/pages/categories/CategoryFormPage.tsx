import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCategoryById,
  createCategory,
  updateCategory,
} from "../../services/categoryService";
import { useToast } from "../../contexts/ToastContext";

export default function CategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    if (!isEditing || !id) return;
    setLoading(true);
    setError(false);
    getCategoryById(id)
      .then((cat) => {
        setName(cat.name);
        setDescription(cat.description ?? "");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome é obrigatório.");

    setSubmitting(true);
    try {
      if (isEditing && id) {
        await updateCategory(id, {
          name: name.trim(),
          description: description.trim() || null,
        });
        toast.success("Categoria atualizada.");
      } else {
        await createCategory({
          name: name.trim(),
          description: description.trim() || null,
        });
        toast.success("Categoria criada.");
      }
      navigate("/categorias");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        "Erro ao guardar categoria.";
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>A carregar…</div>;
  if (error) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#b91c1c" }}>
        <p>Não foi possível carregar a categoria.</p>
        <button onClick={load} className="btn btn-primary">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
        {isEditing ? "Editar Categoria" : "Nova Categoria"}
      </h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Nome *
          </label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Descrição
          </label>
          <textarea
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {submitting ? "A guardar…" : "Guardar Categoria"}
        </button>
      </form>
    </div>
  );
}
