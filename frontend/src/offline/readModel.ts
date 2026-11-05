import { openDb, getMeta } from "./db";

function getAll(store: string): Promise<any[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(store, "readonly").objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
      })
  );
}

const OPEN_STATUSES = ["PENDING", "SYNCING"];
const EXPENSE_CHANGE_OPS = ["EXPENSE_CONFIRM", "EXPENSE_CANCEL", "EXPENSE_UPDATE"];
const RETURN_CHANGE_OPS = ["RETURN_CONFIRM", "RETURN_INSPECT"];

async function outboxIndex(): Promise<{ outbox: any[]; createdIds: Record<string, string> }> {
  const outbox = await getAll("outbox");
  const createdIds: Record<string, string> = {};
  for (const o of outbox) {
    const id = o.result?.expenseId ?? o.result?.returnId;
    if ((o.operationType === "EXPENSE" || o.operationType === "RETURN") && o.status === "PROCESSED" && id) {
      createdIds[o.idempotencyKey] = id;
    }
  }
  return { outbox, createdIds };
}

function targetId(p: any, createdIds: Record<string, string>): string | undefined {
  return p.expenseId ?? p.returnId ?? (p.createKey ? createdIds[p.createKey] : undefined);
}

function matches(rec: any, p: any, target: string | undefined): boolean {
  return (target !== undefined && rec.id === target) || (!!p.createKey && rec.createKey === p.createKey);
}

function applyExpenseOps(e: any, pending: any[], createdIds: Record<string, string>): any {
  let out = e;
  for (const op of pending) {
    const p = op.payload ?? {};
    if (!matches(out, p, targetId(p, createdIds))) continue;
    if (op.operationType === "EXPENSE_CONFIRM") out = { ...out, status: "CONFIRMED" };
    else if (op.operationType === "EXPENSE_CANCEL") out = { ...out, status: "CANCELLED" };
    else if (op.operationType === "EXPENSE_UPDATE" && p.data) out = { ...out, ...p.data, amount: String(p.data.amount) };
  }
  return out;
}

function applyReturnOps(r: any, pending: any[], createdIds: Record<string, string>): any {
  let out = r;
  for (const op of pending) {
    const p = op.payload ?? {};
    if (!matches(out, p, targetId(p, createdIds))) continue;
    if (op.operationType === "RETURN_CONFIRM") out = { ...out, status: "CONFIRMED" };
    else if (op.operationType === "RETURN_INSPECT") {
      const released = p.condition === "RESELLABLE" ? Number(p.quantityToRelease) : 0;
      out = {
        ...out,
        lines: (out.lines ?? []).map((l: any) =>
          l.saleLineId === p.saleLineId ? { ...l, condition: p.condition, quantityReleased: (l.quantityReleased ?? 0) + released } : l
        ),
      };
    }
  }
  return out;
}

function sortByCreatedDesc(list: any[]): any[] {
  return list.sort((a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1));
}

export async function localExpenses() {
  const { outbox, createdIds } = await outboxIndex();
  const pending = outbox
    .filter((o) => EXPENSE_CHANGE_OPS.includes(o.operationType) && OPEN_STATUSES.includes(o.status))
    .sort((a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? -1 : 1));
  const raw = await getAll("expenses");
  const realKeys = new Set(raw.filter((e) => !String(e.id).startsWith("LOCAL-")).map((e) => e.createKey).filter(Boolean));
  const unique = raw.filter((e) => !(String(e.id).startsWith("LOCAL-") && e.createKey && realKeys.has(e.createKey)));
  const list = unique.map((e) => applyExpenseOps(e, pending, createdIds));
  return list.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
}

export async function localReturns() {
  const { outbox, createdIds } = await outboxIndex();
  const pending = outbox
    .filter((o) => RETURN_CHANGE_OPS.includes(o.operationType) && OPEN_STATUSES.includes(o.status))
    .sort((a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? -1 : 1));
  const list = (await getAll("returns")).map((r) => applyReturnOps(r, pending, createdIds));
  return sortByCreatedDesc(list);
}

