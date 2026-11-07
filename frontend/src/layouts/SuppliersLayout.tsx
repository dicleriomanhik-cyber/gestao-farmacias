import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { getSuppliers } from "../services/supplierService";
import { getSettings } from "../services/settingsService";
import { useToast } from "../contexts/ToastContext";

const base = { padding: "8px 14px", borderRadius: 999, border: "1px solid #d9dee9", fontSize: 14, textDecoration: "none", cursor: "pointer" } as const;

export default function SuppliersLayout() {
  const { id } = useParams();
  const { pathname } = useLocation();
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
    background: active ? "var(--brand)" : "#ffffff",
    color: active ? "#ffffff" : "#1d2433",
    borderColor: active ? "var(--brand)" : "#d9dee9",
  });

  async function abrirFicha() {
    setAbrindo(true);
    try {
      const res = await getSuppliers({ page: 1, limit: 1 });
      const primeiro = res.data?.[0];
      navigate(primeiro ? `/fornecedores/${primeiro.id}` : "/fornecedores/ficha");
    } catch {
      toast.error("Erro ao abrir a ficha do fornecedor.");
    } finally {
      setAbrindo(false);
    }
  }

  const naFicha = Boolean(id) || pathname === "/fornecedores/ficha";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0, marginBottom: 16 }}>
        <NavLink to="/fornecedores" end style={({ isActive }) => tab(isActive)}>Lista</NavLink>
        {naFicha ? (
          <span style={tab(true)}>Ficha</span>
        ) : (
          <button
            type="button"
            onClick={abrirFicha}
            disabled={abrindo}
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