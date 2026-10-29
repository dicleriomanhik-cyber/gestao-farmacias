import { useEffect, useRef, useState } from "react";
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
  text: "#1d2433",
  ok: "#0f7a4a",
  okSoft: "#e3f6ec",
};

const HIDDEN_KEY = "stockBoxFormHiddenSuggestions";

const labelStyle: CSSProperties = { display: "block", fontSize: "0.85rem", color: C.muted, marginBottom: "4px", fontWeight: 500 };
const hintStyle: CSSProperties = { fontSize: "0.75rem", color: C.muted, marginTop: "4px", lineHeight: 1.3 };
const inputStyle: CSSProperties = { width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, font: "inherit", background: "#fff", boxSizing: "border-box", fontSize: "0.9rem", minWidth: 0 };

function monthEnd(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0, 23, 59, 59)).toISOString();
}

// "Paracetamol 500 mg" -> { base: "Paracetamol", dose: "500" }
function splitDose(name: string): { base: string; dose: string } {
  const m = /^(.*?)\s+(\d+)\s*mg$/i.exec(name.trim());
  return m ? { base: m[1], dose: m[2] } : { base: name.trim(), dose: "" };
}

function loadHidden(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
  } catch {
    return [];
  }
}

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
  const [manufactureDate, setManufactureDate] = useState("");
  const [innerCount, setInnerCount] = useState("");
  const [unitsPerInner, setUnitsPerInner] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hidden, setHidden] = useState<string[]>(loadHidden);
  const [sugAberto, setSugAberto] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!sugAberto) return;
    const fechar = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) setSugAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [sugAberto]);

  const isMedicine = tipo === "MEDICINE";
  const filtered = products.filter((p) => p.type === tipo);
  const term = productName.trim();
  const chosen = term
    ? filtered.find((p) => p.name.toLowerCase() === term.toLowerCase())
    : undefined;
  const creatingNew = term.length > 0 && !chosen;
  const semValidadeForced = !!chosen && !chosen.hasExpiry;

  const sugestoes = Array.from(
    new Map(
      filtered
        .filter((p) => !hidden.includes(p.name.toLowerCase()))
        .map((p) => [p.name.toLowerCase(), p] as const)
    ).values()
  )
    .filter((p) => !term || p.name.toLowerCase().includes(term.toLowerCase()))
    .slice(0, 8);

  function ocultarSugestao(nome: string) {
    const novo = [...hidden, nome.toLowerCase()];
    setHidden(novo);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(novo));
  }

  function escolherSugestao(p: Product) {
    setProductName(p.name);
    setDosage(splitDose(p.name).dose);
    setSugAberto(false);
  }

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
    setDosage("");
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
      if (new Date(monthEnd(expiryDate)) <= new Date()) return toast.error("A validade deve ser no futuro.");
      if (manufactureDate && manufactureDate > expiryDate) return toast.error("O fabrico não pode ser depois da validade.");
      expiryIso = monthEnd(expiryDate);
    }

    if (isMedicine) {
      if (isNaN(inner) || inner <= 0) return toast.error("Indica o número de caixinhas.");
      if (isNaN(perInner) || perInner <= 0) return toast.error("Indica as carteiras por caixinha.");
    } else if (isNaN(total) || total <= 0) {
      return toast.error("Indica o total de unidades.");
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
        const base = splitDose(term).base;
        const finalName = isMedicine && dosage.trim() ? `${base} ${dosage.trim()} mg` : term;

        const body = {
          name: finalName,
          type: tipo,
          salePrice: price,
          hasExpiry: !noExpiry,
          status: "ACTIVE",
          strength: isMedicine && dosage.trim() ? `${dosage.trim()} mg` : "N/A",
          activeIngredient: base || "Desconhecido",
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
    <div className="sbf-wrap">
      <form autoComplete="off" onSubmit={handleSubmit} className="sbf-form">
        <h2 className="sbf-title">Registar caixa</h2>

        <section className="sbf-section">
          <div>
            <span style={labelStyle}>Tipo do produto</span>
            <div className="sbf-toggle">
              {(["MEDICINE", "PRODUCT"] as ProductType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => changeTipo(t)}
                  style={{ background: tipo === t ? C.accent : "#fff", color: tipo === t ? "#fff" : C.text }}
                >
                  {t === "MEDICINE" ? "Medicamento" : "Produto"}
                </button>
              ))}
            </div>
            <div style={hintStyle}>O tipo fica guardado no produto e aparece em todas as caixas dele.</div>
          </div>
        </section>

        <section className="sbf-section">
          <h3 className="sbf-subtitle">{isMedicine ? "Medicamento" : "Produto"}</h3>
          <div className="sbf-grid">
            <div className="sbf-field" ref={sugRef}>
              <label style={labelStyle}>{isMedicine ? "Nome do medicamento" : "Nome do produto"}</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  autoComplete="off"
                  value={productName}
                  onFocus={() => setSugAberto(true)}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    setSugAberto(true);
                  }}
                  placeholder="Pesquisa ou escreve o nome"
                  style={inputStyle}
                />
                {sugAberto && sugestoes.length > 0 && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6, boxShadow: "0 8px 20px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" }}>
                    {sugestoes.map((p) => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #f0f2f7" }}>
                        <button
                          type="button"
                          onClick={() => escolherSugestao(p)}
                          style={{ flex: 1, textAlign: "left", background: "none", border: 0, padding: "10px", cursor: "pointer", font: "inherit", fontSize: "0.9rem", color: C.text }}
                        >
                          {p.name}
                        </button>
                        <button
                          type="button"
                          title="Remover da sugestão"
                          aria-label={`Remover ${p.name} da sugestão`}
                          onClick={() => ocultarSugestao(p.name)}
                          style={{ background: "none", border: 0, cursor: "pointer", padding: "0 12px", color: C.muted, fontSize: "1.1rem", lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isMedicine && (
              <div className="sbf-field">
                <label style={labelStyle}>Dosagem</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ex: 500"
                    style={{ ...inputStyle, paddingRight: "3rem" }}
                  />
                  <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }}>mg</span>
                </div>
              </div>
            )}
          </div>

          <div className="sbf-grid">
            {isMedicine ? (
              <>
                <div className="sbf-field">
                  <label style={labelStyle}>Número de caixinhas</label>
                  <input autoComplete="off" type="number" min="1" value={innerCount} onChange={(e) => setInnerCount(e.target.value)} style={inputStyle} />
                </div>
                <div className="sbf-field">
                  <label style={labelStyle}>Carteiras por caixinha</label>
                  <input autoComplete="off" type="number" min="1" value={unitsPerInner} onChange={(e) => setUnitsPerInner(e.target.value)} style={inputStyle} />
                </div>
              </>
            ) : (
              <div className="sbf-field">
                <label style={labelStyle}>Total de unidades</label>
                <input autoComplete="off" type="number" min="1" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} style={inputStyle} />
              </div>
            )}
          </div>
        </section>

        <section className="sbf-section">
          <h3 className="sbf-subtitle">Caixa grande</h3>
          <div className="sbf-grid">
            <div className="sbf-field">
              <label style={labelStyle}>QR Code da caixa grande</label>
              <input type="text" value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="Lê ou escreve o código" style={inputStyle} />
              <div style={hintStyle}>Caixa registada uma vez. O QR Code distingue-a.</div>
            </div>
            <div className="sbf-field">
              <label style={labelStyle}>Data de fabrico</label>
              <MonthField value={manufactureDate} onChange={setManufactureDate} style={inputStyle} />
            </div>
          </div>
        </section>

        <section className="sbf-section">
          <h3 className="sbf-subtitle">Validade e preço</h3>
          <div className="sbf-grid">
            <div className="sbf-field">
              <div className="sbf-field-head">
                <label style={{ ...labelStyle, marginBottom: 0 }}>Validade</label>
                <label className="sbf-check">
                  <input type="checkbox" checked={noExpiry || semValidadeForced} disabled={semValidadeForced} onChange={(e) => setNoExpiry(e.target.checked)} />
                  Sem validade
                </label>
              </div>
              <MonthField value={expiryDate} onChange={setExpiryDate} disabled={semValidadeForced || noExpiry} style={{ ...inputStyle, opacity: semValidadeForced || noExpiry ? 0.6 : 1 }} />
            </div>
            <div className="sbf-field">
              <label style={labelStyle}>{isMedicine ? "Preço por carteira (MT)" : "Preço por unidade (MT)"}</label>
              <input autoComplete="off" type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </section>

        <section className="sbf-summary">
          <div style={{ padding: "8px 12px", background: C.okSoft, border: `1px dashed ${C.ok}`, borderRadius: 6, fontSize: "0.85rem", color: C.text }}>
            Unidade de venda automática: <b>{unidade}</b>
            <div style={{ fontSize: "0.75rem", color: C.ok, marginTop: "2px" }}>Medicamento vende carteira. Produto vende unidade.</div>
          </div>
          <div style={{ padding: "8px 12px", background: C.accentSoft, borderRadius: 6, fontSize: "0.85rem", color: C.text }}>
            Total a registar: <b>{preview}</b>
          </div>
        </section>

        <div className="sbf-actions">
          <button
            type="submit"
            disabled={submitting}
            style={{ background: C.accent, color: "#fff", border: 0, borderRadius: 6, padding: "10px 20px", font: "inherit", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "A guardar..." : "Guardar caixa"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/stock/caixas")}
            style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 20px", font: "inherit", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function MonthField({ value, onChange, disabled, style }: { value: string; onChange: (v: string) => void; disabled?: boolean; style?: CSSProperties }) {
  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const toText = (v: string) => {
    const m = /^(\d{4})-(\d{2})$/.exec(v || "");
    return m ? `${Number(m[2])}/${m[1]}` : "";
  };
  const [text, setText] = useState(toText(value));
  const [aberto, setAberto] = useState(false);
  const [anoVista, setAnoVista] = useState(value ? Number(value.slice(0, 4)) : anoAtual);

  useEffect(() => {
    setText(toText(value));
  }, [value]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto]);

  const handleText = (raw: string) => {
    let mes: string;
    let ano: string;
    if (raw.includes("/")) {
      [mes, ano] = raw.split("/");
    } else {
      const d = raw.replace(/\D/g, "");
      mes = d.slice(0, 2);
      ano = d.slice(2);
    }
    mes = (mes || "").replace(/\D/g, "").slice(0, 2);
    ano = (ano || "").replace(/\D/g, "").slice(0, 4);
    const masked = raw.includes("/") || ano ? `${mes}/${ano}` : mes;
    setText(masked);
    const m = /^(\d{1,2})\/(\d{4})$/.exec(masked);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) {
      onChange(`${m[2]}-${m[1].padStart(2, "0")}`);
    } else if (masked === "") {
      onChange("");
    }
  };

  const abrir = () => {
    if (disabled) return;
    setAnoVista(value ? Number(value.slice(0, 4)) : anoAtual);
    setAberto(true);
  };

  const escolherMes = (m: number) => {
    onChange(`${anoVista}-${String(m).padStart(2, "0")}`);
    setText(`${m}/${anoVista}`);
    setAberto(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="M/AAAA"
        value={text}
        disabled={disabled}
        onChange={(e) => handleText(e.target.value)}
        style={{ ...style, paddingRight: "2.5rem" }}
      />
      <button
        type="button"
        aria-label="Abrir calendário"
        disabled={disabled}
        onClick={abrir}
        style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 0, cursor: disabled ? "default" : "pointer", color: "#64748b", display: "flex" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {aberto && (
        <div
          className="cal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAberto(false);
          }}
        >
          <div className="cal-panel" role="dialog" aria-label="Escolher mês e ano">
            <div className="cal-head">
              <button type="button" className="cal-nav" onClick={() => setAnoVista(anoVista - 1)} aria-label="Ano anterior">‹</button>
              <span className="cal-year">{anoVista}</span>
              <button type="button" className="cal-nav" onClick={() => setAnoVista(anoVista + 1)} aria-label="Ano seguinte">›</button>
            </div>
            <div className="cal-grid">
              {MESES.map((nome, i) => {
                const iso = `${anoVista}-${String(i + 1).padStart(2, "0")}`;
                const selecionado = value === iso;
                const atual = hoje.getFullYear() === anoVista && hoje.getMonth() === i;
                return (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => escolherMes(i + 1)}
                    className={`cal-month${selecionado ? " is-selected" : ""}${atual ? " is-current" : ""}`}
                  >
                    {nome}
                  </button>
                );
              })}
            </div>
            <button type="button" className="cal-close" onClick={() => setAberto(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}