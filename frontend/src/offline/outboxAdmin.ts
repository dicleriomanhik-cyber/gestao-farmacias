import { openDb, type OutboxOperation } from "./db";
import { triggerSync } from "./events";
import { generateUuid } from "./queue";

export async function listOpenOperations(): Promise<OutboxOperation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("outbox", "readonly").objectStore("outbox").getAll();
    req.onsuccess = () => {
      const all = (req.result ?? []) as OutboxOperation[];
      resolve(all.filter((o) => o.status !== "PROCESSED").sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function retryOperationNow(idempotencyKey: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["outbox", "returns"], "readwrite");
    const outbox = tx.objectStore("outbox");
    const req = outbox.get(idempotencyKey);
    req.onsuccess = () => {
      const o = req.result as OutboxOperation | undefined;
      if (!o) return;
      const fresh: OutboxOperation = { ...o, status: "PENDING" };
      delete fresh.rejectionCode;
      delete fresh.rejectionReason;
      delete fresh.result;
      if (o.operationType === "SALE" || o.operationType === "PAYMENT") {
        outbox.put(fresh);
        return;
      }
      const newKey = generateUuid();
      fresh.idempotencyKey = newKey;
      outbox.delete(idempotencyKey);
      outbox.put(fresh);
      outbox.openCursor().onsuccess = (ev) => {
        const cur = (ev.target as IDBRequest).result as IDBCursorWithValue | null;
        if (!cur) return;
        const v = cur.value;
        if (v.payload?.createKey === idempotencyKey) cur.update({ ...v, payload: { ...v.payload, createKey: newKey } });
        cur.continue();
      };
      tx.objectStore("returns").openCursor().onsuccess = (ev) => {
        const cur = (ev.target as IDBRequest).result as IDBCursorWithValue | null;
        if (!cur) return;
        const v = cur.value;
        if (v.createKey === idempotencyKey) cur.update({ ...v, createKey: newKey });
        cur.continue();
      };
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  triggerSync();
}

export async function discardOperation(idempotencyKey: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").delete(idempotencyKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export function needsAttention(o: OutboxOperation): boolean {
  if (o.status === "REJECTED" || o.status === "CONFLICT") return true;
  return (o.status === "PENDING" || o.status === "SYNCING") && JSON.stringify(o.payload ?? {}).includes("LOCAL-");
}
export function visibleOperations(all: OutboxOperation[]): OutboxOperation[] {
  return all.filter(
    (o) =>
      o.status !== "PROCESSED" &&
      !((o.operationType === "PAYMENT" || o.operationType === "CASH_OPEN") && (o.status === "PENDING" || o.status === "SYNCING"))
  );
}
const RETURN_TYPES = ["RETURN", "RETURN_CONFIRM", "RETURN_INSPECT", "RETURN_CANCEL", "REFUND"];

export type OpGroup = { id: string; ops: OutboxOperation[] };

export function groupKeyOf(o: OutboxOperation): string {
  if (o.operationType === "RETURN") return o.idempotencyKey;
  if (o.operationType.startsWith("EXPENSE_") && o.payload?.createKey) return String(o.payload.createKey);
  if (o.operationType === "STOCK_BOX_CREATE" && o.payload?.createKey) return String(o.payload.createKey);
  if (RETURN_TYPES.includes(o.operationType) && o.payload?.createKey) return String(o.payload.createKey);
  return o.idempotencyKey;
}

export function buildGroups(rows: OutboxOperation[]): OpGroup[] {
  const map = new Map<string, OutboxOperation[]>();
  for (const o of rows) {
    const k = groupKeyOf(o);
    const list = map.get(k);
    if (list) list.push(o);
    else map.set(k, [o]);
  }
  return Array.from(map.entries()).map(([id, ops]) => ({ id, ops }));
}