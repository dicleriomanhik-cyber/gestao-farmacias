import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getSupplierById,
  createSupplier,
  updateSupplier,
} from "../../services/supplierService";
import { getSettings } from "../../services/settingsService";
import { useToast } from "../../contexts/ToastContext";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import { apiError } from "../../utils/supplierFormat";

const labelStyle = { display: "block", marginBottom: "0.5rem", fontWeight: 500 } as const;

export default function SupplierFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [notes, setNotes] = useState("");
  const [extras, setExtras] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    const supplier = isEditing && id ? getSupplierById(id) : Promise.resolve(null);
    Promise.all([supplier, getSettings().catch(() => null)])
      .then(([s, st]) => {
        setExtras(Boolean(st?.supplierExtraFields));
        if (s) {
          setName(s.name);
          setTaxId(s.taxId ?? "");
          setPhone(s.phone ?? "");
          setWhatsapp(s.whatsapp ?? "");
          setEmail(s.email ?? "");
          setAddress(s.address ?? "");
          setCity(s.city ?? "");
          setProvince(s.province ?? "");
          setNotes(s.notes ?? "");
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome é obrigatório.");

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      province: province.trim() || null,
      notes: notes.trim() || null,
      ...(extras ? { taxId: taxId.trim() || null, whatsapp: whatsapp.trim() || null } : {}),
    };

    setSubmitting(true);
    try {
      if (isEditing && id) {
        await updateSupplier(id, payload);
        toast.success("Fornecedor atualizado.");
      } else {
        await createSupplier(payload);
        toast.success("Fornecedor criado.");
      }
      navigate("/fornecedores");
    } catch (err: any) {
      toast.error(apiError(err, "Erro ao guardar fornecedor."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Não foi possível carregar o fornecedor." onRetry={load} />;

  return (
    <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>
        {isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
      </h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Nome *</label>
          <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        {extras && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>NUIT</label>
            <input type="text" className="input" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: extras ? "1fr 1fr" : "1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Telefone</label>
            <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {extras && (
            <div>
              <label style={labelStyle}>WhatsApp</label>
              <input type="tel" className="input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
          )}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Email</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Endereço</label>
          <input type="text" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>Cidade</label>
            <input type="text" className="input" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Província</label>
            <input type="text" className="input" value={province} onChange={(e) => setProvince(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>Notas</label>
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
          style={{ width: "100%", padding: "0.75rem" }}
        >
          {submitting ? "A guardar…" : "Guardar Fornecedor"}
        </button>
      </form>
    </div>
  );
}