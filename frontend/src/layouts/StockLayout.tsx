import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { getStockBoxes } from "../services/stockService";
import { useToast } from "../contexts/ToastContext";
import { useDataChanged } from "../offline/dataChanged";

const base = { padding: "8px 14px", borderRadius: 8, border: "1px solid #d9dee9", fontSize: 14, textDecoration: "none", cursor: "pointer" } as const;

export default function StockLayout() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [abrindo, setAbrindo] = useState(false);
  const [primeiroId, setPrimeiroId] = useState<string | null | undefined>(undefined);

  function atualizar() {
    getStockBoxes({ limit: 1 })
      .then((res) => setPrimeiroId(res.data?.[0]?.id ?? null))
      .catch(() => undefined);
  }

  useEffect(atualizar, [pathname]);
  useDataChanged(atualizar);

  const tab = (active: boolean) => ({
    ...base,
    background: active ? "#2f5bd3" : "#ffffff",
    color: active ? "#ffffff" : "#1d2433",
    borderColor: active ? "#2f5bd3" : "#d9dee9",
  });

  async function abrirDetalhe() {
    if (primeiroId) {
      navigate(`/stock/caixas/${primeiroId}`);
      return;
    }
    setAbrindo(true);
    try {
      const res = await getStockBoxes({ limit: 1 });
      const primeira = res.data?.[0];
      setPrimeiroId(primeira?.id ?? null);
      navigate(primeira ? `/stock/caixas/${primeira.id}` : "/stock/caixas/detalhe");
    } catch {
      toast.error("Erro ao abrir o detalhe da caixa.");
    } finally {
      setAbrindo(false);
    }
  }

  const noDetalhe = Boolean(id) || pathname === "/stock/caixas/detalhe";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0, marginBottom: 16 }}>
        <NavLink to="/stock/receber" end style={({ isActive }) => tab(isActive)}>Receber mercadoria</NavLink>
        <NavLink to="/stock/caixas/nova" end style={({ isActive }) => tab(isActive)}>Registo sem fatura</NavLink>
        <NavLink to="/stock/caixas" end style={({ isActive }) => tab(isActive)}>Caixas em stock</NavLink>
        {noDetalhe ? (
          <span style={tab(true)}>Detalhe da caixa</span>
        ) : (
          <button
            type="button"
            onClick={abrirDetalhe}
            disabled={abrindo}
            style={{ ...tab(false), font: "inherit", opacity: abrindo ? 0.6 : 1 }}
          >
            {abrindo ? "A abrir..." : "Detalhe da caixa"}
          </button>
        )}
        <NavLink to="/stock/produtos" style={({ isActive }) => tab(isActive)}>Editar produtos</NavLink>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Outlet />
      </div>
    </div>
  );
}