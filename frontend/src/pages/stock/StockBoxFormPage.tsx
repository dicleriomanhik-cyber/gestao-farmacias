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

const labelStyle: CSSProperties = { display: "block", fontSize: "0.85rem", color: C.muted, marginBottom: "6px", fontWeight: 500 };
const hintStyle: CSSProperties = { fontSize: "0.8rem", color: C.muted, marginTop: "6px", lineHeight: 1.4 };
const inputStyle: CSSProperties = { width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, font: "inherit", background: "#fff", boxSizing: "border-box", fontSize: "0.95rem" };

export default function StockBoxFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [tipo, setTipo] = useState<ProductType>("MEDICINE");
  const [productName, setProductName] = useState("");
  const [dosage, setDosage] = useState("");
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
        // Junta o nome com a dosagem para o nome final do produto
        const finalName = dosage.trim() ? `${term} ${dosage.trim()}` : term;
        
        const body = {
          name: finalName,
          type: tipo,
          salePrice: price,
          hasExpiry: !noExpiry,
          status: "ACTIVE",
          strength: dosage.trim() || "N/A",          // Campo exigido pelo backend
          activeIngredient: term || "Desconhecido",  // Campo exigido pelo backend
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
    <div style={{ display: "flex", justifyContent: "center", padding: "1rem 1rem 80px" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "900px", background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.03)", padding: "2rem 2rem 6rem", position: "relative" }}>
        
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#1d2433", marginBottom: "1.5rem", marginTop: 0 }}>Registar caixa</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          
          {/* COLUNA ESQUERDA */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label style={labelStyle}>Tipo do produto</label>
              <div style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", width: "100%" }}>
                {(["MEDICINE", "PRODUCT"] as ProductType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeTipo(t)}
                    style={{
                      flex: 1,
                      border: 0,
                      padding: "10px 14px",
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: "0.95rem",
                      background: tipo === t ? C.accent : "#fff",
                      color: tipo === t ? "#fff" : "#1d2433",
                      transition: "background 0.2s"
                    }}
                  >
                    {t === "MEDICINE" ? "Medicamento" : "Produto"}
                  </button>
                ))}
              </div>
              <div style={hintStyle}>O tipo fica guardado no produto e aparece em todas as caixas dele.</div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 3 }}>
                <label style={labelStyle}>Nome do produto (editável pelo dono)</label>
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
                      : ""}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Dosagem (mg)</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="Ex: 500mg"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{isMedicine ? "Número de caixinhas dentro da caixa" : "Quantas unidades tem a caixa"}</label>
              <input
                type="number"
                min="1"
                value={isMedicine ? innerCount : totalUnits}
                onChange={(e) => (isMedicine ? setInnerCount(e.target.value) : setTotalUnits(e.target.value))}
                style={inputStyle}
              />
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
          </div>

          {/* COLUNA DIREITA */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label style={labelStyle}>QR Code da caixa grande</label>
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
              <label style={labelStyle}>Validade (vale para toda a caixa)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={semValidadeForced || noExpiry}
                style={{ ...inputStyle, opacity: semValidadeForced || noExpiry ? 0.6 : 1 }}
              />
            </div>

            {isMedicine && (
              <div>
                <label style={labelStyle}>Carteiras por caixinha</label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerInner}
                  onChange={(e) => setUnitsPerInner(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Custo por {unidade} (opcional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* CAIXAS DE RESUMO */}
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ padding: "12px 16px", background: C.okSoft, border: `1px dashed ${C.ok}`, borderRadius: 8, fontSize: "0.95rem", color: "#1d2433" }}>
            Unidade de venda definida automaticamente: <b>{unidade}</b>
            <div style={{ fontSize: "0.85rem", color: C.ok, marginTop: "2px" }}>Medicamento vende <b>carteira</b>. Produto vende <b>unidade</b>. Este nome aparece no painel do colaborador.</div>
          </div>
          
          <div style={{ padding: "12px 16px", background: C.accentSoft, borderRadius: 8, fontSize: "0.95rem", color: "#1d2433" }}>
            Total a registar: <b>{preview}</b>
          </div>
        </div>

        {/* BOTÕES FIXOS (STICKY) */}
        <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, marginTop: "1.5rem", padding: "1rem 2rem", background: "#fff", borderTop: `1px solid ${C.border}`, display: "flex", gap: "1rem", zIndex: 10, marginLeft: "-2rem", marginRight: "-2rem", marginBottom: "-6rem", borderRadius: "0 0 12px 12px" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{ background: C.accent, color: "#fff", border: 0, borderRadius: 8, padding: "10px 24px", font: "inherit", fontWeight: 500, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "A guardar..." : "Guardar caixa"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/stock/caixas")}
            style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 24px", font: "inherit", fontWeight: 500, cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
