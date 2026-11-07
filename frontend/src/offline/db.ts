const DB_NAME = "farmacia_offline";
const DB_VERSION = 5;

export interface OutboxOperation {
  idempotencyKey: string;
  clientId: string;
  operationType: "CASH_OPEN" | "SALE" | "PAYMENT" | "EXPENSE" | "RETURN" | "CASH_CLOSE" | "EXPENSE_CONFIRM" | "EXPENSE_CANCEL" | "EXPENSE_UPDATE" | "RETURN_CONFIRM" | "RETURN_INSPECT" | "RETURN_CANCEL" | "REFUND" | "CATEGORY_CREATE" | "CATEGORY_UPDATE" | "PRODUCT_CREATE" | "STOCK_BOX_CREATE" | "PURCHASE_LINE_DAMAGED" | "PURCHASE_LINE_CLOSE";
  payload: any;
  status: "PENDING" | "SYNCING" | "PROCESSED" | "REJECTED" | "CONFLICT";
  createdAt: string;
  result?: any;
  rejectionCode?: string;
  rejectionReason?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("outbox")) {
        const store = db.createObjectStore("outbox", { keyPath: "idempotencyKey" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      for (const name of ["sales", "sale_lines", "payments", "stock_movements", "cash_sessions", "cash_movements", "expenses", "returns", "products", "stock_lots", "categories", "users", "suppliers", "purchases", "pharmacy"]) { if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" }); }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function getMeta(key: string): Promise<any> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const req = tx.objectStore("meta").get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setMeta(key: string, value: any): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}



export async function putRecords(store: string, records: any[]): Promise<void> {
  if (records.length === 0) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    for (const r of records) os.put(r);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(store: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function applyChanges(changes: any[]): Promise<void> {
  const buckets: Record<string, any[]> = {};
  const add = (store: string, r: any) => {
    if (!buckets[store]) buckets[store] = [];
    buckets[store].push(r);
  };
  const resetStores = ["sales", "sale_lines", "payments", "stock_movements", "cash_sessions", "cash_movements", "expenses", "returns", "products", "stock_lots", "suppliers", "purchases"];
  let resetSeen = false;
  for (const c of changes) {
    const d = c.data;
    if (c.type === "PHARMACY_RESET") {
      resetSeen = true;
      for (const s of resetStores) delete buckets[s];
      continue;
    }
    if (c.type === "SALE") {
      const { lines, payments, ...sale } = d;
      add("sales", sale);
      for (const l of lines ?? []) add("sale_lines", { ...l, lots: l.lots ?? [] });
      for (const p of payments ?? []) add("payments", p);
    } else if (c.type === "STOCK_MOVEMENT") add("stock_movements", d);
    else if (c.type === "CASH_SESSION") add("cash_sessions", d);
    else if (c.type === "CASH_MOVEMENT") add("cash_movements", d);
    else if (c.type === "EXPENSE") add("expenses", d);
    else if (c.type === "RETURN") add("returns", d);
    else if (c.type === "PRODUCT") add("products", d);
    else if (c.type === "STOCK_LOT") add("stock_lots", d);
  }
  if (resetSeen) for (const s of resetStores) await clearStore(s);
  for (const store of Object.keys(buckets)) await putRecords(store, buckets[store]);
}

export async function deleteRecord(store: string, id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
