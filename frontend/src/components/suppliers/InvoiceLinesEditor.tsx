import type { PurchaseLine, PurchaseLineRequest } from "../../types/purchases";
import { fmtMoney } from "../../utils/supplierFormat";
import CustomSelect from "../ui/CustomSelect";

export interface LineDraft {
  key: string;
  productId?: string;
  type: "MEDICINE" | "PRODUCT";
  name: string;
  strength: string;
  boxes: string;
  pricePerBox: string;
  discount: string;
  innerCount: string;
  unitsPerInner: string;
  unitsPerBox: string;
}

export type LinesResult = { ok: true; lines: PurchaseLineRequest[] } | { ok: false; error: string };

let seq = 0;

const txt = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));
const toNum = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));

export function newLine(): LineDraft {
  seq += 1;
  return { key: "n" + seq, type: "MEDICINE", name: "", strength: "", boxes: "", pricePerBox: "", discount: "", innerCount: "", unitsPerInner: "", unitsPerBox: "" };
}

export function fromPurchaseLines(lines: PurchaseLine[]): LineDraft[] {
  return lines.map((l): LineDraft => {
    seq += 1;
    const medicine = l.product?.type === "MEDICINE";
    const disc = Number(l.discount);
    return {
      key: "e" + seq,
      productId: l.productId,
      type: medicine ? "MEDICINE" : "PRODUCT",
      name: l.product?.name ?? "",
      strength: l.product?.strength ?? "",
      boxes: txt(l.quantity),
      pricePerBox: txt(Number(l.unitCost)),
      discount: disc > 0 ? String(disc) : "",
      innerCount: txt(l.innerCount),
      unitsPerInner: txt(l.unitsPerInner),
      unitsPerBox: medicine ? "" : txt(l.unitsPerBox),
    };
  });
}
function perBox(d: LineDraft): number | null {
  if (d.type === "MEDICINE") {
    const a = toNum(d.innerCount);
    const b = toNum(d.unitsPerInner);
    return a > 0 && b > 0 ? a * b : null;
  }
  const u = toNum(d.unitsPerBox);
  return u > 0 ? u : null;
}

function lineSubtotal(d: LineDraft): number {
  const q = toNum(d.boxes);
  const p = toNum(d.pricePerBox);
  if (!(q > 0) || !(p >= 0)) return 0;
  const disc = toNum(d.discount);
  return q * p - (disc > 0 ? disc : 0);
}

export function linesTotal(ds: LineDraft[]): number {
  return ds.reduce((s, d) => s + lineSubtotal(d), 0);
}

export function toLineRequests(ds: LineDraft[]): LinesResult {
  if (ds.length === 0) return { ok: false, error: "Acrescenta pelo menos uma linha." };
  const out: PurchaseLineRequest[] = [];
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    const n = "Linha " + (i + 1) + ": ";
    const q = toNum(d.boxes);
    const p = toNum(d.pricePerBox);
    if (!d.productId && !d.name.trim()) return { ok: false, error: n + "indica o nome." };
    if (!d.productId && d.type === "MEDICINE" && !d.strength.trim()) return { ok: false, error: n + "indica a dosagem." };
    if (!Number.isInteger(q) || q < 1) return { ok: false, error: n + "indica a quantidade de caixas." };
    if (isNaN(p) || p < 0) return { ok: false, error: n + "indica o preço por caixa." };
    const r: PurchaseLineRequest = { quantity: q, unitCost: p };
    if (d.productId) {
      r.productId = d.productId;
    } else {
      r.productName = d.name.trim();
      r.type = d.type;
      if (d.type === "MEDICINE") r.strength = d.strength.trim();
    }
    const disc = toNum(d.discount);
    if (disc > 0) r.discount = disc;
    if (d.type === "MEDICINE") {
      const a = toNum(d.innerCount);
      const b = toNum(d.unitsPerInner);
      if (isNaN(a) !== isNaN(b)) return { ok: false, error: n + "preenche as duas quantidades da caixa, ou nenhuma." };
      if (!isNaN(a) && !isNaN(b)) {
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) return { ok: false, error: n + "as quantidades da caixa devem ser inteiros positivos." };
        r.innerCount = a;
        r.unitsPerInner = b;
      }
    } else {
      const u = toNum(d.unitsPerBox);
      if (!isNaN(u)) {
        if (!Number.isInteger(u) || u < 1) return { ok: false, error: n + "as unidades por caixa devem ser um inteiro positivo." };
        r.unitsPerBox = u;
      }
    }
    out.push(r);
  }
  return { ok: true, lines: out };
}
const lab = { display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", color: "#64748b" } as const;
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" } as const;

interface Props {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  currency: string;
}

type TextKey = "name" | "strength" | "boxes" | "pricePerBox" | "innerCount" | "unitsPerInner" | "unitsPerBox";

export default function InvoiceLinesEditor({ lines, onChange, currency }: Props) {
  function patch(key: string, p: Partial<LineDraft>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...p } : l)));
  }

  function field(l: LineDraft, label: string, k: TextKey, numeric: boolean) {
    return (
      <div>
        <label style={lab}>{label}</label>
        <input
          className="input"
          type={numeric ? "number" : "text"}
          min={numeric ? "0" : undefined}
          step={k === "pricePerBox" ? "0.01" : numeric ? "1" : undefined}
          value={l[k]}
          onChange={(e) => patch(l.key, { [k]: e.target.value } as Partial<LineDraft>)}
        />
      </div>
    );
  }

  return (
    <div>
      {lines.map((l, i) => {
        const units = perBox(l);
        const price = toNum(l.pricePerBox);
        const medicine = l.type === "MEDICINE";
        return (
          <div key={l.key} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", marginBottom: "0.75rem" }}>
            <div className="inv-line-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <strong>Linha {i + 1}</strong>
              <button type="button" className="btn btn-danger inv-line-remove" onClick={() => onChange(lines.filter((x) => x.key !== l.key))}>Remover</button>
            </div>
            {l.productId ? (
              <div style={{ marginBottom: "0.75rem" }}>
                {medicine ? "Medicamento" : "Produto"}: <strong>{l.name}{l.strength ? " " + l.strength : ""}</strong>
              </div>
            ) : (
              <div style={grid}>
                <div>
                  <label style={lab}>Tipo</label>
                  <CustomSelect value={l.type} onChange={(v) => patch(l.key, { type: v as "MEDICINE" | "PRODUCT" })} options={[{ value: "MEDICINE", label: "Medicamento" }, { value: "PRODUCT", label: "Produto" }]} />
                </div>
                {field(l, "Nome", "name", false)}
                {medicine && field(l, "Dosagem", "strength", false)}
              </div>
            )}
            <div style={grid}>
              {field(l, "Caixas", "boxes", true)}
              {field(l, "Preço por caixa", "pricePerBox", true)}
              {medicine ? field(l, "Embalagens por caixa", "innerCount", true) : field(l, "Unidades por caixa", "unitsPerBox", true)}
              {medicine && field(l, "Unidades por embalagem", "unitsPerInner", true)}
            </div>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <span>Preço unitário: {units !== null && price >= 0 ? fmtMoney(price / units, currency) : "—"}</span>
              <span>Subtotal: {fmtMoney(lineSubtotal(l), currency)}</span>
            </div>
          </div>
        );
      })}
      <button type="button" className="btn btn-secondary" onClick={() => onChange([...lines, newLine()])}>+ Acrescentar linha</button>
      <div style={{ marginTop: "0.75rem", fontWeight: 600 }}>Total das linhas: {fmtMoney(linesTotal(lines), currency)}</div>
    </div>
  );
}