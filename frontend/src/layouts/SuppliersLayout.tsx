import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { getSuppliers } from "../services/supplierService";
import { getSettings } from "../services/settingsService";
import { useToast } from "../contexts/ToastContext";

const base = { padding: "8px 14px", borderRadius: 8, border: "1px solid #d9dee9", fontSize: 14, textDecoration: "none", cursor: "pointer" } as const;

export default function SuppliersLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [abrindo, setAbrindo] = useState(false);
  const [payables, setPayables] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => setPayables(Boolean(s.usePayables)))
      .catch(() => setPayables(false));
  }, []);

  const tab = (active: boolean) => ({
    ...base,
    background: active ? "#2f5bd3" : "#ffffff",
    color: active ? "#ffffff" : "#1d2433",
    borderColor: active ? "#2f5bd3" : "#d9dee9",
  });

  async function abrirPrimeiraFicha() {
    setAbrindo(true);
    try {
      const res = await getSuppliers({ page: 1, limit: 1 });
      const primeiro = res.data?.[0];
      if (!primeiro) {
        toast.error("Ainda não há fornecedores.");
        return;
      }
      navigate(`/fornecedores/${primeiro.id}`);
    } catch {
      toast.error("Erro ao abrir a ficha do fornecedor.");
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0, marginBottom: 16 }}>
        <NavLink to="/fornecedores" end style={({ isActive }) => tab(isActive)}>Lista</NavLink>
        {id ? (
          <span style={tab(true)}>Ficha</span>
        ) : (
          <button
            type="button"
            onClick={abrirPrimeiraFicha}
            disabled={abrindo}
            title="Abre a ficha do primeiro fornecedor"
            style={{ ...tab(false), fontFamily: "inherit", fontSize: 14, opacity: abrindo ? 0.6 : 1 }}
          >
            {abrindo ? "A abrir..." : "Ficha"}
          </button>
        )}
        <NavLink to="/fornecedores/compras" style={({ isActive }) => tab(isActive)}>Compras</NavLink>
        {payables && (
          <NavLink to="/fornecedores/contas-a-pagar" style={({ isActive }) => tab(isActive)}>Contas a pagar</NavLink>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Outlet />
      </div>
    </div>
  );
}