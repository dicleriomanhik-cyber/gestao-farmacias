import { useEffect, useState } from "react";
import { getPharmacy, updatePharmacy } from "../../services/pharmacyService";
import type { Pharmacy, PharmacyUpdateRequest } from "../../types/pharmacy";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission } from "../../utils/permissions";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import PageHeader from "../../components/ui/PageHeader";

export default function PharmacyPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [nif, setNif] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");

  const canWrite = hasPermission(user?.permissions, "pharmacy:config:write");

  function load() {
    setLoading(true);
    setError(false);
    getPharmacy()
      .then((p) => {
        setPharmacy(p);
        setName(p.name ?? "");
        setTradeName(p.tradeName ?? "");
        setLegalName(p.legalName ?? "");
        setNif(p.nif ?? "");
        setPhone(p.phone ?? "");
        setEmail(p.email ?? "");
        setAddress(p.address ?? "");
        setCity(p.city ?? "");
        setProvince(p.province ?? "");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome é obrigatório.");
    if (email && !email.includes("@")) return toast.error("Email inválido.");

    const payload: PharmacyUpdateRequest = {
      name: name.trim(),
      tradeName: tradeName.trim() || null,
      legalName: legalName.trim() || null,
      nif: nif.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      province: province.trim() || null,
    };

    setSubmitting(true);
    try {
      const updated = await updatePharmacy(payload);
      setPharmacy(updated);
      toast.success("Farmácia atualizada.");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Erro ao atualizar a farmácia."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar a farmácia." onRetry={load} />;
  if (!pharmacy) return <ErrorState message="Farmácia não encontrada." onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Farmácia"
        actions={
          <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            ID: {pharmacy.id.substring(0, 8)}…
          </span>
        }
      />

      <div className="card" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        {!canWrite && (
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            Não tens permissão para editar a farmácia. Apenas consulta.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Nome *</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!canWrite}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Nome Comercial</label>
              <input
                type="text"
                className="input"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                disabled={!canWrite}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Razão Social</label>
              <input
                type="text"
                className="input"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={!canWrite}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>NIF</label>
              <input
                type="text"
                className="input"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                disabled={!canWrite}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Telefone</label>
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!canWrite}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canWrite}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Endereço</label>
            <input
              type="text"
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!canWrite}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Cidade</label>
              <input
                type="text"
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!canWrite}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Província</label>
              <input
                type="text"
                className="input"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                disabled={!canWrite}
              />
            </div>
          </div>

          {canWrite && (
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.75rem" }}
            >
              {submitting ? "A guardar…" : "Guardar"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