export async function localCashMovements() {
  const rows = await getAll("cash_movements");
  const { outbox, createdIds } = await outboxIndex();
  const exps = await localExpenses();
  const rets = await localReturns();
  const derived: any[] = [];
  for (const o of outbox) {
    if (!OPEN_STATUSES.includes(o.status)) continue;
    const p = o.payload ?? {};
    if (o.operationType === "EXPENSE_CONFIRM") {
      const e = exps.find((x) => matches(x, p, targetId(p, createdIds)));
      if (e && (e.paidFrom ?? "PHARMACY_CASH") === "PHARMACY_CASH") derived.push({ id: "LOCAL-MOV-" + o.idempotencyKey, type: "OUT", amount: String(e.amount), reason: "Despesa: " + e.description, createdAt: o.createdAt });
    } else if (o.operationType === "EXPENSE" && p.confirm === true && (p.paidFrom ?? "PHARMACY_CASH") === "PHARMACY_CASH") { derived.push({ id: "LOCAL-MOV-" + o.idempotencyKey, type: "OUT", amount: String(p.amount), reason: "Despesa: " + (p.description ?? ""), createdAt: o.createdAt }); } else if (o.operationType === "REFUND") {
      const r = rets.find((x) => matches(x, p, targetId(p, createdIds)));
      derived.push({ id: "LOCAL-MOV-" + o.idempotencyKey, type: "OUT", method: p.method ?? "CASH", amount: String(p.amount), reason: "Reembolso devolução " + (r?.returnNumber ?? ""), createdAt: o.createdAt });
    }
  }
  return [...derived, ...rows].sort((a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1));
}

