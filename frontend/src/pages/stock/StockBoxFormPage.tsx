import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createProduct, getProducts } from "../../services/productService";
import { createStockBox } from "../../services/stockService";
import type { Product, ProductRequest, ProductType } from "../../types/products";
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
const inputStyle: CSSProperties = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, font: "inherit", background: "#fff" };

export default function StockBoxFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [tipo, setTipo] = useState<ProductType>("MEDICINE");
  const [productName, setProductName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [innerCount, setInnerCount] = useState("");
  const [unitsPerInner, setUnitsPerInner] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
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
  const term = productName.trim();
  const chosen = term
    ? filtered.find((p) => p.name.toLowerCase() === term.toLowerCase())
    : undefined;
  const creatingNew = term.length > 0 && !chosen;
  const semValidadeForced = !!chosen && !chosen.hasExpiry;

  const unidade = isMedicine ? "carteira" : "unidade";
  const inner = parseInt(innerCount, 10);
  const perInner = parseInt(unitsPerInner, 10);
  const total = parseInt(totalUnits, 10);

  let preview = "—";
  if (isMedicine && inner > 0 && perInner > 0) preview = `${inner} × ${perInner} = ${inner * perInner} carteiras`;
  if (!isMedicine && total > 0) preview = `${total} ${total === 1 ? "unidade" : "unidades"}`;

  function changeTipo(t: ProductType) {
    setTipo(t);
    setProductName("");
    setNoExpiry(false);
    setExpiryDate("");
    setSalePrice("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!term) return toast.error("Seleciona um produto ou escreve o nome de um novo.");
    if (!qrCode.trim()) return toast.error("O QR Code é obrigatório.");

    const usaValidade = !semValidadeForced && !noExpiry;
    let expiryIso: string | null = null;
    if (usaValidade) {
      if (!expiryDate) return toast.error("Indica a validade ou marca que não tem validade.");
      if (new Date(expiryDate) <= new Date()) return toast.error("A validade deve ser no futuro.");
      expiryIso = new Date(expiryDate).toISOString();
    }

    if (isMedicine) {
      if (isNaN(inner) || inner <= 0) return toast.error("Indica o número de caixinhas.");
      if (isNaN(perInner) || perInner <= 0) return toast.error("Indica as carteiras por caixinha.");
    } else if (isNaN(total) || total <= 0) {
      return toast.error("Indica o total de unidades.");
    }

    let cost: number | undefined;
    if (unitCost.trim() !== "") {
      const c = parseFloat(unitCost);
      if (isNaN(c) || c < 0) return toast.error("Custo unitário inválido.");
      cost = c;
    }

    let price = 0;
    if (creatingNew) {
      price = parseFloat(salePrice);
      if (isNaN(price) || price < 0) return toast.error("Indica o preço de venda do produto novo.");
    }

    setSubmitting(true);
    try {
      let productId = chosen?.id ?? "";
      if (!productId) {
        const body = {
          name: term,
          type: tipo,
          salePrice: price,
          hasExpiry: !noExpiry,
          status: "ACTIVE",
        } as unknown as ProductRequest;
        const created = await createProduct(body);
        productId = created.id;
        setProducts((prev) => [...prev, created]);
      }

      const payload: StockBoxCreateRequest = {
        productId,
        qrCode: qrCode.trim(),
        expiryDate: expiryIso,
      };
      if (isMedicine) {
        payload.innerCount = inner;
        payload.unitsPerInner = perInner;
      } else {
        payload.totalUnits = total;
      }
      if (cost !== undefined) payload.unitCost = cost;

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

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div>
          <label style={labelStyle}>Tipo do produto</label>
          <div style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            {(["MEDICINE", "PRODUCT"] as ProductType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeTipo(t)}
                style={{
                  border: 0,
                  padding: "8px 14px",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: "0.9rem",
                  background: tipo === t ? C.accent : "#fff",
                  color: tipo === t ? "#fff" : "#1d2433",
                }}
              >
                {t === "MEDICINE" ? "Medicamento" : "Produto"}
              </button>
            ))}
          </div>
          <div style={hintStyle}>Medicamento vende carteiras. Produto vende unidades.</div>
        </div>

        <div>
          <label style={labelStyle}>QR Code da caixa grande *</label>
          <input
            type="text"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            placeholder="Lê ou escreve o código da caixa"
            style={inputStyle}
          />
          <div style={hintStyle}>Caixa registada uma vez. O QR Code distingue-a das outras.</div>
        </div>

        <div>
          <label style={labelStyle}>Produto *</label>
          <input
            type="text"
            list="produtos-existentes"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Pesquisa ou escreve o nome"
            style={inputStyle}
          />
          <datalist id="produtos-existentes">
            {filtered.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <div style={{ ...hintStyle, color: creatingNew ? C.ok : C.muted }}>
            {creatingNew
              ? "Produto novo: será criado e aparecerá na lista da próxima vez."
              : filtered.length === 0
                ? "Ainda não há produtos deste tipo. Escreve o nome para criar."
                : "Escolhe da lista ou escreve um nome novo."}
          </div>
        </div>

        {creatingNew && (
          <div>
            <label style={labelStyle}>Preço de venda (MT) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>Validade (vale para toda a caixa)</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={semValidadeForced || noExpiry}
            style={{ ...inputStyle, opacity: semValidadeForced || noExpiry ? 0.6 : 1 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: "0.9rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={semValidadeForced || noExpiry}
              disabled={semValidadeForced}
              onChange={(e) => {
                setNoExpiry(e.target.checked);
                if (e.target.checked) setExpiryDate("");
              }}
            />
            Este produto não tem validade
          </label>
        </div>

        {isMedicine ? (
          <>
            <div>
              <label style={labelStyle}>Número de caixinhas dentro da caixa *</label>
              <input type="number" min="1" value={innerCount} onChange={(e) => setInnerCount(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Carteiras por caixinha *</label>
              <input type="number" min="1" value={unitsPerInner} onChange={(e) => setUnitsPerInner(e.target.value)} style={inputStyle} />
            </div>
          </>
        ) : (
          <div>
            <label style={labelStyle}>Quantas unidades tem a caixa *</label>
            <input type="number" min="1" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} style={inputStyle} />
          </div>
        )}

        <div>
          <label style={labelStyle}>Custo por {unidade} (opcional)</label>
          <input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginTop: 14, padding: "10px 12px", background: C.okSoft, border: `1px dashed ${C.ok}`, borderRadius: 8, fontSize: "0.9rem" }}>
        Unidade de venda definida automaticamente: <b>{unidade}</b>
      </div>
      <div style={{ marginTop: 10, padding: "10px 12px", background: C.accentSoft, borderRadius: 8, fontSize: "0.9rem" }}>
        Total a registar: <b>{preview}</b>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{ background: C.accent, color: "#fff", border: 0, borderRadius: 8, padding: "9px 16px", font: "inherit", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "A guardar..." : "Guardar caixa"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/stock/caixas")}
          style={{ background: "transparent", color: C.accent, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 16px", font: "inherit", cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
