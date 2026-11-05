import { isApiOnline, startConnectivityProbe, subscribeApiOnline } from "./connectivity";
import { getPendingOperations, updateOperation, getClientId } from "./queue";
import { getMeta, setMeta, applyChanges, openDb, deleteRecord, type OutboxOperation } from "./db";
import { pushOperations, pullChanges } from "../services/syncService";
import { refreshCatalog } from "./catalog";
import { refreshAfterSync } from "./bootstrap";
import { notifyDataChanged } from "./dataChanged";
import { registerSyncHandler } from "./events";
import { apiClient, getAccessToken, getRefreshToken, setRefreshToken } from "../services/api";
import { refresh } from "../services/authService";

let settingsAt = 0;

async function refreshSettings(): Promise<void> {
  if (!isApiOnline() || Date.now() - settingsAt < 60000) return;
  settingsAt = Date.now();
  const r = await apiClient.get("/settings");
  await setMeta("settings", r.data.data);
}

let running = false;
let queued = false;
let engineStarted = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

type IdMap = Record<string, string>;

async function getIdMap(): Promise<IdMap> {
  return (await getMeta("idMap")) ?? {};
}

async function removeLocalSale(localId: string): Promise<void> {
  const db = await openDb();
  const stores = ["sales", "sale_lines", "payments", "stock_movements"];
  const tx = db.transaction(stores, "readwrite");
  for (const store of stores) {
    const field = store === "sales" ? "id" : store === "stock_movements" ? "referenceId" : "saleId";
    tx.objectStore(store).openCursor().onsuccess = (ev) => {
      const cur = (ev.target as IDBRequest).result as IDBCursorWithValue | null;
      if (!cur) return;
      if (cur.value[field] === localId) cur.delete();
      cur.continue();
    };
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeLocalBox(lotId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["stock_lots", "stock_movements"], "readwrite");
  tx.objectStore("stock_lots").delete(lotId);
  tx.objectStore("stock_movements").openCursor().onsuccess = (ev) => {
    const cur = (ev.target as IDBRequest).result as IDBCursorWithValue | null;
    if (!cur) return;
    if (cur.value.lotId === lotId) cur.delete();
    cur.continue();
  };
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function recordLocalMappings(saleKey: string, result: any): Promise<void> {
  const db = await openDb();
  const readAll = (store: string) =>
    new Promise<any[]>((resolve, reject) => {
      const q = db.transaction(store, "readonly").objectStore(store).getAll();
      q.onsuccess = () => resolve(q.result ?? []);
      q.onerror = () => reject(q.error);
    });
  const localLines = (await readAll("sale_lines")).filter((l) => l.saleId === saleKey);
  const localPays = (await readAll("payments")).filter((p) => p.saleId === saleKey);
  const free: any[] = [...(result?.lines ?? [])];
  const lineMap: IdMap = (await getMeta("lineMap")) ?? {};
  for (const l of localLines) {
    let i = free.findIndex((s) => s.productId === l.productId && Number(s.quantity) === Number(l.quantity));
    if (i < 0) i = free.findIndex((s) => s.productId === l.productId);
    if (i >= 0) {
      lineMap[l.id] = free[i].id;
      free.splice(i, 1);
    }
  }
  await setMeta("lineMap", lineMap);
  if (localPays[0]) {
    const payLocal: IdMap = (await getMeta("payLocal")) ?? {};
    payLocal[saleKey] = localPays[0].id;
    await setMeta("payLocal", payLocal);
  }
}

async function rejectedKeys(): Promise<Set<string>> { const db = await openDb(); return new Promise((resolve, reject) => { const r = db.transaction("outbox", "readonly").objectStore("outbox").getAll(); r.onsuccess = () => resolve(new Set((r.result as OutboxOperation[]).filter((o) => o.status === "REJECTED" || o.status === "CONFLICT").map((o) => o.idempotencyKey))); r.onerror = () => reject(r.error); }); }
async function flushOutbox(): Promise<number> {
  if (!isApiOnline()) return 0;
  const clientId = await getClientId();
  const pending = (await getPendingOperations()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (pending.length === 0) return 0;

  const idMap = await getIdMap();
  const lineMap: IdMap = (await getMeta("lineMap")) ?? {};
  const payMap: IdMap = (await getMeta("payMap")) ?? {};
  const categoryMap: IdMap = (await getMeta("categoryMap")) ?? {};
  const productMap: IdMap = (await getMeta("productMap")) ?? {};
  const prepared: { op: OutboxOperation; payload: any }[] = [];
  const held = new Set<string>(); const rej = await rejectedKeys();
  const pendingSaleKeys = new Set(pending.filter((o) => o.operationType === "SALE").map((o) => o.idempotencyKey));
  for (const op of pending) {
    const pl = op.payload ?? {};
    let payload = op.payload;
    let unresolved = !!pl.createKey && (held.has(pl.createKey) || rej.has(pl.createKey));
    const mapId = (id: any, map: IdMap): any => {
      if (typeof id !== "string" || !id.startsWith("LOCAL-")) return id;
      if (map[id]) return map[id];
      unresolved = true;
      return id;
    };
    if (op.operationType === "RETURN") {
      let sid = pl.saleId;
      if (sid && idMap[sid]) sid = idMap[sid];
      else if (sid && (pendingSaleKeys.has(sid) || rej.has(sid))) unresolved = true;
      payload = { ...pl, saleId: sid, lines: (pl.lines ?? []).map((l: any) => ({ ...l, saleLineId: mapId(l.saleLineId, lineMap) })) };
    } else if (op.operationType === "RETURN_INSPECT") {
      payload = { ...pl, saleLineId: mapId(pl.saleLineId, lineMap) };
    } else if (op.operationType === "REFUND") {
      payload = { ...pl, saleLineId: mapId(pl.saleLineId, lineMap), salePaymentId: mapId(pl.salePaymentId, payMap) };
    } else if (op.operationType === "PRODUCT_CREATE") {
      payload = { ...pl, categoryId: mapId(pl.categoryId, categoryMap) };
    } else if (op.operationType === "SALE" && Array.isArray(pl.lines)) {
      payload = { ...pl, lines: pl.lines.map((l: any) => ({ ...l, productId: mapId(l.productId, productMap) })) };
    }
    if (unresolved) {
      held.add(op.idempotencyKey);
      continue;
    }
    if (op.operationType === "PAYMENT") {
      const serverSaleId = idMap[op.payload.saleKey];
      if (!serverSaleId) continue;
      payload = {
        saleId: serverSaleId,
        method: op.payload.method,
        amount: Number(op.payload.amount),
        idempotencyKey: op.idempotencyKey,
      };
    }
    prepared.push({ op, payload });
  }
  if (prepared.length === 0) return 0;

  for (const p of prepared) await updateOperation(p.op.idempotencyKey, { status: "SYNCING" });

  let results;
  try {
    results = await pushOperations(clientId, prepared.map((p) => ({ ...p.op, payload: p.payload })));
  } catch (err) {
    for (const p of prepared) await updateOperation(p.op.idempotencyKey, { status: "PENDING" });
    throw err;
  }

  let processed = 0;
  for (const r of results) {
    const item = prepared.find((p) => p.op.idempotencyKey === r.idempotencyKey);
    if (!item) continue;
    if (r.status === "PROCESSED") {
      processed++;
      await updateOperation(r.idempotencyKey, { status: "PROCESSED", result: r.result });
      if (item.op.operationType === "SALE" && r.result?.saleId) {
        idMap[item.op.idempotencyKey] = r.result.saleId;
        await setMeta("idMap", idMap);
        await recordLocalMappings(item.op.idempotencyKey, r.result);
        await removeLocalSale(item.op.idempotencyKey);
      }
      if (item.op.operationType === "CATEGORY_CREATE" && r.result?.categoryId) {
        const cm: IdMap = (await getMeta("categoryMap")) ?? {};
        cm["LOCAL-" + item.op.idempotencyKey] = r.result.categoryId;
        await setMeta("categoryMap", cm);
        await deleteRecord("categories", "LOCAL-" + item.op.idempotencyKey);
      }
      if (item.op.operationType === "PRODUCT_CREATE" && r.result?.productId) {
        const pmap: IdMap = (await getMeta("productMap")) ?? {};
        pmap["LOCAL-" + item.op.idempotencyKey] = r.result.productId;
        await setMeta("productMap", pmap);
        await deleteRecord("products", "LOCAL-" + item.op.idempotencyKey);
      }
      if (item.op.operationType === "STOCK_BOX_CREATE") {
        await removeLocalBox("LOCAL-" + item.op.idempotencyKey);
      }
      if (item.op.operationType === "PAYMENT" && r.result?.paymentId) {
        const payLocal: IdMap = (await getMeta("payLocal")) ?? {};
        const localPayId = payLocal[item.op.payload?.saleKey];
        if (localPayId) {
          const pm: IdMap = (await getMeta("payMap")) ?? {};
          pm[localPayId] = r.result.paymentId;
          await setMeta("payMap", pm);
        }
      }
    } else if (r.status === "REJECTED" || r.status === "CONFLICT") {
      await updateOperation(r.idempotencyKey, {
        status: r.status,
        result: r.result,
        rejectionCode: r.rejectionCode,
        rejectionReason: r.rejectionReason,
      });
    } else {
      await updateOperation(r.idempotencyKey, { status: "PENDING" });
    }
  }
  for (const p of prepared) {
    if (!results.some((r) => r.idempotencyKey === p.op.idempotencyKey)) {
      await updateOperation(p.op.idempotencyKey, { status: "PENDING" });
    }
  }
  return processed;
}

let dataDirty = false;

async function pullLoop(): Promise<void> {
  if (!isApiOnline()) return;
  const clientId = await getClientId();
  let cursor = await getMeta("syncCursor");
  let hasMore = true;

  while (hasMore) {
    const data = await pullChanges(clientId, cursor);
    if ((data.changes ?? []).length > 0) dataDirty = true;
    await applyChanges(data.changes ?? []);
    if (data.nextCursor) {
      await setMeta("syncCursor", data.nextCursor);
      cursor = data.nextCursor;
    }
    hasMore = !!data.hasMore;
  }
  await setMeta("lastSyncAt", new Date().toISOString());
}

function scheduleRetry(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void cycle();
  }, 5000);
}

async function cycle(): Promise<void> {
  if (!getAccessToken()) {
      if (!getRefreshToken()) return;
      try {
        await refresh();
      } catch (e: any) {
        if (e?.response) setRefreshToken(null);
        return;
      }
    }
  if (running) {
    queued = true;
    return;
  }
  running = true;
  let needRefresh = false;
  try {
    do {
      queued = false;
      let processed = 0;
      try {
        processed = await flushOutbox();
      } catch {
        scheduleRetry();
      }
      if (processed > 0) {
        queued = true;
        dataDirty = true;
        needRefresh = true;
      }
      await pullLoop().catch(() => undefined);
    } while (queued);
    if (needRefresh) await refreshAfterSync().catch(() => undefined);
    await refreshCatalog().catch(() => undefined);
    await refreshSettings().catch(() => undefined);
    if (dataDirty) {
      dataDirty = false;
      notifyDataChanged();
    }
  } finally {
    running = false;
  }
}

export function startSyncEngine(): void {
  if (engineStarted) return;
  engineStarted = true;

  registerSyncHandler(() => {
    void cycle();
  });
  void cycle();
  setInterval(() => void cycle(), 1000);
  startConnectivityProbe();
  subscribeApiOnline((on) => { if (on) void cycle(); });
  window.addEventListener("online", () => void cycle());
}

