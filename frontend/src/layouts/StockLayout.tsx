import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { getStockBoxes } from "../services/stockService";
import { useToast } from "../contexts/ToastContext";
import { useDataChanged } from "../offline/dataChanged";

const base = { padding: "8px 14px", borderRadius: 8, border: "1px solid #d9dee9", fontSize: 14, textDecoration: "none", cursor: "pointer" } as const;

export default function StockLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [abrindo, setAbrindo] = useState(false);
  const [temCaixas, setTemCaixas] = useState<boolean | null>(null);

  function verificar() {
    getStockBoxes({ limit: 1 })
      .then((res) => setTemCaixas((res.data?.length ?? 0) > 0))
      .catch(() => undefined);
  }

  useEffect(() => {
    verificar();
  }, []);

  useDataChanged(verificar);

  const semCaixas = temCaixas === false;

  const tab = (active: boolean) => ({
    ...base,
    background: active ? "#2f5bd3" : "#ffffff",
    color: active ? "#ffffff" : "#1d2433",
    borderColor: active ? "#2f5bd3" : "#d9dee9",
  });

  async function abrirPrimeiraCaixa() {
    if (semCaixas) return;
    setAbrindo(true);
    try {
      const res = await getStockBoxes({ limit: 100 });
      const primeira = res.data?.[0];
      if (!primeira) {
        setTemCaixas(false);
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
        <NavLink to="/stock/receber" end style={({ isActive }) => tab(isActive)}>Receber mercadoria</NavLink>
        <NavLink to="/stock/caixas/nova" end style={({ isActive }) => tab(isActive)}>Registo sem fatura</NavLink>
        <NavLink to="/stock/caixas" end style={({ isActive }) => tab(isActive)}>Caixas em stock</NavLink>
        {id ? (
          <span style={tab(true)}>Detalhe da caixa</span>
        ) : (
          <button
            type="button"
            onClick={abrirPrimeiraCaixa}
            disabled={abrindo || semCaixas}
            title={semCaixas ? "Nenhuma caixa registada" : "Abre a primeira caixa em stock"}
            style={{
              ...tab(false),
              font: "inherit",
              opacity: abrindo ? 0.6 : semCaixas ? 0.5 : 1,
              cursor: semCaixas ? "not-allowed" : "pointer",
              background: semCaixas ? "#f3f4f6" : "#ffffff",
              color: semCaixas ? "#94a3b8" : "#1d2433",
            }}
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