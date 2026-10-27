import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createProduct, getProductById, updateProduct, getCategories } from "../../services/productService";
import { getStockLots, adjustStock, createLot } from "../../services/stockService";
import type { ProductRequest, Category } from "../../types/products";
import PageHeader from "../../components/ui/PageHeader";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import CustomSelect from "../../components/ui/CustomSelect";

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [expiryDate, setExpiryDate] = useState("");
  const [lotId, setLotId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
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
            setLotId(productLot.id);
            setLotNumber(productLot.lotNumber);
            if (productLot.expiryDate) {
              const d = new Date(productLot.expiryDate);
              setExpiryDate(d.toISOString().split("T")[0]);
            } else {
              setExpiryDate("");
            }
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
      type: "MEDICINE",
    };
    try {
      if (isEdit && id) {
        await updateProduct(id, data);
        if (lotId && expiryDate) {
          await adjustStock({
            lotId,
            quantity: 0,
            reason: "Atualização de validade",
            expiryDate: new Date(expiryDate).toISOString(),
          });
        }
        toast.success("Produto atualizado com sucesso.");
        navigate("/produtos");
      } else {
        const product = await createProduct(data);
        if (expiryDate && quantity && unitCost) {
          await createLot({
            productId: product.id,
            lotNumber: lotNumber || `LOTE-${product.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
            expiryDate: new Date(expiryDate).toISOString(),
            quantity: parseInt(quantity, 10),
            unitCost: parseFloat(unitCost),
          });
        }
        toast.success("Produto e stock criados com sucesso.");
        navigate("/produtos");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao guardar o produto.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar o produto." onRetry={() => navigate("/produtos")} />;

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div>
      <PageHeader title={isEdit ? "Editar Produto" : "Novo Produto"} />
      <form onSubmit={handleSubmit} className="card" style={{ padding: "1.25rem", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Nome *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Preço (MT) *</label>
            <input type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required className="input" style={{ width: "100%" }} />
          </div>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={2} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Categoria *</label>
          <CustomSelect options={categoryOptions} value={categoryId} onChange={setCategoryId} placeholder="Seleciona uma categoria" />
        </div>

        {!isEdit && (
          <>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", marginTop: "1rem", marginBottom: "0.5rem", color: "#1e293b" }}>Stock Inicial (Opcional)</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.85rem" }}>Número do Lote</label>
                <input type="text" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className="input" style={{ width: "100%" }} placeholder="Automático se vazio" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.85rem" }}>Validade</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input" style={{ width: "100%" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.85rem" }}>Quantidade</label>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input" style={{ width: "100%" }} placeholder="Ex: 100" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.85rem" }}>Custo Unitário (MT)</label>
                <input type="number" step="0.01" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="input" style={{ width: "100%" }} placeholder="Ex: 100.00" />
              </div>
            </div>
          </>
        )}

        {isEdit && expiryDate && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Validade do Lote</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input" style={{ width: "100%" }} />
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: "100%", padding: "0.6rem" }}>
          {submitting ? "A guardar…" : "Guardar Produto"}
        </button>
      </form>
    </div>
  );
}

