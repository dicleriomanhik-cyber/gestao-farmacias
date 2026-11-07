import { useContext, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { deleteAccount } from "../../services/settingsService";
import { useToast } from "../../contexts/ToastContext";

export default function DeleteAccountSection() {
  const auth = useContext(AuthContext);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!password || busy) return;
    setBusy(true);
    try {
      await deleteAccount(password);
      if (auth) await auth.logout();
      window.location.assign("/");
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message;
      toast.error(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Não foi possível eliminar a conta."));
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", border: "1px solid #fecaca", background: "#fef2f2", borderRadius: "0.75rem" }}>
      <div style={{ fontWeight: 600, color: "#991b1b" }}>Eliminar conta</div>
      <div style={{ fontSize: "0.85rem", color: "#7f1d1d", margin: "0.25rem 0 0.75rem" }}>
        Elimina para sempre a conta do administrador, a conta do POS, os colaboradores e todos os dados da farmácia (vendas, stock, caixas, despesas). O email fica livre para um novo registo. Esta ação não pode ser desfeita.
      </div>
      {!open ? (
        <button type="button" className="btn" style={{ background: "#e11d1d", color: "#fff", border: "none", fontWeight: 600 }} onClick={() => setOpen(true)}>
          Eliminar conta
        </button>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", maxWidth: "520px" }}>
          <input
            type="password"
            className="input"
            autoComplete="current-password"
            placeholder="Palavra-passe do administrador"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ flex: 1, minWidth: "220px" }}
          />
          <button type="button" className="btn" disabled={busy || !password} style={{ background: "#e11d1d", color: "#fff", border: "none", fontWeight: 600 }} onClick={() => void confirmDelete()}>
            {busy ? "A eliminar..." : "Confirmar eliminação"}
          </button>
          <button type="button" className="btn" disabled={busy} style={{ background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0" }} onClick={() => { setOpen(false); setPassword(""); }}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}