export async function localSales(params: { page?: number; limit?: number; status?: string } = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  let sales = await getAll("sales");
  if (params.status) sales = sales.filter((s) => s.status === params.status);
  sales.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const lines = await getAll("sale_lines");
  const byId = new Map<string, any[]>();
  for (const l of lines) {
    if (!byId.has(l.saleId)) byId.set(l.saleId, []);
    byId.get(l.saleId)!.push(l);
  }
  const total = sales.length;
  const prods = new Map<string, any>((await getAll("products")).map((p: any) => [p.id, p] as [string, any]));
  const named = (ls: any[]) => ls.map((l) => { const p = prods.get(l.productId); return l.product || !p ? l : { ...l, product: { name: p.name, salePrice: String(p.salePrice ?? "0"), sku: p.sku ?? null } }; });
  const slice = sales.slice((page - 1) * limit, page * limit).map((s) => ({ ...s, lines: named(byId.get(s.id) ?? []) }));
  return { data: slice, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function localActiveCashSession() {
  const sessions = await getAll("cash_sessions");
  return sessions.find((s) => s.status === "OPEN") ?? null;
}

export async function localStockLots() {
  return getAll("stock_lots");
}

export async function localStockMovements() {
  const m = await getAll("stock_movements");
  return m.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function localResponse(path: string, params: Record<string, any> = {}): Promise<any | null> {
  const p = path.split("?")[0];
  const envelope = (data: any) => ({ success: true, data, timestamp: new Date().toISOString() });
  if (p === "/sales") {
    return envelope(await localSales({ page: Number(params.page ?? 1), limit: Number(params.limit ?? 20), status: params.status }));
  }
  if (p === "/cash/active") return envelope(await localActiveCashSession());
  if (p === "/cash/payments") return envelope(await localCashPayments());
  if (p === "/cash/movements") {
    const todos = params.all === true || params.all === "true";
    const movs = await localCashMovements();
    if (todos) return envelope(movs);
    const activeId = (await localActiveCashSession())?.id;
    return envelope(movs.filter((m: any) => (m.cashSessionId ? m.cashSessionId === activeId : true)));
  }
  if (p === "/stock/lots") return envelope(await localStockLots());
  if (p === "/stock/movements") return envelope(await localStockMovements());
  if (p === "/stock/boxes") return envelope(await localStockBoxes(params));
  if (p.startsWith("/stock/boxes/")) {
    const box = await localStockBox(p.slice(13));
    return box ? envelope(box) : null;
  }
  if (p.startsWith("/sales/") && p.endsWith("/payments")) return envelope(await localSalePayments(p.slice(7, -9)));
  if (p.startsWith("/sales/")) {
    const sale = await localSaleById(p.slice(7));
    return sale ? envelope(sale) : null;
  }
  if (p.startsWith("/expenses/")) {
    const e = (await localExpenses()).find((x) => x.id === p.slice(10));
    return e ? envelope(e) : null;
  }
  if (p.startsWith("/returns/")) {
    const r = (await localReturns()).find((x) => x.id === p.slice(9));
    return r ? envelope(r) : null;
  }
  if (p === "/expenses") {
    const list = await localExpenses();
    return envelope({ data: list, meta: { total: list.length, page: 1, limit: list.length, totalPages: 1 } });
  }
  if (p === "/returns") {
    const list = await localReturns();
    return envelope({ data: list, meta: { total: list.length, page: 1, limit: list.length, totalPages: 1 } });
  }
  if (p === "/products") return envelope(await localProducts(params));
  if (p.startsWith("/products/")) {
    const prod = (await getAll("products")).find((x) => x.id === p.slice(10));
    return prod ? envelope(prod) : null;
  }
  if (p === "/categories") return envelope(await localCategories(params));
  if (p === "/users") return envelope(await localUsers(params));
  if (p.startsWith("/users/")) {
    const u = (await getAll("users")).find((x) => x.id === p.slice(7));
    return u ? envelope(u) : null;
  }
  if (p === "/suppliers") return envelope(await localSuppliers(params));
  if (p.startsWith("/suppliers/")) {
    const s = (await getAll("suppliers")).find((x) => x.id === p.slice(11));
    return s ? envelope(s) : null;
  }
  if (p === "/purchases") return envelope(await localPurchases(params));
  if (p.startsWith("/purchases/")) {
    const pu = await localPurchase(p.slice(11));
    return pu ? envelope(pu) : null;
  }
  if (p === "/settings") {
    const st = await getMeta("settings");
    return st ? envelope(st) : null;
  }
  if (p === "/pharmacy") {
    const ph = (await getAll("pharmacy"))[0];
    return ph ? envelope(ph) : null;
  }
  if (p === "/reports/summary") return envelope(await localReportSummary(params));
  if (p === "/reports/sales") return envelope(await localReportSales(params));
  if (p === "/reports/expenses") return envelope(await localReportExpenses(params));
  if (p === "/reports/cash") return envelope(await localReportCash(params));
  if (p === "/reports/stock") return envelope(await localReportStock());
  if (p.startsWith("/categories/")) {
    const cat = (await getAll("categories")).find((x) => x.id === p.slice(12));
    return cat ? envelope(cat) : null;
  }
  return null;
}

export async function localCashPayments() {
  const session = await localActiveCashSession();
  const all = await getAll("payments");
  const payments = session ? all.filter((p) => p.cashSessionId === session.id) : [];
  const totalsByMethod: Record<string, number> = { CASH: 0, CARD: 0, MPESA: 0, EMOLA: 0 };
  for (const p of payments) totalsByMethod[p.method] = (totalsByMethod[p.method] ?? 0) + parseFloat(p.amount);
  return { session, payments, totalsByMethod };
}

export async function localSaleById(id: string) {
  const sales = await getAll("sales");
  const sale = sales.find((s) => s.id === id);
  if (!sale) return null;
  const lines = (await getAll("sale_lines")).filter((l) => l.saleId === id);
  return { ...sale, lines };
}

export async function localSalePayments(id: string) {
  return (await getAll("payments")).filter((p) => p.saleId === id);
}

function norm(v: unknown): string {
  return String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function paginateLocal(list: any[], params: Record<string, any>, defLimit: number) {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.max(1, Number(params.limit ?? defLimit));
  const total = list.length;
  return {
    data: list.slice((page - 1) * limit, page * limit),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function localProducts(params: Record<string, any> = {}) {
  let list = await getAll("products");
  if (params.status) list = list.filter((p) => p.status === params.status);
  const termo = norm(params.search).trim();
  if (termo) {
    list = list.filter((p) =>
      [p.name, p.sku, p.barcode, p.genericName, p.activeIngredient].some((v) => norm(v).includes(termo))
    );
  }
  list.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt"));
  return paginateLocal(list, params, 20);
}

export async function localCategories(params: Record<string, any> = {}) {
  let list = await getAll("categories");
  const termo = norm(params.search).trim();
  if (termo) list = list.filter((c) => norm(c.name).includes(termo));
  list.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt"));
  return paginateLocal(list, params, 100);
}

function boxStateOf(lot: any, now: Date): string {
  const qty = Number(lot.quantityAvailable ?? 0);
  const expired = lot.expiryDate && new Date(lot.expiryDate) < now;
  if (qty === 0) return "DEPLETED";
  if (expired) return "EXPIRED";
  return qty === Number(lot.totalUnits) ? "NEW" : "ACTIVE";
}

function derivePacksLocal(totalUnits: number, unitsPerInner: number, quantityAvailable: number) {
  const ok = [totalUnits, unitsPerInner, quantityAvailable].every((n) => Number.isInteger(n));
  if (!ok || unitsPerInner <= 0 || quantityAvailable < 0 || quantityAvailable > totalUnits) return null;
  const consumed = totalUnits - quantityAvailable;
  const totalPacks = Math.ceil(totalUnits / unitsPerInner);
  const packs: any[] = [];
  let currentPackNumber: number | null = null;
  for (let n = 1; n <= totalPacks; n++) {
    const capacity = Math.min(unitsPerInner, totalUnits - (n - 1) * unitsPerInner);
    const available = Math.max(0, capacity - Math.max(0, consumed - (n - 1) * unitsPerInner));
    const used = capacity - available;
    let state: string;
    if (available === 0) state = "EMPTY";
    else if (available === capacity) state = "FULL";
    else {
      state = "IN_USE";
      currentPackNumber = n;
    }
    if (state !== "EMPTY") packs.push({ number: n, state, usedInPack: used, availableInPack: available });
  }
  return { packs, currentPackNumber };
}

export async function localStockBoxes(params: Record<string, any> = {}) {
  const now = new Date();
  const prods = new Map<string, any>((await getAll("products")).map((p: any) => [p.id, p] as [string, any]));
  let lots = await getAll("stock_lots");
  const typeFilter = params.type as string | undefined;
  const stateFilter = params.state as string | undefined;
  const rows = lots
    .map((lot) => ({ lot, prod: prods.get(lot.productId) }))
    .filter(({ lot, prod }) => {
      if (typeFilter && prod?.type !== typeFilter) return false;
      const qty = Number(lot.quantityAvailable ?? 0);
      const expired = lot.expiryDate && new Date(lot.expiryDate) < now;
      if (stateFilter === "DEPLETED") return qty === 0;
      if (stateFilter === "EXPIRED") return !!expired && qty > 0;
      if (stateFilter === "ACTIVE") return qty > 0 && !expired;
      return true;
    });
  rows.sort((a, b) => {
    const ea = a.lot.expiryDate ? new Date(a.lot.expiryDate).getTime() : Number.POSITIVE_INFINITY;
    const eb = b.lot.expiryDate ? new Date(b.lot.expiryDate).getTime() : Number.POSITIVE_INFINITY;
    if (ea !== eb) return ea < eb ? -1 : 1;
    return String(a.lot.createdAt ?? "") < String(b.lot.createdAt ?? "") ? -1 : 1;
  });
  const list = rows.map(({ lot, prod }) => {
    const type = prod?.type ?? "PRODUCT";
    return {
      id: lot.id,
      qrCode: lot.qrCode,
      productName: prod?.name ?? lot.product?.name ?? "",
      type,
      strength: prod?.strength ?? null,
      salePrice: prod?.salePrice ?? "0",
      saleUnitLabel: type === "MEDICINE" ? "carteira" : "unidade",
      hasExpiry: prod?.hasExpiry ?? !!lot.expiryDate,
      expiryDate: lot.expiryDate ?? null,
      innerCount: lot.innerCount ?? null,
      unitsPerInner: lot.unitsPerInner ?? null,
      totalUnits: lot.totalUnits,
      quantityAvailable: lot.quantityAvailable,
      state: boxStateOf(lot, now),
    };
  });
  return paginateLocal(list, params, 20);
}

export async function localStockBox(id: string) {
  const lot = (await getAll("stock_lots")).find((l) => l.id === id);
  if (!lot) return null;
  const prod = (await getAll("products")).find((p: any) => p.id === lot.productId);
  const type = prod?.type ?? "PRODUCT";
  const packs =
    type === "MEDICINE" && lot.unitsPerInner
      ? derivePacksLocal(Number(lot.totalUnits), Number(lot.unitsPerInner), Number(lot.quantityAvailable))
      : null;
  const moves = (await getAll("stock_movements"))
    .filter((m) => m.lotId === lot.id && m.type === "SALE")
    .sort((a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? -1 : 1));
  const salesById = new Map<string, any>((await getAll("sales")).map((s: any) => [s.id, s] as [string, any]));
  let running = Number(lot.totalUnits ?? 0);
  const salesHistory = moves.map((m) => {
    const units = Math.abs(Number(m.quantity));
    running -= units;
    const s = m.referenceId ? salesById.get(m.referenceId) : undefined;
    return {
      saleId: m.referenceId ?? null,
      saleNumber: s?.saleNumber ?? null,
      soldAt: s?.createdAt ?? m.createdAt,
      units,
      balanceAfter: running,
    };
  });
  return {
    id: lot.id,
    qrCode: lot.qrCode,
    lotNumber: lot.lotNumber,
    productName: prod?.name ?? lot.product?.name ?? "",
    type,
    saleUnitLabel: type === "MEDICINE" ? "carteira" : "unidade",
    hasExpiry: prod?.hasExpiry ?? !!lot.expiryDate,
    expiryDate: lot.expiryDate ?? null,
    innerCount: lot.innerCount ?? null,
    unitsPerInner: lot.unitsPerInner ?? null,
    totalUnits: lot.totalUnits,
    quantityAvailable: lot.quantityAvailable,
    state: boxStateOf(lot, new Date()),
    packs: packs ? packs.packs : null,
    currentPackNumber: packs ? packs.currentPackNumber : null,
    salesHistory,
  };
}

export async function localUsers(params: Record<string, any> = {}) {
  const list = await getAll("users");
  list.sort((a, b) => String(a.fullName ?? "").localeCompare(String(b.fullName ?? ""), "pt"));
  return paginateLocal(list, params, 20);
}

export async function localSuppliers(params: Record<string, any> = {}) {
  let list = await getAll("suppliers");
  const termo = norm(params.search).trim();
  if (termo) {
    list = list.filter((s) => [s.name, s.taxId, s.phone, s.email, s.city].some((v) => norm(v).includes(termo)));
  }
  list.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt"));
  return paginateLocal(list, params, 20);
}

async function enrichPurchase(pu: any, suppliers: Map<string, any>, prods: Map<string, any>) {
  const sup = pu.supplier ?? suppliers.get(pu.supplierId);
  const out: any = { ...pu };
  if (sup) out.supplier = { id: sup.id, name: sup.name, taxId: sup.taxId ?? null, phone: sup.phone ?? null, email: sup.email ?? null };
  if (pu.lines) {
    out.lines = pu.lines.map((l: any) => {
      if (l.product) return l;
      const p = prods.get(l.productId);
      return p ? { ...l, product: { id: p.id, name: p.name, salePrice: String(p.salePrice ?? "0"), sku: p.sku ?? null } } : l;
    });
  }
  return out;
}

export async function localPurchases(params: Record<string, any> = {}) {
  let list = await getAll("purchases");
  if (params.status) list = list.filter((x) => x.status === params.status);
  list.sort((a, b) => (String(a.purchaseDate ?? "") < String(b.purchaseDate ?? "") ? 1 : -1));
  const suppliers = new Map<string, any>((await getAll("suppliers")).map((s: any) => [s.id, s] as [string, any]));
  const prods = new Map<string, any>((await getAll("products")).map((p: any) => [p.id, p] as [string, any]));
  const page = paginateLocal(list, params, 20);
  page.data = await Promise.all(page.data.map((x) => enrichPurchase(x, suppliers, prods)));
  return page;
}

export async function localPurchase(id: string) {
  const pu = (await getAll("purchases")).find((x) => x.id === id);
  if (!pu) return null;
  const suppliers = new Map<string, any>((await getAll("suppliers")).map((s: any) => [s.id, s] as [string, any]));
  const prods = new Map<string, any>((await getAll("products")).map((p: any) => [p.id, p] as [string, any]));
  return enrichPurchase(pu, suppliers, prods);
}

// ===== Relatorios calculados localmente =====

function reportRange(params: Record<string, any>) {
  const now = new Date();
  const from = params.startDate ? new Date(params.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params.endDate ? new Date(params.endDate) : now;
  return { from, to };
}

function inRange(v: any, from: Date, to: Date): boolean {
  if (!v) return false;
  const t = new Date(v).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function sumBy(list: any[], f: (x: any) => any): number {
  return list.reduce((a, x) => a + Number(f(x) || 0), 0);
}

function groupTotals(list: any[], key: (x: any) => string, amount: (x: any) => any) {
  const m = new Map<string, { count: number; total: number }>();
  for (const x of list) {
    const k = key(x);
    const cur = m.get(k) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(amount(x) || 0);
    m.set(k, cur);
  }
  return m;
}

async function allRefundsLocal(): Promise<any[]> {
  const out = new Map<string, any>();
  for (const r of await localReturns()) {
    for (const rf of r.refunds ?? []) out.set(rf.id, rf);
    for (const l of r.lines ?? []) for (const rf of l.refunds ?? []) out.set(rf.id, rf);
  }
  return Array.from(out.values());
}

export async function localReportSummary(params: Record<string, any> = {}) {
  const { from, to } = reportRange(params);
  const now = new Date();
  const sales = (await getAll("sales")).filter((s) => s.status === "CONFIRMED" && inRange(s.createdAt, from, to));
  const expenses = (await localExpenses()).filter((e) => e.status === "CONFIRMED" && inRange(e.expenseDate, from, to));
  const returns = (await localReturns()).filter((r) => r.status === "CONFIRMED" && inRange(r.createdAt, from, to));
  const refunds = (await allRefundsLocal()).filter((r) => r.status === "COMPLETED" && inRange(r.createdAt, from, to));
  const lots = await getAll("stock_lots");
  const prods = (await getAll("products")).filter((p) => p.status === "ACTIVE");
  let lowStockCount = 0;
  for (const p of prods) {
    const total = sumBy(lots.filter((l) => l.productId === p.id), (l) => l.quantityAvailable);
    if (total < 10) lowStockCount++;
  }
  const expiredLotsCount = lots.filter((l) => l.expiryDate && new Date(l.expiryDate) < now && Number(l.quantityAvailable) > 0).length;
  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    sales: { count: sales.length, total: sumBy(sales, (s) => s.total).toFixed(2) },
    expenses: { count: expenses.length, total: sumBy(expenses, (e) => e.amount).toFixed(2) },
    returns: { count: returns.length, total: sumBy(returns, (r) => r.totalRefund).toFixed(2) },
    refunds: { count: refunds.length, total: sumBy(refunds, (r) => r.amount).toFixed(2) },
    stock: { lowStockCount, expiredLotsCount },
  };
}

export async function localReportSales(params: Record<string, any> = {}) {
  const { from, to } = reportRange(params);
  const status = params.status ?? "CONFIRMED";
  const pays = await getAll("payments");
  const bySale = new Map<string, any[]>();
  for (const p of pays) {
    if (!bySale.has(p.saleId)) bySale.set(p.saleId, []);
    bySale.get(p.saleId)!.push(p);
  }
  const sales = (await getAll("sales"))
    .filter((s) => s.status === status && inRange(s.createdAt, from, to))
    .filter((s) => !params.method || (bySale.get(s.id) ?? []).some((p) => p.method === params.method))
    .sort((a, b) => (String(a.createdAt) < String(b.createdAt) ? 1 : -1));
  let totalSold = 0;
  let totalPaid = 0;
  const flatPays: any[] = [];
  const rows = sales.map((s) => {
    const ps = bySale.get(s.id) ?? [];
    const paid = sumBy(ps, (p) => p.amount);
    const total = Number(s.total || 0);
    totalSold += total;
    totalPaid += paid;
    flatPays.push(...ps);
    return {
      id: s.id,
      saleNumber: s.saleNumber ?? "",
      status: s.status,
      total: total.toFixed(2),
      paid: paid.toFixed(2),
      pending: (total - paid).toFixed(2),
      createdAt: new Date(s.createdAt).toISOString(),
      user: s.user?.fullName ?? s.userName ?? "-",
      payments: ps.map((p) => ({ method: p.method, amount: Number(p.amount).toFixed(2) })),
    };
  });
  const byMethod = groupTotals(flatPays, (p) => p.method, (p) => p.amount);
  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: { count: rows.length, totalSold: totalSold.toFixed(2), totalPaid: totalPaid.toFixed(2), totalPending: (totalSold - totalPaid).toFixed(2) },
    byPaymentMethod: Array.from(byMethod.entries()).map(([method, d]) => ({ method, count: d.count, total: d.total.toFixed(2) })),
    sales: rows,
  };
}

export async function localReportExpenses(params: Record<string, any> = {}) {
  const { from, to } = reportRange(params);
  const status = params.status ?? "CONFIRMED";
  const list = (await localExpenses())
    .filter((e) => e.status === status && inRange(e.expenseDate, from, to))
    .filter((e) => !params.category || e.category === params.category)
    .filter((e) => !params.method || e.method === params.method)
    .sort((a, b) => (String(a.expenseDate) < String(b.expenseDate) ? 1 : -1));
  const total = sumBy(list, (e) => e.amount);
  const cashTotal = sumBy(list.filter((e) => (e.paidFrom ?? (e.method === "CASH" ? "PHARMACY_CASH" : "")) === "PHARMACY_CASH"), (e) => e.amount);
  const byCat = groupTotals(list, (e) => e.category, (e) => e.amount);
  const byMet = groupTotals(list, (e) => e.method, (e) => e.amount);
  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: { count: list.length, total: total.toFixed(2), cashTotal: cashTotal.toFixed(2), digitalTotal: (total - cashTotal).toFixed(2) },
    byCategory: Array.from(byCat.entries()).map(([category, d]) => ({ category, count: d.count, total: d.total.toFixed(2) })),
    byMethod: Array.from(byMet.entries()).map(([method, d]) => ({ method, count: d.count, total: d.total.toFixed(2) })),
    expenses: list.map((e) => ({
      id: e.id,
      description: e.description,
      category: e.category,
      paidFrom: e.paidFrom,
      method: e.method,
      amount: Number(e.amount).toFixed(2),
      status: e.status,
      expenseDate: new Date(e.expenseDate).toISOString(),
      user: e.user?.fullName ?? "-",
    })),
  };
}

export async function localReportCash(params: Record<string, any> = {}) {
  const { from, to } = reportRange(params);
  const sessions = (await getAll("cash_sessions"))
    .filter((s) => inRange(s.openedAt, from, to))
    .sort((a, b) => (String(a.openedAt) < String(b.openedAt) ? 1 : -1));
  const payments = await getAll("payments");
  const movs = await localCashMovements();
  const activeId = (await localActiveCashSession())?.id;
  const isExpense = (m: any) => !!m.expenseId || String(m.reason ?? "").startsWith("Despesa");
  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    sessions: sessions.map((s) => {
      const ms = movs.filter((m) => (m.cashSessionId ? m.cashSessionId === s.id : s.id === activeId));
      const cashSalePayments = sumBy(payments.filter((p) => p.cashSessionId === s.id && p.method === "CASH"), (p) => p.amount);
      const cashIn = sumBy(ms.filter((m) => m.type === "IN"), (m) => m.amount);
      const outs = ms.filter((m) => m.type === "OUT" && (m.method ?? "CASH") === "CASH");
      const cashOut = sumBy(outs, (m) => m.amount);
      const expensesCash = sumBy(outs.filter(isExpense), (m) => m.amount);
      const refundsCash = sumBy(outs.filter((m) => !isExpense(m) && String(m.reason ?? "").startsWith("Reembolso")), (m) => m.amount);
      const manualOut = cashOut - expensesCash - refundsCash;
      const expected = Number(s.openingBalance || 0) + cashSalePayments + cashIn - cashOut;
      const counted = s.countedBalance != null ? Number(s.countedBalance) : null;
      const diff = s.difference != null ? Number(s.difference) : counted != null ? counted - expected : null;
      return {
        id: s.id,
        status: s.status,
        openedAt: new Date(s.openedAt).toISOString(),
        closedAt: s.closedAt ? new Date(s.closedAt).toISOString() : null,
        user: s.user?.fullName ?? "-",
        openingBalance: Number(s.openingBalance || 0).toFixed(2),
        cashSalePayments: cashSalePayments.toFixed(2),
        cashIn: cashIn.toFixed(2),
        cashOut: cashOut.toFixed(2),
        breakdown: { expensesCash: expensesCash.toFixed(2), refundsCash: refundsCash.toFixed(2), manualOut: manualOut.toFixed(2) },
        expectedBalance: expected.toFixed(2),
        countedBalance: counted != null ? counted.toFixed(2) : null,
        difference: diff != null ? diff.toFixed(2) : null,
      };
    }),
  };
}

export async function localReportStock() {
  const now = new Date();
  const near = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const lots = await getAll("stock_lots");
  const prods = (await getAll("products"))
    .filter((p) => p.status === "ACTIVE")
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt"));
  let totalProducts = 0;
  let totalLots = 0;
  let expiredLotsCount = 0;
  let nearExpiryLotsCount = 0;
  let totalStockValue = 0;
  const products = prods
    .map((p) => {
      const pl = lots
        .filter((l) => l.productId === p.id && Number(l.quantityAvailable) > 0)
        .sort((a, b) => {
          const ea = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY;
          const eb = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY;
          return ea < eb ? -1 : ea > eb ? 1 : 0;
        });
      const totalAvailable = sumBy(pl, (l) => l.quantityAvailable);
      if (totalAvailable > 0) totalProducts++;
      totalLots += pl.length;
      let value = 0;
      const lotRows = pl.map((l) => {
        let status = "OK";
        if (l.expiryDate) {
          const ex = new Date(l.expiryDate);
          if (ex < now) {
            status = "EXPIRED";
            expiredLotsCount++;
          } else if (ex < near) {
            status = "NEAR_EXPIRY";
            nearExpiryLotsCount++;
          }
        }
        const v = Number(l.unitCost || 0) * Number(l.quantityAvailable);
        value += v;
        totalStockValue += v;
        return {
          id: l.id,
          lotNumber: l.lotNumber,
          quantityAvailable: Number(l.quantityAvailable),
          expiryDate: l.expiryDate ? new Date(l.expiryDate).toISOString() : "",
          unitCost: Number(l.unitCost || 0).toFixed(2),
          status,
        };
      });
      return { productId: p.id, productName: p.name, sku: p.sku ?? null, totalAvailable, totalValue: value.toFixed(2), lots: lotRows };
    })
    .filter((p) => p.totalAvailable > 0);
  return {
    summary: { totalProducts, totalLots, expiredLotsCount, nearExpiryLotsCount, totalStockValue: totalStockValue.toFixed(2) },
    products,
  };
}