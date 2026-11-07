import { useState } from "react";
import { apiClient } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function ResetDataSection() {
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (!password) return;
    setResetting(true);
    try {
      await apiClient.post("/admin/reset-test-data", { password });
      setShow(false);
      setPassword("");
      toast.success("Dados da farm\u00e1cia reiniciados com sucesso.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message ?? "Erro ao resetar dados.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <div style={{ marginTop: "1.5rem", padding: "1rem", border: "1px solid #fecaca", backgroundColor: "#fef2f2", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#b91c1c", marginBottom: "0.5rem" }}>Zona de Perigo</h3>
        <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "1rem" }}>{"Apaga toda a informa\u00e7\u00e3o da farm\u00e1cia: vendas, devolu\u00e7\u00f5es, despesas, caixas, fornecedores, compras, produtos e todo o stock. Mant\u00e9m a conta, as defini\u00e7\u00f5es e os utilizadores. Pede a palavra-passe do administrador."}</p>
        <button onClick={() => { setPassword(""); setShow(true); }} disabled={resetting} className="btn btn-danger" style={{ width: "100%", padding: "0.75rem", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: resetting ? "not-allowed" : "pointer", opacity: resetting ? 0.6 : 1 }}>
          {resetting ? "A resetar\u2026" : "Resetar Dados da Farm\u00e1cia"}
        </button>
      </div>

      {show && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setShow(false)}>
          <div className="card" style={{ backgroundColor: "white", borderRadius: "12px", padding: "1.5rem", maxWidth: "450px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.75rem", color: "#b91c1c" }}>{"Resetar Dados da Farm\u00e1cia"}</h2>
            <p style={{ color: "#475569", marginBottom: "1.5rem" }}>{"Tens a certeza? Esta a\u00e7\u00e3o apaga TODA a informa\u00e7\u00e3o da farm\u00e1cia (vendas, devolu\u00e7\u00f5es, despesas, caixas, fornecedores, compras, produtos e stock) e n\u00e3o pode ser desfeita."}</p>
            <input type="password" className="input" autoComplete="current-password" placeholder="Palavra-passe do administrador" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: "1.5rem" }} />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShow(false)} disabled={resetting} style={{ padding: "0.55rem 1.1rem", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", cursor: "pointer", fontSize: "0.9rem" }}>Cancelar</button>
              <button onClick={handleReset} disabled={resetting || !password} style={{ padding: "0.55rem 1.1rem", borderRadius: 999, border: "none", background: "#e11d1d", color: "#fff", cursor: resetting ? "not-allowed" : "pointer", fontSize: "0.9rem", fontWeight: 600, opacity: resetting ? 0.7 : 1 }}>{resetting ? "A resetar\u2026" : "Sim, Resetar"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}