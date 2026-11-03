import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProductById, updateProduct, getCategories } from "../../services/productService";
import { getStockLots, adjustStock } from "../../services/stockService";
import type { ProductRequest, Category } from "../../types/products";
import { MonthField } from "./StockBoxFormPage";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import CustomSelect from "../../components/ui/CustomSelect";

function monthEnd(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0, 23, 59, 59)).toISOString();
}

export default function ProductEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [expiryDate, setExpiryDate] = useState("");
  const [initialExpiry, setInitialExpiry] = useState("");
  const [lotId, setLotId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!productId) return;
    setLoading(true);
    setError(false);
    getCategories().then(setCategories).catch(() => undefined);
    Promise.all([getProductById(productId), getStockLots()])
      .then(([p, lots]) => {
        setName(p.name);
        setDescription(p.description ?? "");
        setSalePrice(p.salePrice);
        setCategoryId(p.categoryId ?? "");
        const productLot = lots.find((l) => l.productId === p.id);
        if (productLot) {
          setLotId(productLot.id);
          if (productLot.expiryDate) {
            const d = new Date(productLot.expiryDate).toISOString().slice(0, 7);
            setExpiryDate(d);
            setInitialExpiry(d);
          }
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    if (name.trim().length < 2) {
      toast.error("Indica o nome do produto.");
      return;
    }
    const price = parseFloat(salePrice);
    if (isNaN(price) || price < 0) {
      toast.error("Indica um preço válido.");
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        description,
        salePrice: price,
        ...(categoryId ? { categoryId } : {}),
      } as unknown as ProductRequest;
      await updateProduct(productId, data);
      if (lotId && expiryDate && expiryDate !== initialExpiry) {
        await adjustStock({
          lotId,
          quantity: 0,
          reason: "Atualização de validade",
          expiryDate: monthEnd(expiryDate),
        });
      }
      toast.success("Produto atualizado com sucesso.");
      navigate("/stock/produtos");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao guardar o produto.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar o produto." onRetry={load} />;

  const categoryOptions = [{ value: "", label: "Sem categoria" }, ...categories.map((c) => ({ value: c.id, label: c.name }))];

  return (
    <div>
      
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
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Categoria</label>
          <CustomSelect options={categoryOptions} value={categoryId} onChange={setCategoryId} placeholder="Sem categoria" menuMaxWidth={280} />
        </div>

        {initialExpiry && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Validade do lote</label>
            <MonthField value={expiryDate} onChange={setExpiryDate} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d9dee9", borderRadius: 6, font: "inherit", background: "#fff", boxSizing: "border-box", fontSize: "0.9rem" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, padding: "0.6rem" }}>
            {submitting ? "A guardar…" : "Guardar produto"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/stock/produtos")} style={{ padding: "0.6rem 1rem" }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}