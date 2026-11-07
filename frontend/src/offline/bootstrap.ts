import { apiClient } from "../services/api";
import { openDb, putRecords, deleteRecord, setMeta } from "./db";
import { getPendingOperations } from "./queue";

async function getStore(store: string): Promise<any[]> {
  const db = await openDb();
  return new Promise<any[]>((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as any[]);
    req.onerror = () => reject(req.error);
  });
}

async function fetchPaged(path: string): Promise<any[]> {
  const out: any[] = [];
  let page = 1;
  for (;;) {
    const resp = await apiClient.get(path, { params: { page, limit: 100 } });
    const body = resp.data.data;
    const items: any[] = Array.isArray(body) ? body : body.data;
    out.push(...items);
    const totalPages = Array.isArray(body) ? 1 : body.meta?.totalPages ?? 1;
    if (page >= totalPages || items.length === 0) break;
    page++;
  }
  return out;
}

async function replaceStore(store: string, records: any[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await putRecords(store, records);
}

async function reapplyPendingSales(): Promise<void> {
  const pendentes = (await getPendingOperations()).filter((op: any) => op.operationType === "SALE");
  if (pendentes.length === 0) return;
  const lots = await getStore("stock_lots");
  const agora = Date.now();
  const alterados = new Map<string, any>();
  for (const op of pendentes) {
    for (const line of (op.payload?.lines ?? []) as { productId: string; quantity: number }[]) {
      let falta = Number(line.quantity) || 0;
      const candidatos = lots
        .filter((l) => l.productId === line.productId && l.status === "ACTIVE" && Number(l.quantityAvailable) > 0 && (!l.expiryDate || new Date(l.expiryDate).getTime() > agora))
        .sort((a, b) => (a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity) - (b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity));
      for (const lote of candidatos) {
        if (falta <= 0) break;
        const consome = Math.min(falta, Number(lote.quantityAvailable));
        lote.quantityAvailable = Number(lote.quantityAvailable) - consome;
        falta -= consome;
        alterados.set(lote.id, lote);
      }
    }
  }
  await putRecords("stock_lots", [...alterados.values()]);
}

async function reapplyPendingExpenses(): Promise<void> {
  const pendentes = (await getPendingOperations()).filter((op: any) => op.operationType === "EXPENSE");
  const recs = pendentes.map((op: any) => ({
    ...op.payload,
    id: "LOCAL-" + op.idempotencyKey,
    createKey: op.idempotencyKey,
    amount: String(op.payload.amount),
    status: "DRAFT",
    cashSessionId: null,
    expenseDate: op.payload.expenseDate ?? op.createdAt,
    createdAt: op.createdAt,
  }));
  if (recs.length > 0) await putRecords("expenses", recs);
}

async function refreshCashMovements(): Promise<void> {
  const rows = ((await apiClient.get("/cash/movements", { params: { all: true } })).data.data as any[]) ?? [];
  await replaceStore("cash_movements", rows.filter((m) => !String(m.id).startsWith("LOCAL-")));
}

const SUPPLIER_OPS = ["SUPPLIER_CREATE", "SUPPLIER_UPDATE", "PURCHASE_CREATE", "PURCHASE_UPDATE", "PURCHASE_LINES_REPLACE", "PURCHASE_CONFIRM", "PURCHASE_CANCEL", "SUPPLIER_PAYMENT_CREATE", "PURCHASE_LINE_DAMAGED", "PURCHASE_LINE_CLOSE", "STOCK_BOX_CREATE"];

async function hasOpenSupplierOps(): Promise<boolean> {
  return (await getPendingOperations()).some((o: any) => SUPPLIER_OPS.includes(o.operationType));
}

export async function refreshSupplierData(): Promise<void> {
  if (await hasOpenSupplierOps()) return;
  const suppliers = await fetchPaged("/suppliers");
  const purchases = await fetchPaged("/purchases");
  const known = new Map<string, any>((await getStore("purchases")).map((x: any) => [x.id, x] as [string, any]));
  const completas: any[] = [];
  for (const pu of purchases) {
    const k = known.get(pu.id);
    const aberta = !!k && (k.lines ?? []).some((l: any) => !l.closed && Number(l.received ?? 0) + Number(l.quantityDamaged ?? 0) < Number(l.quantity));
    if (k && k.updatedAt === pu.updatedAt && k.lines && !aberta) {
      completas.push(k);
      continue;
    }
    let det: any = pu;
    try {
      det = (await apiClient.get(`/purchases/${pu.id}`)).data.data;
    } catch {
      det = pu;
    }
    completas.push(det);
  }
  if (await hasOpenSupplierOps()) return;
  await replaceStore("suppliers", suppliers);
  await replaceStore("purchases", completas);
}

export async function refreshAfterSync(): Promise<void> {
  await refreshSupplierData().catch(() => undefined);
  const expenses = await fetchPaged("/expenses");
  await replaceStore("expenses", expenses);
  await reapplyPendingExpenses();
  await refreshCashMovements();
}

async function removeLocalOpenSessions(keepId: string): Promise<void> {
  const sessions = await getStore("cash_sessions");
  const db = await openDb();
  const tx = db.transaction("cash_sessions", "readwrite");
  for (const s of sessions) {
    if (String(s.id).startsWith("LOCAL-") && s.status === "OPEN" && s.id !== keepId) tx.objectStore("cash_sessions").delete(s.id);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function bootstrapFromServer(): Promise<void> {
  const products = await fetchPaged("/products");
  const lots = (await apiClient.get("/stock/lots")).data.data as any[];
  const sales = await fetchPaged("/sales");
  const expenses = await fetchPaged("/expenses");
  const returns = await fetchPaged("/returns");
  const categories = await fetchPaged("/categories").catch(() => null);
  const active = (await apiClient.get("/cash/active")).data.data;

  const conhecidas = new Set((await getStore("sales")).map((s) => s.id));
  const pagosLocais = new Set((await getStore("payments")).map((p) => p.saleId));
  const linhas: any[] = [];
  const pagamentos: any[] = [];
  for (const s of sales) {
    if (conhecidas.has(s.id) && pagosLocais.has(s.id)) continue;
    const pays = (await apiClient.get(`/sales/${s.id}/payments`)).data.data as any[];
    pagamentos.push(...pays);
    if (conhecidas.has(s.id)) continue;
    const det = (await apiClient.get(`/sales/${s.id}`)).data.data;
    linhas.push(...(det.lines ?? []));
  }

  if (categories) await replaceStore("categories", categories);
  const users = await fetchPaged("/users").catch(() => null);
  if (users) await replaceStore("users", users);
  const suppliers = await fetchPaged("/suppliers").catch(() => null);
  if (suppliers && !(await hasOpenSupplierOps())) await replaceStore("suppliers", suppliers);
  const pharmacy = await apiClient.get("/pharmacy").then((r) => r.data.data).catch(() => null);
  if (pharmacy) await replaceStore("pharmacy", [pharmacy]);
  const accs = await apiClient.get("/pharmacy-accounts").then((x) => x.data.data).catch(() => null);
  if (accs) await setMeta("pharmacyAccounts", accs);
  const purchases = await fetchPaged("/purchases").catch(() => null);
  if (purchases && !(await hasOpenSupplierOps())) {
    const known = new Map<string, any>((await getStore("purchases")).map((x: any) => [x.id, x] as [string, any]));
    const completas: any[] = [];
    for (const pu of purchases) {
      const k = known.get(pu.id);
      if (k && k.updatedAt === pu.updatedAt && k.lines) {
        completas.push(k);
        continue;
      }
      let det: any = pu;
      try {
        det = (await apiClient.get(`/purchases/${pu.id}`)).data.data;
      } catch {
        /* mantem a versao da lista */
      }
      completas.push(det);
    }
    await replaceStore("purchases", completas);
  }
  await putRecords("products", products);
  await putRecords("stock_lots", lots);
  const idsProdutos = new Set<string>(products.map((p: any) => p.id));
  for (const p of await getStore("products")) {
    if (!String(p.id).startsWith("LOCAL-") && !idsProdutos.has(p.id)) await deleteRecord("products", p.id);
  }
  const idsLotes = new Set<string>(lots.map((l: any) => l.id));
  for (const l of await getStore("stock_lots")) {
    if (!String(l.id).startsWith("LOCAL-") && !idsLotes.has(l.id)) await deleteRecord("stock_lots", l.id);
  }
  await putRecords("sales", sales);
  await putRecords("sale_lines", linhas);
  await putRecords("payments", pagamentos);
  await replaceStore("expenses", expenses);
  const idsServidor = new Set(returns.map((r: any) => r.id));
  for (const r of await getStore("returns")) {
    if (!String(r.id).startsWith("LOCAL-") && !idsServidor.has(r.id)) await deleteRecord("returns", r.id);
  }
  await putRecords("returns", returns);
  if (active) {
    await putRecords("cash_sessions", [active]);
    await removeLocalOpenSessions(active.id);
  }
  await reapplyPendingSales();
  await reapplyPendingExpenses();
  await refreshCashMovements().catch(() => undefined);
}