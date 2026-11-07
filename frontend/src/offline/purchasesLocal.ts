import { openDb, putRecords, deleteRecord, getMeta } from "./db";
import { enqueueOperation, generateUuid } from "./queue";
import { notifyDataChanged } from "./dataChanged";
import { localActiveCashSession } from "./readModel";
import { refreshSupplierData } from "./bootstrap";
import { round2, dueOf, paidOf, statusFor, withTotals } from "./purchaseMath";
import { METHODS_FOR } from "../utils/supplierFormat";

function fail(msg: string): never {
  throw Object.assign(new Error(msg), { localMessage: true });
}

function getRecord(store: string, id: string): Promise<any> {
  return openDb().then(
    (db) =>
      new Promise<any>((resolve, reject) => {
        const req = db.transaction(store, "readonly").objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      })
  );
}

function allFrom(store: string): Promise<any[]> {
  return openDb().then(
    (db) =>
      new Promise<any[]>((resolve, reject) => {
        const req = db.transaction(store, "readonly").objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
      })
  );
}

async function put(store: string, recs: any[]): Promise<void> {
  await putRecords(store, recs);
  notifyDataChanged();
}

async function buildLines(lines: any[], purchaseId: string): Promise<{ recs: any[]; payload: any[] }> {
  const products = new Map<string, any>((await allFrom("products")).map((p: any) => [p.id, p] as [string, any]));
  const recs: any[] = [];
  const payload: any[] = [];
  for (const l of lines) {
    const q = Number(l.quantity);
    const cost = Number(l.unitCost);
    const disc = Number(l.discount || 0);
    const subtotal = round2(q * cost - disc);
    if (subtotal < 0) fail("Desconto superior ao valor da linha.");
    let prod: any = l.productId ? products.get(l.productId) : null;
    if (!prod && !l.productId) {
      const nm = String(l.productName ?? "").trim().toLowerCase();
      if (nm) {
        prod = Array.from(products.values()).find((p: any) => !String(p.id).startsWith("LOCAL-") && String(p.name ?? "").trim().toLowerCase() === nm && p.type === l.type && (l.type !== "MEDICINE" || String(p.strength ?? "").trim().toLowerCase() === String(l.strength ?? "").trim().toLowerCase())) ?? null;
      }
    }
    if (l.productId && !prod) fail("Um ou mais produtos s\u00e3o inv\u00e1lidos.");
    if (!l.productId && !String(l.productName ?? "").trim()) fail("Indica o nome do produto em cada linha.");
    const type = prod ? prod.type : l.type;
    const perBox = l.unitsPerBox ?? (l.innerCount && l.unitsPerInner ? l.innerCount * l.unitsPerInner : null);
    if (type === "PRODUCT" && !perBox) fail("Indica as unidades por caixa do produto.");
    const id: string = l.lineId ?? generateUuid();
    recs.push({
      id,
      purchaseId,
      productId: prod ? prod.id : (l.productId ?? ""),
      quantity: q,
      unitCost: String(cost),
      discount: String(disc),
      subtotal: String(subtotal),
      innerCount: l.innerCount ?? null,
      unitsPerInner: l.unitsPerInner ?? null,
      unitsPerBox: perBox,
      received: 0,
      quantityDamaged: 0,
      closed: false,
      product: prod
        ? { id: prod.id, name: prod.name, salePrice: String(prod.salePrice ?? "0"), sku: prod.sku ?? null, type: prod.type, strength: prod.strength ?? null }
        : { id: "", name: String(l.productName ?? "").trim(), salePrice: "0", sku: null, type: l.type, strength: l.strength ?? null },
    });
    payload.push(l.lineId ? { ...l } : { ...l, newLineId: id });
  }
  return { recs, payload };
}

async function boxCount(cur: any): Promise<number> {
  const ids = new Set<string>((cur.lines ?? []).map((l: any) => l.id));
  const lots = await allFrom("stock_lots");
  const n = lots.filter((x: any) => x.purchaseId === cur.id || (x.purchaseLineId && ids.has(x.purchaseLineId))).length;
  return Math.max(n, (cur.boxes ?? []).length);
}

