import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts } from "../../services/productService";
import { createStockBox } from "../../services/stockService";
import type { Product, ProductType } from "../../types/products";
import type { StockBoxCreateRequest } from "../../types/stock";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

const C = {
  border: "#d9dee9",
  accent: "#2f5bd3",
  accentSoft: "#e8efff",
  muted: "#5b6478",
  ok: "#0f7a4a",
  okSoft: "#e3f6ec",
};

const labelStyle: CSSProperties = { display: "block", fontSize: "0.8rem", color: C.muted, marginBottom: "4px" };
const hintStyle: CSSProperties = { fontSize: "0.8rem", color: C.muted, marginTop: "4px" };

export default function StockBoxFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [tipo, setTipo] = useState<ProductType>("MEDICINE");
  const [productId, setProductId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [innerCount, setInnerCount] = useState("");
  const [unitsPerInner, setUnitsPerInner] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    getProducts({ status: "ACTIVE", limit: 100 })
      .then((res) => setProducts(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const isMedicine = tipo === "MEDICINE";
  const filtered = products.filter((p) => p.type === tipo);
  const product = filtered.find((p) => p.id === productId);
  const semValidade = noExpiry || (!!product && !product.hasExpiry);
  const unidade = isMedicine ? "carteira" : "unidade";
  const inner = parseInt(innerCount, 10);
  const perInner = parseInt(unitsPerInner, 10);
  const total = parseInt(totalUnits, 10);

  let preview = "—";
  if (isMedicine && inner > 0 && perInner > 0) preview = `${inner} × ${perInner} = ${inner * perInner} carteiras`;
  if (!isMedicine && total > 0) preview = `${total} ${total === 1 ? "unidade" : "unidades"}`;

  function changeTipo(t: ProductType) {
    setTipo(t);
    setProductId("");
    setNoExpiry(false);
    setExpiryDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return toast.error("Seleciona um produto.");
    if (!qrCode.trim()) return toast.error("O QR Code é obrigatório.");

    const payload: StockBoxCreateRequest = {
      productId: product.id,
      qrCode: qrCode.trim(),
      expiryDate: null,
    };

    if (!semValidade) {
      if (!expiryDate) return toast.error("Indica a validade ou marca que não tem validade.");
      if (new Date(expiryDate) <= new Date()) return toast.error("A validade deve ser no futuro.");
      payload.expiryDate = new Date(expiryDate).toISOString();
    }

    if (isMedicine) {
      if (isNaN(inner) || inner <= 0) return toast.error("Indica o número de caixinhas.");
      if (isNaN(perInner) || perInner <= 0) return toast.error("Indica as carteiras por caixinha.");
      payload.innerCount = inner;
      payload.unitsPerInner = perInner;
    } else {
      if (isNaN(total) || total <= 0) return toast.error("Indica o total de unidades.");
      payload.totalUnits = total;
    }

    if (unitCost.trim() !== "") {
      const cost = parseFloat(unitCost);
      if (isNaN(cost) || cost < 0) return toast.error("Custo unitário inválido.");
      payload.unitCost = cost;
    }

    setSubmitting(true);
    try {
      await createStockBox(payload);
      toast.success("Caixa registada com sucesso.");
      navigate("/stock/caixas");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? "Erro ao registar a caixa.";
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar os produtos." onRetry={load} />;

  const segBtn = (on: boolean): CSSProperties => ({
    border: 0,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "0.9rem",
    background: on ? C.accent : "#fff",
    color: on ? "#fff" : "#1d2433",
  });

  return (
    <div className="card" style={{ padding: "1.5rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>Registar caixa</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <div>
            <label style={labelStyle}>Tipo do produto</label>
            <div style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
              <button type="button" style={segBtn(isMedicine)} onClick={() => changeTipo("MEDICINE")}>Medicamento</button>
              <button type="button" style={segBtn(!isMedicine)} onClick={() => changeTipo("PRODUCT")}>Produto</button>
            </div>
            <div style={hintStyle}>O tipo fica guardado no produto e aparece em todas as caixas dele.</div>
          </div>
          <div>
            <label style={labelStyle}>QR Code da caixa grande *</label>
            <input type="text" value={qrCode} onChange={(e) => setQrCode(e.target.value)} className="input" placeholder="Lê ou escreve o código da caixa" />
            <div style={hintStyle}>Caixa registada uma vez. O QR Code distingue-a das outras.</div>
          </div>
          <div>
            <label style={labelStyle}>Produto *</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input">
              <option value="">Seleciona um produto</option>
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {filtered.length === 0 && <div style={hintStyle}>Não há produtos ativos deste tipo.</div>}
          </div>
          <div>
            <label style={labelStyle}>Validade (vale para toda a caixa)</label>
            <input
              type="date"
              value={semValidade ? "" : expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={semValidade}
              className="input"
            />
            {!isMedicine && (
              <label style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px", fontSize: "0.9rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={semValidade}
                  disabled={!!product && !product.hasExpiry}
                  onChange={(e) => setNoExpiry(e.target.checked)}
                />
                Este produto não tem validade
              </label>
            )}
          </div>
          {isMedicine ? (
            <>
              <div>
                <label style={labelStyle}>Número de caixinhas dentro da caixa *</label>
                <input type="number" min={1} value={innerCount} onChange={(e) => setInnerCount(e.target.value)} className="input" />
              </div>
              <div>
                <label style={labelStyle}>Carteiras por caixinha *</label>
                <input type="number" min={1} value={unitsPerInner} onChange={(e) => setUnitsPerInner(e.target.value)} className="input" />
              </div>
            </>
          ) : (
            <div>
              <label style={labelStyle}>Quantas unidades tem a caixa *</label>
              <input type="number" min={1} value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} className="input" />
            </div>
          )}
          <div>
            <label style={labelStyle}>Custo por {unidade} (opcional)</label>
            <input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="input" />
          </div>
        </div>

        <div style={{ background: C.okSoft, border: `1px dashed ${C.ok}`, borderRadius: "8px", padding: "10px 12px", marginTop: "12px", fontSize: "0.9rem" }}>
          Unidade de venda definida automaticamente: <b style={{ color: C.ok }}>{unidade}</b>
          <div style={hintStyle}>
            Medicamento vende <b>carteira</b>. Produto vende <b>unidade</b>. Este nome aparece no painel do colaborador.
          </div>
        </div>

        <div style={{ background: C.accentSoft, borderRadius: "8px", padding: "10px 12px", marginTop: "12px", fontSize: "0.9rem" }}>
          Total a registar: <b>{preview}</b>
        </div>

        <div style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "A guardar..." : "Guardar caixa"}
          </button>
          <button type="button" onClick={() => navigate("/stock/caixas")} className="btn">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
