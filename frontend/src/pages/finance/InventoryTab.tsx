import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  cancelInventory,
  completeInventory,
  createInventory,
  getInventory,
  listInventories,
  saveInventoryCounts,
  type InventoryDetail,
  type InventoryStatus,
  type InventorySummary,
} from "../../services/inventoryService";

const STATUS_LABELS: Record<InventoryStatus, string> = { OPEN: "Aberto", COMPLETED: "Concluído", CANCELLED: "Cancelado" };
const STATUS_COLORS: Record<InventoryStatus, string> = { OPEN: "#b45309", COMPLETED: "#166534", CANCELLED: "#64748b" };
const primary = { backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" } as const;

function msgOf(err: any, fallback: string): string {
  if (!err?.response) return "Não foi possível ligar à internet.";
  const m = err.response?.data?.error?.message;
  return Array.isArray(m) ? m.join(" ") : (m ?? fallback);
}

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleDateString("pt-PT") : "—";
}

export default function InventoryTab() {
  const toast = useToast();
  const [rows, setRows] = useState<InventorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listInventories());
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao carregar os inventários."));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    setCreating(true);
    try {
      const r = await createInventory(notes.trim() || undefined);
      setNotes("");
      setOpenId(r.id);
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao abrir o inventário."));
    } finally {
      setCreating(false);
    }
  }

  if (openId) {
    return (
      <InventoryDetailView
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.25rem", color: "#475569" }}>Nota (opcional)</label>
          <input type="text" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }} />
        </div>
        <button onClick={onCreate} disabled={creating} style={{ ...primary, opacity: creating ? 0.6 : 1 }}>
          {creating ? "A abrir…" : "Novo inventário"}
        </button>
      </div>
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        {loading ? (
          <p style={{ color: "#64748b" }}>A carregar…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#64748b" }}>Ainda não há inventários.</p>
        ) : (
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Estado</th>
                <th>Contadas</th>
                <th>Divergentes</th>
                <th>Diferença líquida</th>
                <th>Nota</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td style={{ color: STATUS_COLORS[r.status], fontWeight: 600 }}>{STATUS_LABELS[r.status]}</td>
                  <td>{r.countedLines}/{r.totalLines}</td>
                  <td>{r.divergentLines}</td>
                  <td>{r.netDifference > 0 ? "+" : ""}{r.netDifference}</td>
                  <td>{r.notes ?? "—"}</td>
                  <td><button className="btn btn-secondary" onClick={() => setOpenId(r.id)}>{r.status === "OPEN" ? "Continuar" : "Ver"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InventoryDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const toast = useToast();
  const [inv, setInv] = useState<InventoryDetail | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getInventory(id);
      setInv(d);
      const c: Record<string, string> = {};
      d.lines.forEach((l) => {
        c[l.id] = l.countedQty === null ? "" : String(l.countedQty);
      });
      setCounts(c);
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao carregar o inventário."));
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = inv?.status === "OPEN";

  const visible = useMemo(() => {
    if (!inv) return [];
    const q = search.trim().toLowerCase();
    return q ? inv.lines.filter((l) => l.productName.toLowerCase().includes(q) || l.qrCode.toLowerCase().includes(q)) : inv.lines;
  }, [inv, search]);

  const pending = useMemo(() => {
    if (!inv) return [];
    return inv.lines
      .filter((l) => {
        const raw = counts[l.id] ?? "";
        const v = raw === "" ? null : Number(raw);
        return v !== l.countedQty;
      })
      .map((l) => {
        const raw = counts[l.id] ?? "";
        return { lineId: l.id, countedQty: raw === "" ? null : Math.max(0, Math.floor(Number(raw))) };
      });
  }, [inv, counts]);

  const stats = useMemo(() => {
    if (!inv) return { counted: 0, divergent: 0 };
    let counted = 0;
    let divergent = 0;
    inv.lines.forEach((l) => {
      const raw = counts[l.id] ?? "";
      if (raw !== "") {
        counted++;
        if (Number(raw) !== l.expectedQty) divergent++;
      }
    });
    return { counted, divergent };
  }, [inv, counts]);

  async function save(): Promise<boolean> {
    if (pending.length === 0) return true;
    try {
      await saveInventoryCounts(id, pending);
      return true;
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao guardar as contagens."));
      return false;
    }
  }

  async function onSave() {
    setBusy(true);
    if (await save()) {
      toast.success("Contagens guardadas.");
      await load();
    }
    setBusy(false);
  }

  async function onComplete() {
    if (!inv) return;
    const missing = inv.lines.length - stats.counted;
    const msg = (missing > 0 ? missing + " caixas sem contagem ficam como estão. " : "") + "Concluir aplica as diferenças ao stock e não pode ser desfeito. Continuar?";
    if (!window.confirm(msg)) return;
    setBusy(true);
    if (await save()) {
      try {
        await completeInventory(id);
        toast.success("Inventário concluído e stock ajustado.");
        await load();
      } catch (err: any) {
        toast.error(msgOf(err, "Erro ao concluir o inventário."));
      }
    }
    setBusy(false);
  }

  async function onCancel() {
    if (!window.confirm("Cancelar este inventário? As contagens são descartadas e o stock não muda.")) return;
    setBusy(true);
    try {
      await cancelInventory(id);
      toast.success("Inventário cancelado.");
      await load();
    } catch (err: any) {
      toast.error(msgOf(err, "Erro ao cancelar o inventário."));
    } finally {
      setBusy(false);
    }
  }

  if (!inv) return <p style={{ color: "#64748b" }}>A carregar…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack}>← Voltar</button>
          <span style={{ marginLeft: "0.75rem", fontWeight: 600, color: STATUS_COLORS[inv.status] }}>{STATUS_LABELS[inv.status]}</span>
          <span style={{ marginLeft: "0.75rem", color: "#64748b" }}>{fmtDate(inv.createdAt)}{inv.notes ? " · " + inv.notes : ""}</span>
        </div>
        {open && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancelar inventário</button>
            <button className="btn btn-secondary" onClick={onSave} disabled={busy || pending.length === 0}>Guardar</button>
            <button onClick={onComplete} disabled={busy} style={{ ...primary, opacity: busy ? 0.6 : 1 }}>Concluir</button>
          </div>
        )}
      </div>
      <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
        <input type="text" placeholder="Procurar produto ou código da caixa" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: "220px", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px", boxSizing: "border-box" }} />
        {open && <span style={{ color: "#475569" }}>Contadas: {stats.counted}/{inv.lines.length} · Divergentes: {stats.divergent}</span>}
      </div>
      <div className="card" style={{ padding: "1rem", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Caixa</th>
              <th>Validade</th>
              <th>Sistema</th>
              <th>Contado</th>
              <th>Diferença</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => {
              const raw = counts[l.id] ?? "";
              const diff = open ? (raw === "" ? null : Number(raw) - l.expectedQty) : l.appliedDiff;
              return (
                <tr key={l.id}>
                  <td>{l.productName}</td>
                  <td>{l.qrCode}</td>
                  <td>{fmtDate(l.expiryDate)}</td>
                  <td>{l.expectedQty}</td>
                  <td>
                    {open ? (
                      <input type="number" min={0} step={1} value={raw} onChange={(e) => setCounts((c) => ({ ...c, [l.id]: e.target.value }))} style={{ width: "90px", padding: "0.3rem", border: "1px solid #ccc", borderRadius: "4px" }} />
                    ) : (
                      l.countedQty ?? "—"
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: diff ? (diff < 0 ? "#b91c1c" : "#166534") : "#64748b" }}>
                    {diff === null || diff === undefined ? "—" : (diff > 0 ? "+" : "") + diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}