async function checkPay(paidFrom: string, method: string): Promise<void> {
  if (!(METHODS_FOR[paidFrom] ?? []).includes(method)) fail("M\u00e9todo de pagamento incompat\u00edvel com a origem do dinheiro.");
  if (paidFrom === "PHARMACY_CASH") {
    const st = await getMeta("settings");
    if (st && st.allowCashExpenses === false) fail("A farm\u00e1cia n\u00e3o permite pagar pela caixa.");
    const session = await localActiveCashSession();
    if (!session) fail("N\u00e3o tem sess\u00e3o de caixa aberta para pagar pela caixa da farm\u00e1cia.");
  }
}

export async function createSupplierLocal(data: any): Promise<any> {
  const name = String(data?.name ?? "").trim();
  if (!name) fail("Nome \u00e9 obrigat\u00f3rio.");
  const all = await allFrom("suppliers");
  const newId = generateUuid();
  const now = new Date().toISOString();
  const rec = {
    id: newId,
    pharmacyId: all[0]?.pharmacyId ?? null,
    name,
    taxId: data.taxId ?? null,
    phone: data.phone ?? null,
    whatsapp: data.whatsapp ?? null,
    email: data.email ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    province: data.province ?? null,
    notes: data.notes ?? null,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    totalPurchased: 0,
    purchaseCount: 0,
    lastPurchaseDate: null,
    debt: 0,
  };
  await put("suppliers", [rec]);
  await enqueueOperation("SUPPLIER_CREATE", { newId, data: { ...data, name } });
  return rec;
}

export async function updateSupplierLocal(id: string, data: any): Promise<any> {
  const cur = await getRecord("suppliers", id);
  if (!cur) fail("Fornecedor n\u00e3o encontrado.");
  const upd = { ...cur, ...data, updatedAt: new Date().toISOString() };
  if (data.name !== undefined) upd.name = String(data.name).trim();
  await put("suppliers", [upd]);
  await enqueueOperation("SUPPLIER_UPDATE", { supplierId: id, data });
  return upd;
}

export async function createPurchaseLocal(body: any): Promise<any> {
  const supplier = await getRecord("suppliers", body.supplierId);
  if (!supplier) fail("Fornecedor inv\u00e1lido.");
  if (supplier.status === "INACTIVE") fail("Fornecedor inactivo n\u00e3o pode ser usado.");
  const all = await allFrom("purchases");
  if (all.some((p: any) => p.supplierId === body.supplierId && String(p.documentNumber) === String(body.documentNumber))) fail("J\u00e1 existe uma fatura com este n\u00famero para este fornecedor.");
  const currency = body.currency ?? "MZN";
  const rate = currency === "MZN" ? 1 : Number(body.exchangeRate ?? 0);
  if (!(rate > 0)) fail("Indica o c\u00e2mbio para a moeda escolhida.");
  const newId = generateUuid();
  const built = await buildLines(body.lines ?? [], newId);
  const total = round2(built.recs.reduce((s: number, x: any) => s + Number(x.subtotal), 0));
  const now = new Date().toISOString();
  const paymentStatus = body.paymentStatus ?? "PAID";
  const rec = withTotals({
    id: newId,
    pharmacyId: supplier.pharmacyId ?? null,
    supplierId: body.supplierId,
    documentNumber: body.documentNumber,
    purchaseDate: now,
    status: "DRAFT",
    notes: null,
    totalAmount: String(total),
    transportCost: String(body.transportCost ?? 0),
    otherCosts: String(body.otherCosts ?? 0),
    invoiceTotal: body.invoiceTotal !== undefined && body.invoiceTotal !== null ? String(body.invoiceTotal) : null,
    currency,
    exchangeRate: String(rate),
    paymentStatus,
    dueDate: paymentStatus === "CREDIT" && body.dueDate ? new Date(body.dueDate).toISOString() : null,
    createdAt: now,
    updatedAt: now,
    lines: built.recs,
    boxes: [],
    supplierPayments: [],
  });
  await put("purchases", [rec]);
  await enqueueOperation("PURCHASE_CREATE", { newId, data: { ...body, lines: built.payload } });
  return rec;
}

