import CustomSelect from "../ui/CustomSelect";
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
        <label style={labelStyle}>Pago com</label>
        <CustomSelect value={paidFrom} onChange={(v) => onChange(v, (METHODS_FOR[v] ?? [""])[0])} placeholder="Selecciona" options={options.map((o) => ({ value: o.value, label: o.label }))} />
      </div>
      {methods.length > 1 && (
        <div>
          <label style={labelStyle}>Método</label>
          <CustomSelect value={method} onChange={(v) => onChange(paidFrom, v)} options={methods.map((m) => ({ value: m, label: METHOD_LABEL[m] ?? m }))} />
        </div>
      )}
    </div>
  );
}