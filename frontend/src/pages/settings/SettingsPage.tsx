import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../../services/settingsService";
import type { PharmacySettings, PharmacySettingsUpdate } from "../../types/settings";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import CustomSelect from "../../components/ui/CustomSelect";
import DeleteAccountSection from "./DeleteAccountSection";
import ResetDataSection from "./ResetDataSection";

type BoolKey =
  | "allowCashExpenses"
  | "collaboratorExpenses"
  | "requireApprovalForCash"
  | "usePayables"
  | "multiCurrency"
  | "supplierExtraFields";

const SWITCHES: { key: BoolKey; label: string; hint: string }[] = [
  { key: "allowCashExpenses", label: "Permitir despesas pela caixa", hint: "Despesas pagas com dinheiro da gaveta baixam o saldo do turno aberto." },
  { key: "collaboratorExpenses", label: "Colaborador regista despesas", hint: "Se desligado, a aba Despesas fica escondida no painel do colaborador." },
  { key: "requireApprovalForCash", label: "Exigir aprovação do administrador", hint: "A gaveta só baixa depois de o administrador aprovar a despesa." },
  { key: "usePayables", label: "Usar contas a pagar", hint: "Compras a prazo e pagamentos parciais a fornecedores." },
  { key: "multiCurrency", label: "Comprar noutras moedas", hint: "Moeda e câmbio por compra; o custo fica guardado em meticais." },
  { key: "supplierExtraFields", label: "Campos opcionais do fornecedor", hint: "NUIT e WhatsApp na ficha do fornecedor." },
];

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: "none",
        padding: 2,
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "#2563eb" : "#cbd5e1",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        justifyContent: checked ? "flex-end" : "flex-start",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
    </button>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vat, setVat] = useState("");

  function load() {
    setLoading(true);
    setError(false);
    getSettings()
      .then((s) => {
        setSettings(s);
        setVat(s.vatRegime ?? "");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(data: PharmacySettingsUpdate) {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, ...data });
    setSaving(true);
    try {
      const updated = await updateSettings(data);
      setSettings(updated);
      setVat(updated.vatRegime ?? "");
    } catch (err: any) {
      setSettings(prev);
      const msg = err?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Erro ao guardar as definições."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !settings) return <ErrorState message="Não foi possível carregar as definições." onRetry={load} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "760px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Definições</h1>

      {SWITCHES.map((sw) => (
        <div
          key={sw.key}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.9rem 0", borderBottom: "1px solid #f1f5f9" }}
        >
          <div>
            <div style={{ fontWeight: 500, color: "#1e293b" }}>{sw.label}</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.15rem" }}>{sw.hint}</div>
          </div>
          <Toggle
            checked={settings[sw.key]}
            disabled={saving || (sw.key === "requireApprovalForCash" && !settings.allowCashExpenses)}
            onChange={(v) => void patch({ [sw.key]: v } as PharmacySettingsUpdate)}
          />
        </div>
      ))}

      <div style={{ padding: "0.9rem 0", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ fontWeight: 500, color: "#1e293b", marginBottom: "0.15rem" }}>Repartição dos custos extras</div>
        <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.5rem" }}>Como transporte e taxas de uma compra são repartidos pelas caixas.</div>
        <div style={{ maxWidth: "280px" }}>
          <CustomSelect
            value={settings.extrasSplitMode}
            disabled={saving}
            onChange={(v) => void patch({ extrasSplitMode: v as "BY_VALUE" | "BY_UNITS" })}
            options={[
              { value: "BY_VALUE", label: "Por valor de aquisição" },
              { value: "BY_UNITS", label: "Por unidades" },
            ]}
          />
        </div>
      </div>

      <div style={{ padding: "0.9rem 0" }}>
        <div style={{ fontWeight: 500, color: "#1e293b", marginBottom: "0.15rem" }}>Regime de IVA</div>
        <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.5rem" }}>Texto que consta nos relatórios.</div>
        <div style={{ display: "flex", gap: "0.5rem", maxWidth: "420px" }}>
          <input type="text" className="input" maxLength={50} value={vat} onChange={(e) => setVat(e.target.value)} placeholder="Ex: Regime geral" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || vat.trim() === (settings.vatRegime ?? "")}
            onClick={() => void patch({ vatRegime: vat.trim() })}
          >
            Guardar
          </button>
        </div>
      </div>
      <ResetDataSection />
      <DeleteAccountSection />
    </div>
  );
}