export async function updatePurchaseLocal(id: string, data: any): Promise<any> {
  const cur = await getRecord("purchases", id);
  if (!cur) fail("Compra n\u00e3o encontrada.");
  if (cur.status === "CANCELLED") fail("Compra cancelada n\u00e3o pode ser editada.");
  const nx: any = { ...cur, updatedAt: new Date().toISOString() };
  if (data.transportCost !== undefined) nx.transportCost = String(data.transportCost);
  if (data.otherCosts !== undefined) nx.otherCosts = String(data.otherCosts);
  if (data.invoiceTotal !== undefined) nx.invoiceTotal = data.invoiceTotal === null ? null : String(data.invoiceTotal);
  if (data.dueDate !== undefined) nx.dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : null;
  if (nx.status !== "DRAFT" && (nx.paymentStatus !== "PAID" || paidOf(nx) > 0)) nx.paymentStatus = statusFor(dueOf(nx), paidOf(nx));
  const rec = withTotals(nx);
  await put("purchases", [rec]);
  await enqueueOperation("PURCHASE_UPDATE", { purchaseId: id, data });
  return rec;
}

export async function replacePurchaseLinesLocal(id: string, lines: any[]): Promise<any> {
  const cur = await getRecord("purchases", id);
  if (!cur) fail("Compra n\u00e3o encontrada.");
  const lots = await allFrom("stock_lots");
  const existing: any[] = cur.lines ?? [];
  let newLines: any[];
  let payload: any[];
  if (cur.status === "CONFIRMED") {
    if (lines.length === 0) fail("Acrescenta pelo menos uma linha.");
    const locked = new Set<string>(
      existing
        .filter((l: any) => Number(l.received ?? 0) > 0 || Number(l.quantityDamaged ?? 0) > 0 || l.closed || lots.some((x: any) => x.purchaseLineId === l.id))
        .map((l: any) => l.id)
    );
    const kept = new Set<string>(lines.map((l: any) => l.lineId).filter((x: any) => !!x));
    for (const l of lines) {
      if (l.lineId && !existing.some((e: any) => e.id === l.lineId)) fail("Linha inv\u00e1lida.");
    }
    for (const e of existing) {
      if (!kept.has(e.id) && locked.has(e.id)) fail("Uma linha com caixas recebidas, danificadas ou fechada n\u00e3o pode ser removida.");
    }
    const built = await buildLines(lines, id);
    newLines = built.recs.map((rc: any, i: number) => (lines[i].lineId && locked.has(lines[i].lineId) ? existing.find((e: any) => e.id === lines[i].lineId) : rc));
    payload = built.payload;
  } else if (cur.status === "DRAFT") {
    if ((await boxCount(cur)) > 0) fail("Esta fatura j\u00e1 tem caixas registadas.");
    const built = await buildLines(lines, id);
    newLines = built.recs;
    payload = built.payload;
  } else {
    fail("S\u00f3 se alteram as linhas de uma fatura em rascunho.");
  }
  const total = round2(newLines.reduce((s: number, x: any) => s + Number(x.subtotal), 0));
  const nx: any = { ...cur, lines: newLines, totalAmount: String(total), updatedAt: new Date().toISOString() };
  if (cur.status === "CONFIRMED" && (nx.paymentStatus !== "PAID" || paidOf(nx) > 0)) nx.paymentStatus = statusFor(dueOf(nx), paidOf(nx));
  const rec = withTotals(nx);
  await put("purchases", [rec]);
  await enqueueOperation("PURCHASE_LINES_REPLACE", { purchaseId: id, lines: payload });
  return rec;
}

