import { useEffect, useState } from "react";
import { openDb } from "../../offline/db";
import { visibleOperations, buildGroups } from "../../offline/outboxAdmin";
import { useApiOnline } from "../../offline/connectivity";
import { useNavigate, useLocation } from "react-router-dom";

export default function SyncStatusBadge() {
  const online = useApiOnline();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    async function refresh() {
      try {
        const db = await openDb();
        const tx = db.transaction("outbox", "readonly");
        const req = tx.objectStore("outbox").getAll();
        req.onsuccess = () => {
          const all = (req.result ?? []) as any[];
          const groups = buildGroups(visibleOperations(all));
          const isRej = (o: any) => o.status === "REJECTED" || o.status === "CONFLICT";
          setRejected(groups.filter((g) => g.ops.some(isRej)).length);
          setPending(groups.filter((g) => !g.ops.some(isRej)).length);
        };
        const metaReq = db.transaction("meta", "readonly").objectStore("meta").get("lastSyncAt");
        metaReq.onsuccess = () => {
          setLastSync(metaReq.result?.value ?? null);
        };
      } catch {
        // IndexedDB pode não estar disponível
      }
    }
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const dotColor = online ? "#22c55e" : "#ef4444";
  const tooltip = [
    online ? "Ligação: online" : "Ligação: offline",
    `Pendentes: ${pending}`,
    rejected > 0 ? `Rejeitadas: ${rejected}` : null,
    lastSync ? `Última sync: ${new Date(lastSync).toLocaleTimeString("pt-PT")}` : "Sem sync",
  ].filter(Boolean).join(" • ");

  return (
    <div
      title={tooltip + " • clique para ver"}
      role="button"
      onClick={() => navigate(pathname.startsWith("/pos") ? "/pos/sincronizacao" : "/sincronizacao")}
      style={{
        display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer",
        fontSize: "0.75rem", color: "#94a3b8", padding: "0.25rem 0.5rem",
        borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.05)",
      }}
    >
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: dotColor, display: "inline-block" }} />
      {pending + rejected > 0 && (
        <span style={{ fontWeight: 600, color: rejected > 0 ? "#fca5a5" : "#cbd5e1" }}>{pending + rejected}</span>
      )}
    </div>
  );
}