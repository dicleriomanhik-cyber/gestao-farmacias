import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { getStockBoxes } from "../services/stockService";
import { useToast } from "../contexts/ToastContext";

const base = { padding: "8px 14px", borderRadius: 8, border: "1px solid #d9dee9", fontSize: 14, textDecoration: "none", cursor: "pointer" } as const;

export default function StockLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [abrindo, setAbrindo] = useState(false);

  const tab = (active: boolean) => ({
    ...base,
    background: active ? "#2f5bd3" : "#ffffff",
    color: active ? "#ffffff" : "#1d2433",
    borderColor: active ? "#2f5bd3" : "#d9dee9",
  });

  async function abrirPrimeiraCaixa() {
    setAbrindo(true);
    try {
      const res = await getStockBoxes({ limit: 100 });
      const primeira = res.data?.[0];
      if (!primeira) {
        toast.error("Ainda não há caixas em stock.");
        return;
      }
      navigate(`/stock/caixas/${primeira.id}`);
    } catch {
      toast.error("Erro ao abrir o detalhe da caixa.");
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0, marginBottom: 16 }}>
        <NavLink to="/stock/caixas/nova" end style={({ isActive }) => tab(isActive)}>Registar caixa</NavLink>
        <NavLink to="/stock/caixas" end style={({ isActive }) => tab(isActive)}>Caixas em stock</NavLink>
        {id ? (
          <span style={tab(true)}>Detalhe da caixa</span>
        ) : (
          <button
            type="button"
            onClick={abrirPrimeiraCaixa}
            disabled={abrindo}
            title="Abre a primeira caixa em stock"
            style={{ ...tab(false), font: "inherit", opacity: abrindo ? 0.6 : 1 }}
          >
            {abrindo ? "A abrir..." : "Detalhe da caixa"}
          </button>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Outlet />
      </div>
    </div>
  );
}