export async function confirmPurchaseLocal(id: string, pay?: { paidFrom: string; method: string }): Promise<any> {
  const cur = await getRecord("purchases", id);
  if (!cur) fail("Compra n\u00e3o encontrada.");
  if (cur.status !== "DRAFT") fail("Apenas rascunhos podem ser confirmados.");
  if (Number(cur.totalAmount) <= 0) fail("Acrescenta pelo menos uma linha antes de confirmar a compra.");
  const due = dueOf(cur);
  const now = new Date().toISOString();
  const nx: any = { ...cur, status: "CONFIRMED", updatedAt: now, supplierPayments: [...(cur.supplierPayments ?? [])] };
  let payAmount = 0;
  if (pay && cur.paymentStatus === "PAID" && due > 0) {
    await checkPay(pay.paidFrom, pay.method);
    nx.supplierPayments.unshift({ id: generateUuid(), amount: String(due), paidFrom: pay.paidFrom, method: pay.method, paidAt: now, notes: null });
    payAmount = due;
  }
  const rec = withTotals(nx);
  await put("purchases", [rec]);
  await enqueueOperation("PURCHASE_CONFIRM", { purchaseId: id, ...(payAmount > 0 && pay ? { pay: { paidFrom: pay.paidFrom, method: pay.method }, payAmount } : {}) });
  return rec;
}

export async function cancelPurchaseLocal(id: string): Promise<any> {
  const cur = await getRecord("purchases", id);
  if (!cur) fail("Compra n\u00e3o encontrada.");
  if (paidOf(cur) > 0) fail("Compra com pagamentos n\u00e3o pode ser cancelada.");
  if ((await boxCount(cur)) > 0) fail("Compra com caixas registadas n\u00e3o pode ser cancelada.");
  if (cur.status === "CANCELLED") fail("Compra j\u00e1 cancelada.");
  const rec = withTotals({ ...cur, status: "CANCELLED", updatedAt: new Date().toISOString() });
  await put("purchases", [rec]);
  await enqueueOperation("PURCHASE_CANCEL", { purchaseId: id });
  return rec;
}

export async function createSupplierPaymentLocal(data: any): Promise<any> {
  const cur = await getRecord("purchases", data.purchaseId);
  if (!cur) fail("Compra n\u00e3o encontrada.");
  if (cur.status !== "CONFIRMED") fail("S\u00f3 compras confirmadas podem ser pagas.");
  if (cur.paymentStatus === "PAID") fail("Compra j\u00e1 paga.");
  const amount = round2(Number(data.amount));
  if (!(amount > 0)) fail("Valor do pagamento deve ser positivo.");
  await checkPay(data.paidFrom, data.method);
  const due = dueOf(cur);
  const paid = paidOf(cur);
  const out = round2(due - paid);
  if (amount > out + 0.005) fail("Valor excede a d\u00edvida desta compra (" + out.toFixed(2) + " MT).");
  const now = new Date().toISOString();
  const pay = { id: generateUuid(), amount: String(amount), paidFrom: data.paidFrom, method: data.method, paidAt: now, notes: data.notes ?? null };
  const nx: any = { ...cur, supplierPayments: [pay, ...(cur.supplierPayments ?? [])], updatedAt: now };
  nx.paymentStatus = statusFor(due, round2(paid + amount));
  await put("purchases", [withTotals(nx)]);
  await enqueueOperation("SUPPLIER_PAYMENT_CREATE", { purchaseId: data.purchaseId, amount, paidFrom: data.paidFrom, method: data.method, ...(data.notes ? { notes: data.notes } : {}) });
  return pay;
}

export async function discardSupplierOpLocal(op: any): Promise<void> {
  const t = op?.operationType;
  const p = op?.payload ?? {};
  if (t === "SUPPLIER_CREATE" && p.newId) await deleteRecord("suppliers", p.newId);
  else if (t === "PURCHASE_CREATE" && p.newId) {
    await deleteRecord("purchases", p.newId);
    for (const l of p.data?.lines ?? []) if (l.newLineId) await deleteRecord("products", "LOCAL-" + l.newLineId);
  }
  notifyDataChanged();
  await refreshSupplierData().catch(() => undefined);
}