import { openDb, getMeta, setMeta, type OutboxOperation } from "./db";

export function generateUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let cachedClientId: string | null = null;
export async function getClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;
  let id = await getMeta("clientId");
  if (!id) {
    id = generateUuid();
    await setMeta("clientId", id);
  }
  cachedClientId = id;
  return id;
}

export async function enqueueOperation(
  operationType: "SALE" | "PAYMENT",
  payload: any
): Promise<OutboxOperation> {
  const db = await openDb();
  const clientId = await getClientId();
  const op: OutboxOperation = {
    idempotencyKey: generateUuid(),
    clientId,
    operationType,
    payload,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").add(op);
    tx.oncomplete = () => resolve(op);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingOperations(): Promise<OutboxOperation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readonly");
    const req = tx.objectStore("outbox").getAll();
    req.onsuccess = () => {
      const all = req.result as OutboxOperation[];
      resolve(all.filter((o) => o.status === "PENDING" || o.status === "SYNCING"));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateOperation(
  idempotencyKey: string,
  updates: Partial<OutboxOperation>
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const req = store.get(idempotencyKey);
    req.onsuccess = () => {
      const existing = req.result as OutboxOperation;
      if (!existing) return reject(new Error("Operation not found"));
      store.put({ ...existing, ...updates });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
