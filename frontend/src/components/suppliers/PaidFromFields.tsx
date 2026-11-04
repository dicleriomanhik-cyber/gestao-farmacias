import { METHODS_FOR, METHOD_LABEL, PAID_FROM_OPTIONS } from "../../utils/supplierFormat";

interface Props {
  paidFrom: string;
  method: string;
  allowCash: boolean;
  onChange: (paidFrom: string, method: string) => void;
}

const labelStyle = { display: "block", marginBottom: "0.5rem", fontWeight: 500 } as const;

export default function PaidFromFields({ paidFrom, method, allowCash, onChange }: Props) {
  const options = PAID_FROM_OPTIONS.filter((o) => allowCash || o.value !== "PHARMACY_CASH");
  const methods = METHODS_FOR[paidFrom] ?? [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: methods.length > 1 ? "1fr 1fr" : "1fr", gap: "1rem" }}>
      <div>
        <label style={labelStyle}>Pago com *</label>
        <select className="input" value={paidFrom} onChange={(e) => onChange(e.target.value, (METHODS_FOR[e.target.value] ?? [""])[0])}>
          <option value="">Seleciona</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {methods.length > 1 && (
        <div>
          <label style={labelStyle}>Método *</label>
          <select className="input" value={method} onChange={(e) => onChange(paidFrom, e.target.value)}>
            {methods.map((m) => (
              <option key={m} value={m}>{METHOD_LABEL[m] ?? m}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}