import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission } from "../../utils/permissions";
import { useToast } from "../../contexts/ToastContext";
import { getPharmacy, updatePharmacy } from "../../services/pharmacyService";
import { getAllOperators, createOperator, updateOperator, type Operator } from "../../services/operatorService";

function msgOf(err: any, fallback: string): string {
  const m = err?.response?.data?.error?.message;
  return Array.isArray(m) ? m.join(" ") : (m ?? fallback);
}

export default function OperatorsPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const canPharmacy = hasPermission(user?.permissions, "pharmacy:config:write");
  const canOperators = hasPermission(user?.permissions, "users:write");
  const [pharmacyName, setPharmacyName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  function loadOperators() {
    getAllOperators().then(setOperators).catch(() => undefined);
  }

  useEffect(() => {
    getPharmacy()
      .then((p) => {
        const n = p.tradeName || p.name;
        setPharmacyName(n);
        setSavedName(n);
      })
      .catch(() => undefined);
    loadOperators();
  }, []);

  async function saveName() {
    const n = pharmacyName.trim();
    if (n.length < 2) return toast.error("O nome da farmácia deve ter pelo menos 2 caracteres.");
    setSavingName(true);
    try {
      await updatePharmacy({ name: n, tradeName: n });
      setPharmacyName(n);
      setSavedName(n);
      toast.success("Nome da farmácia guardado.");
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao guardar o nome da farmácia."));
    } finally {
      setSavingName(false);
    }
  }

  async function addOperator() {
    const n = newName.trim();
    if (n.length < 2) return toast.error("O nome deve ter pelo menos 2 caracteres.");
    setBusy(true);
    try {
      await createOperator(n);
      setNewName("");
      toast.success("Colaborador adicionado.");
      loadOperators();
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao adicionar o colaborador."));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    const n = editName.trim();
    if (n.length < 2) return toast.error("O nome deve ter pelo menos 2 caracteres.");
    setBusy(true);
    try {
      await updateOperator(id, { name: n });
      setEditId(null);
      toast.success("Nome atualizado.");
      loadOperators();
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao atualizar o nome."));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(o: Operator) {
    setBusy(true);
    try {
      await updateOperator(o.id, { isActive: !o.isActive });
      loadOperators();
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao atualizar o colaborador."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
      <div className="card" style={{ padding: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.75rem" }}>Nome da farmácia</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input className="input" value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} disabled={!canPharmacy} style={{ flex: 1, minWidth: "220px" }} />
          {canPharmacy && (
            <button type="button" className="btn btn-primary" onClick={saveName} disabled={savingName || pharmacyName.trim() === savedName}>
              {savingName ? "A guardar…" : "Guardar"}
            </button>
          )}
        </div>
        <small style={{ color: "#64748b" }}>Aparece na barra superior do painel do colaborador.</small>
      </div>

      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Colaboradores do caixa</h2>
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          Nomes de quem trabalha no caixa. Se houver mais de um, cada pessoa escolhe o seu nome na barra superior antes de vender.
        </p>
        {canOperators && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            <input
              className="input"
              placeholder="Nome do colaborador"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!busy) void addOperator();
                }
              }}
              style={{ flex: 1, minWidth: "220px" }}
            />
            <button type="button" className="btn btn-primary" onClick={addOperator} disabled={busy}>+ Adicionar</button>
          </div>
        )}
        {operators.length === 0 ? (
          <p style={{ color: "#64748b" }}>Ainda não há colaboradores registados.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((o) => (
                <tr key={o.id}>
                  <td>
                    {editId === o.id ? (
                      <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      o.name
                    )}
                  </td>
                  <td>
                    <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", backgroundColor: o.isActive ? "#dcfce7" : "#fee2e2", color: o.isActive ? "#166534" : "#991b1b" }}>
                      {o.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    {!canOperators ? (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    ) : editId === o.id ? (
                      <span style={{ display: "flex", gap: "0.75rem" }}>
                        <button type="button" disabled={busy} onClick={() => saveEdit(o.id)} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Guardar</button>
                        <button type="button" disabled={busy} onClick={() => setEditId(null)} style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Cancelar</button>
                      </span>
                    ) : (
                      <span style={{ display: "flex", gap: "0.75rem" }}>
                        <button type="button" disabled={busy} onClick={() => { setEditId(o.id); setEditName(o.name); }} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Editar</button>
                        <button type="button" disabled={busy} onClick={() => toggle(o)} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>{o.isActive ? "Desativar" : "Ativar"}</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}