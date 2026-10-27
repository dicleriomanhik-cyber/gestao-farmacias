import { useEffect, useState } from "react";
import { openDb } from "../../offline/db";

export default function SyncStatusBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      setOnline(navigator.onLine);
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    async function refresh() {
      try {
        const db = await openDb();
        const tx = db.transaction("outbox", "readonly");
        const req = tx.objectStore("outbox").getAll();
        req.onsuccess = () => {
          const all = (req.result ?? []) as any[];
          setPending(all.filter((o) => o.status === "PENDING" || o.status === "SYNCING").length);
          setRejected(all.filter((o) => o.status === "REJECTED" || o.status === "CONFLICT").length);
        };
        const metaTx = db.transaction("meta", "readonly");
        const metaReq = metaTx.objectStore("meta").get("lastSyncAt");
        metaReq.onsuccess = () => {
          setLastSync(metaReq.result?.value ?? null);
        };
      } catch {
        // IndexedDB pode não estar disponível
      }
    }
    refresh();
    const interval = setInterval(refresh, 5000);
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
      title={tooltip}
      style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        fontSize: "0.75rem", color: "#94a3b8", padding: "0.25rem 0.5rem",
        borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.05)",
      }}
    >
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: dotColor, display: "inline-block" }} />
      {pending > 0 && <span>{pending} pend.</span>}
      {rejected > 0 && <span style={{ color: "#fca5a5" }}>{rejected} rej.</span>}
    </div>
  );
}
