import { openDb, putRecords as putRecordsRaw, deleteRecord as deleteRecordRaw } from "./db";
import { notifyDataChanged } from "./dataChanged";

async function putRecords(store: string, records: any[]): Promise<void> {
  await putRecordsRaw(store, records);
  notifyDataChanged();
}

async function deleteRecord(store: string, id: string): Promise<void> {
  await deleteRecordRaw(store, id);
  notifyDataChanged();
}
import { enqueueOperation, generateUuid } from "./queue";
import { localActiveCashSession } from "./readModel";
import { findOperator, getSelectedOperator } from "./operators";

function localId(): string {
  return "LOCAL-" + generateUuid();
}

function getRecord(store: string, id: string): Promise<any> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(store, "readonly").objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      })
  );
}

function expenseRef(rec: any): any {
  return rec.createKey ? { createKey: rec.createKey } : { expenseId: rec.id };
}

function returnRef(rec: any): any {
  return rec.createKey ? { createKey: rec.createKey } : { returnId: rec.id };
}

export async function openCashLocal(openingBalance: number, operatorId?: string): Promise<any> {
  const operator = operatorId ? findOperator(operatorId) : null;
  const op = await enqueueOperation("CASH_OPEN", { openingBalance, ...(operator ? { operatorId: operator.id } : {}) });
  const session = {
    id: localId(),
    status: "OPEN",
    openingBalance: String(openingBalance),
    openedAt: new Date().toISOString(),
    closedAt: null,
    countedBalance: null,
    openKey: op.idempotencyKey,
    openedByOperatorId: operator?.id ?? null,
    openedByOperatorName: operator?.name ?? null,
  };
  await putRecords("cash_sessions", [session]);
  return session;
}

export async function closeCashLocal(session: any, countedBalance: number, operatorId?: string): Promise<any> {
  const operator = operatorId ? findOperator(operatorId) : null;
  const closed = {
    ...session,
    status: "CLOSED",
    closedAt: new Date().toISOString(),
    countedBalance: String(countedBalance),
    closedByOperatorId: operator?.id ?? null,
    closedByOperatorName: operator?.name ?? null,
  };
  await putRecords("cash_sessions", [closed]);
  await enqueueOperation("CASH_CLOSE", { ...(session.openKey ? { openKey: session.openKey } : { sessionId: session.id }), countedBalance, ...(operator ? { operatorId: operator.id } : {}) });
  return closed;
}

export async function createExpenseLocal(data: any): Promise<any> {
  const active: any = await localActiveCashSession();
  const key = generateUuid();
  data = { ...data, expenseDate: data.expenseDate ?? new Date().toISOString() };
  const expense = {
    ...data,
    id: "LOCAL-" + key,
    createKey: key,
    localDraft: true,
    draftData: data,
    amount: String(data.amount),
    status: "DRAFT",
    cashSessionId: active?.id ?? null,
    expenseDate: data.expenseDate ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  await putRecords("expenses", [expense]);
  return expense;
}

export async function confirmExpenseLocal(id: string): Promise<any> {
  const current = await getRecord("expenses", id);
  if (!current) throw new Error("Despesa não encontrada.");
  if (current.status !== "DRAFT") throw new Error("Só é possível confirmar rascunhos.");
  if (current.localDraft) {
    const op = await enqueueOperation("EXPENSE", { ...current.draftData, confirm: true });
    const { draftData, ...rest } = current;
    const done = { ...rest, localDraft: false, createKey: op.idempotencyKey, status: "CONFIRMED", confirmedAt: new Date().toISOString() };
    await putRecords("expenses", [done]);
    return done;
  }
  if (current.localDraft) {
    const op = await enqueueOperation("EXPENSE", { ...current.draftData, confirm: true });
    const { draftData, ...rest } = current;
    const done = { ...rest, localDraft: false, createKey: op.idempotencyKey, status: "CONFIRMED", confirmedAt: new Date().toISOString() };
    await putRecords("expenses", [done]);
    return done;
  }
  const updated = { ...current, status: "CONFIRMED", confirmedAt: new Date().toISOString() };
  await putRecords("expenses", [updated]);
  await enqueueOperation("EXPENSE_CONFIRM", expenseRef(current));
  return updated;
}

export async function cancelExpenseLocal(id: string): Promise<any> {
  const current = await getRecord("expenses", id);
  if (!current) throw new Error("Despesa não encontrada.");
  if (current.status !== "DRAFT") throw new Error("Só é possível cancelar rascunhos.");
  if (current.localDraft) {
    await deleteRecord("expenses", id);
    return { ...current, status: "CANCELLED" };
  }
  if (current.localDraft) {
    await deleteRecord("expenses", id);
    return { ...current, status: "CANCELLED" };
  }
  const updated = { ...current, status: "CANCELLED" };
  await putRecords("expenses", [updated]);
  await enqueueOperation("EXPENSE_CANCEL", expenseRef(current));
  return updated;
}

export async function updateExpenseLocal(id: string, data: any): Promise<any> {
  const current = await getRecord("expenses", id);
  if (!current) throw new Error("Despesa não encontrada.");
  if (current.status !== "DRAFT") throw new Error("Só é possível editar rascunhos.");
  if (current.localDraft) {
    const draftData = { ...current.draftData, ...data };
    const local = { ...current, ...data, amount: String(data.amount), draftData };
    await putRecords("expenses", [local]);
    return local;
  }
  if (current.localDraft) {
    const draftData = { ...current.draftData, ...data };
    const local = { ...current, ...data, amount: String(data.amount), draftData };
    await putRecords("expenses", [local]);
    return local;
  }
  const updated = { ...current, ...data, amount: String(data.amount) };
  await putRecords("expenses", [updated]);
  await enqueueOperation("EXPENSE_UPDATE", { ...expenseRef(current), data });
  return updated;
}

export async function createReturnLocal(data: any): Promise<any> {
  const sale: any = await getRecord("sales", data.saleId);
  const id = localId();
  const lines: any[] = [];
  for (const l of data.lines ?? []) {
    const sl: any = await getRecord("sale_lines", l.saleLineId);
    const product: any = sl ? await getRecord("products", sl.productId) : null;
    const qty = Number(l.quantity);
    const unit = parseFloat(sl?.unitPrice ?? "0");
    const subtotal = sl && sl.quantity ? (parseFloat(sl.subtotal) / Number(sl.quantity)) * qty : unit * qty;
    lines.push({
      id: localId(),
      returnId: id,
      saleLineId: l.saleLineId,
      productId: sl?.productId ?? "",
      quantity: qty,
      unitPrice: String(unit),
      discount: "0",
      subtotal: subtotal.toFixed(2),
      lotNumber: l.lotNumber ?? null,
      expiryDate: l.expiryDate ?? null,
      condition: null,
      quantityReleased: 0,
      product: product ? { name: product.name, sku: product.sku ?? null } : undefined,
    });
  }
  const total = lines.reduce((acc, l) => acc + parseFloat(l.subtotal), 0);
  const op = await enqueueOperation("RETURN", data);
  const ret = {
    id,
    createKey: op.idempotencyKey,
    saleId: data.saleId,
    returnNumber: "DEV-" + op.idempotencyKey.slice(0, 8).toUpperCase(),
    operatorId: data.operatorId ?? null,
    operatorName: getSelectedOperator()?.name ?? null,
    reason: data.reason,
    totalRefund: total.toFixed(2),
    status: "DRAFT",
    sale: sale ? { saleNumber: sale.saleNumber } : undefined,
    lines,
    refunds: [],
    createdAt: new Date().toISOString(),
  };
  await putRecords("returns", [ret]);
  return ret;
}

export async function confirmReturnLocal(id: string): Promise<any> {
  const current = await getRecord("returns", id);
  if (!current) throw new Error("Devolução não encontrada.");
  if (current.status !== "DRAFT") throw new Error("Só é possível confirmar rascunhos.");
  const updated = { ...current, status: "CONFIRMED" };
  await putRecords("returns", [updated]);
  await enqueueOperation("RETURN_CONFIRM", returnRef(current));
  return updated;
}

export async function inspectReturnLocal(id: string, lineId: string, data: any): Promise<any> {
  const current = await getRecord("returns", id);
  if (!current) throw new Error("Devolução não encontrada.");
  if (current.status !== "CONFIRMED") throw new Error("Só é possível inspecionar devoluções confirmadas.");
  const line = (current.lines ?? []).find((l: any) => l.id === lineId);
  if (!line) throw new Error("Linha não encontrada.");
  const released = data.condition === "RESELLABLE" ? Number(data.quantityToRelease) : 0;
  const lines = current.lines.map((l: any) =>
    l.id === lineId ? { ...l, condition: data.condition, quantityReleased: (l.quantityReleased ?? 0) + released } : l
  );
  const updated = { ...current, lines };
  await putRecords("returns", [updated]);
  await enqueueOperation("RETURN_INSPECT", {
    ...returnRef(current),
    saleLineId: line.saleLineId,
    condition: data.condition,
    quantityToRelease: Number(data.quantityToRelease),
  });
  return updated;
}

export async function createRefundLocal(returnId: string, data: any): Promise<any> {
  const current = await getRecord("returns", returnId);
  if (!current) throw new Error("Devolução não encontrada.");
  if (current.status !== "CONFIRMED") throw new Error("Só é possível reembolsar devoluções confirmadas.");
  const line = (current.lines ?? []).find((l: any) => l.id === data.returnLineId);
  if (!line) throw new Error("Linha não encontrada.");
  let cashRef: any = {};
  let sessionId: string | undefined = data.cashSessionId;
  if (!sessionId) {
    const active: any = await localActiveCashSession();
    sessionId = active?.id;
  }
  if (sessionId) {
    const sess: any = await getRecord("cash_sessions", sessionId);
    cashRef = sess?.openKey ? { cashOpenKey: sess.openKey } : { cashSessionId: sessionId };
  }
  const op = await enqueueOperation("REFUND", {
    ...returnRef(current),
    saleLineId: line.saleLineId,
    salePaymentId: data.salePaymentId,
    method: data.method,
    amount: Number(data.amount),
    ...cashRef,
  });
  const refund = {
    id: localId(),
    returnId: current.id,
    returnLineId: line.id,
    method: data.method,
    amount: String(data.amount),
    status: "COMPLETED",
    idempotencyKey: op.idempotencyKey,
    createdAt: new Date().toISOString(),
  };
  const updated = { ...current, refunds: [...(current.refunds ?? []), refund] };
  await putRecords("returns", [updated]);
  return refund;
}
export async function cancelReturnLocal(id: string): Promise<void> {
  const current = await getRecord("returns", id);
  if (!current) throw new Error("Devolução não encontrada.");
  if (current.status === "DRAFT") {
    await deleteRecord("returns", id);
    return;
  }
  if (current.status !== "CONFIRMED") throw new Error("Só é possível cancelar devoluções confirmadas ou rascunhos.");
  await enqueueOperation("RETURN_CANCEL", returnRef(current));
  await deleteRecord("returns", id);
}

async function allCategories(): Promise<any[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("categories", "readonly").objectStore("categories").getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function createCategoryLocal(data: { name: string; description?: string | null }): Promise<any> {
  const name = String(data.name ?? "").trim();
  const all = await allCategories();
  if (all.some((c) => c.name === name)) throw new Error("Categoria já existe.");
  const description = data.description ?? null;
  const op = await enqueueOperation("CATEGORY_CREATE", { name, description });
  const now = new Date().toISOString();
  const cat = {
    id: "LOCAL-" + op.idempotencyKey,
    createKey: op.idempotencyKey,
    pharmacyId: all[0]?.pharmacyId ?? null,
    name,
    description,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await putRecords("categories", [cat]);
  return cat;
}

export async function updateCategoryLocal(id: string, data: { name?: string; description?: string | null; isActive?: boolean }): Promise<any> {
  const current = await getRecord("categories", id);
  if (!current) throw new Error("Categoria não encontrada.");
  const patch: any = {};
  if (data.name !== undefined) patch.name = String(data.name).trim();
  if (data.description !== undefined) patch.description = data.description;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (patch.name !== undefined) {
    const all = await allCategories();
    if (all.some((c) => c.id !== id && c.name === patch.name)) throw new Error("Categoria já existe.");
  }
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await putRecords("categories", [updated]);
  await enqueueOperation("CATEGORY_UPDATE", { ...(current.createKey ? { createKey: current.createKey } : { categoryId: id }), data: patch });
  return updated;
}
async function allFrom(store: string): Promise<any[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function createProductLocal(data: any): Promise<any> {
  const name = String(data.name ?? "").trim();
  const type = data.type === "MEDICINE" ? "MEDICINE" : "PRODUCT";
  const op = await enqueueOperation("PRODUCT_CREATE", { ...data, name, type });
  const products = await allFrom("products");
  const cat = data.categoryId ? await getRecord("categories", data.categoryId) : null;
  const now = new Date().toISOString();
  const prod = {
    id: "LOCAL-" + op.idempotencyKey,
    createKey: op.idempotencyKey,
    pharmacyId: products[0]?.pharmacyId ?? null,
    categoryId: data.categoryId ?? null,
    name,
    description: data.description ?? null,
    sku: data.sku ?? null,
    barcode: data.barcode ?? null,
    activeIngredient: data.activeIngredient ?? null,
    dosageForm: data.dosageForm ?? null,
    strength: data.strength ?? null,
    unit: data.unit ?? (type === "MEDICINE" ? "carteira" : "unidade"),
    type,
    hasExpiry: type === "MEDICINE" ? true : data.hasExpiry !== false,
    minStock: data.minStock ?? null,
    saleUnitLabel: type === "MEDICINE" ? "carteira" : "unidade",
    salePrice: (Number(data.salePrice) || 0).toFixed(2),
    referenceCost: null,
    status: data.status ?? "ACTIVE",
    createdAt: now,
    updatedAt: now,
    category: cat ? { name: cat.name } : undefined,
  };
  await putRecords("products", [prod]);
  return prod;
}

export async function createBoxLocal(data: any): Promise<any> {
  const product = await getRecord("products", data.productId);
  if (!product) throw new Error("Produto não encontrado.");
  const qr = String(data.qrCode ?? "").trim();
  if (!qr) throw new Error("O QR Code é obrigatório.");
  const lots = await allFrom("stock_lots");
  if (lots.some((l) => String(l.qrCode ?? "") === qr)) throw new Error("Este QR Code já está registado.");
  const isMed = product.type === "MEDICINE";
  let innerCount: number | null = null;
  let unitsPerInner: number | null = null;
  let totalUnits: number;
  if (isMed) {
    innerCount = Number(data.innerCount);
    unitsPerInner = Number(data.unitsPerInner);
    if (!(innerCount > 0) || !(unitsPerInner > 0)) throw new Error("Indica as caixinhas e as carteiras por caixinha.");
    totalUnits = innerCount * unitsPerInner;
  } else {
    totalUnits = Number(data.totalUnits);
    if (!(totalUnits > 0)) throw new Error("Indica o total de unidades.");
  }
  const expiry = data.expiryDate ?? null;
  const isLocalProduct = String(product.id).startsWith("LOCAL-");
  if (isLocalProduct && !product.createKey) throw new Error("Produto não encontrado.");
  const payload: any = { ...(isLocalProduct ? { createKey: product.createKey } : { productId: product.id }), qrCode: qr, expiryDate: expiry };
  if (isMed) {
    payload.innerCount = innerCount;
    payload.unitsPerInner = unitsPerInner;
  } else {
    payload.totalUnits = totalUnits;
  }
  if (data.unitCost !== undefined) payload.unitCost = Number(data.unitCost);
  if (data.purchaseId) payload.purchaseId = data.purchaseId;
  if (data.acquisitionCost !== undefined) payload.acquisitionCost = Number(data.acquisitionCost);
  const op = await enqueueOperation("STOCK_BOX_CREATE", payload);
  const now = new Date().toISOString();
  const lotId = "LOCAL-" + op.idempotencyKey;
  const lot = {
    id: lotId,
    createKey: op.idempotencyKey,
    pharmacyId: product.pharmacyId ?? null,
    productId: product.id,
    purchaseLineId: null,
    lotNumber: qr,
    qrCode: qr,
    expiryDate: expiry,
    innerCount,
    unitsPerInner,
    totalUnits,
    quantityReceived: totalUnits,
    quantityReceivedFromLine: 0,
    quantityAvailable: totalUnits,
    unitCost: "0",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    product: { name: product.name, sku: product.sku ?? null },
  };
  await putRecords("stock_lots", [lot]);
  await putRecords("stock_movements", [
    {
      id: "LOCAL-MOV-" + op.idempotencyKey,
      pharmacyId: product.pharmacyId ?? null,
      productId: product.id,
      lotId,
      type: "DIRECT_ENTRY",
      quantity: totalUnits,
      referenceId: lotId,
      referenceType: "StockLot",
      notes: "Entrada directa de caixa (createBox)",
      userId: "offline",
      createdAt: now,
    },
  ]);
  return lot;
}

async function findLocalLine(lineId: string): Promise<{ purchase: any; line: any }> {
  const list: any[] = await allFrom("purchases");
  for (const p of list) {
    const l = (p.lines ?? []).find((x: any) => x.id === lineId);
    if (l) return { purchase: p, line: l };
  }
  throw new Error("Linha da fatura não encontrada.");
}

async function lineFaltaLocal(line: any): Promise<number> {
  const lots: any[] = await allFrom("stock_lots");
  const locais = lots.filter((x: any) => x.purchaseLineId === line.id && String(x.id).startsWith("LOCAL-")).length;
  return Number(line.quantity) - Number(line.received ?? 0) - locais - Number(line.quantityDamaged ?? 0);
}

export async function receiveLineBoxesLocal(data: any): Promise<any[]> {
  const { purchase, line } = await findLocalLine(String(data.purchaseLineId));
  if (purchase.status !== "CONFIRMED") throw new Error("A fatura precisa de estar confirmada.");
  if (line.closed) throw new Error("Esta linha já está fechada.");
  const qrs: string[] = (data.qrCodes ?? []).map((s: any) => String(s).trim()).filter(Boolean);
  if (qrs.length === 0) throw new Error("Lê pelo menos um QR.");
  if (new Set(qrs).size !== qrs.length) throw new Error("Há QR repetidos na lista.");
  const falta = await lineFaltaLocal(line);
  if (qrs.length > falta) throw new Error("Só faltam " + falta + " caixas nesta linha.");
  const product = await getRecord("products", line.productId);
  if (!product) throw new Error("Produto não encontrado.");
  const isMed = product.type === "MEDICINE";
  const totalUnits = isMed ? Number(line.innerCount) * Number(line.unitsPerInner) : Number(line.unitsPerBox);
  if (!(totalUnits > 0)) throw new Error("A linha não tem a estrutura da caixa definida.");
  const expiry = data.expiryDate ?? null;
  if (product.hasExpiry === true && !expiry) throw new Error("Indica a validade.");
  if (expiry && new Date(expiry).getTime() <= Date.now()) throw new Error("A validade deve ser no futuro.");
  const price = data.salePrice === undefined || data.salePrice === null || data.salePrice === "" ? null : Number(data.salePrice);
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error("Preço de venda inválido.");
  const existing: any[] = await allFrom("stock_lots");
  for (const q of qrs) {
    if (existing.some((l: any) => String(l.qrCode ?? "") === q)) throw new Error("O QR " + q + " já está registado.");
  }
  const boxCost = Number(line.subtotal) / Number(line.quantity);
  const unitCost = Math.round((boxCost / totalUnits + Number.EPSILON) * 100) / 100;
  const now = new Date().toISOString();
  const lots: any[] = [];
  const moves: any[] = [];
  for (const qr of qrs) {
    const op = await enqueueOperation("STOCK_BOX_CREATE", {
      purchaseLineId: line.id,
      qrCode: qr,
      ...(expiry ? { expiryDate: expiry } : {}),
      ...(price !== null ? { salePrice: price } : {}),
    });
    const lotId = "LOCAL-" + op.idempotencyKey;
    lots.push({
      id: lotId,
      createKey: op.idempotencyKey,
      pharmacyId: product.pharmacyId ?? null,
      productId: product.id,
      purchaseId: purchase.id,
      purchaseLineId: line.id,
      lotNumber: qr,
      qrCode: qr,
      expiryDate: expiry,
      innerCount: isMed ? Number(line.innerCount) : null,
      unitsPerInner: isMed ? Number(line.unitsPerInner) : null,
      totalUnits,
      quantityReceived: totalUnits,
      quantityReceivedFromLine: 0,
      quantityAvailable: totalUnits,
      unitCost: String(unitCost),
      acquisitionCost: String(Math.round((boxCost + Number.EPSILON) * 100) / 100),
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      product: { name: product.name, sku: product.sku ?? null },
    });
    moves.push({
      id: "LOCAL-MOV-" + op.idempotencyKey,
      pharmacyId: product.pharmacyId ?? null,
      productId: product.id,
      lotId,
      type: "PURCHASE_ENTRY",
      quantity: totalUnits,
      referenceId: purchase.id,
      referenceType: "Purchase",
      notes: "Receção de fatura (caixa)",
      userId: "offline",
      createdAt: now,
    });
  }
  await putRecords("stock_lots", lots);
  await putRecords("stock_movements", moves);
  if (price !== null) await putRecords("products", [{ ...product, salePrice: String(price) }]);
  return lots;
}

export async function markLineDamagedLocal(lineId: string, quantity: number, note?: string): Promise<any> {
  const { purchase, line } = await findLocalLine(lineId);
  if (purchase.status !== "CONFIRMED") throw new Error("A fatura precisa de estar confirmada.");
  if (line.closed) throw new Error("Esta linha já está fechada.");
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Indica quantas caixas vieram danificadas.");
  const falta = await lineFaltaLocal(line);
  if (quantity > falta) throw new Error("Só faltam " + falta + " caixas nesta linha.");
  await enqueueOperation("PURCHASE_LINE_DAMAGED", { lineId, quantity, ...(note ? { note } : {}) });
  const lines = (purchase.lines ?? []).map((l: any) => (l.id === lineId ? { ...l, quantityDamaged: Number(l.quantityDamaged ?? 0) + quantity, ...(note ? { damageNote: note } : {}) } : l));
  await putRecords("purchases", [{ ...purchase, lines }]);
  return { id: lineId };
}

export async function closeLineLocal(lineId: string): Promise<any> {
  const { purchase, line } = await findLocalLine(lineId);
  if (purchase.status !== "CONFIRMED") throw new Error("A fatura precisa de estar confirmada.");
  if (line.closed) throw new Error("Esta linha já está fechada.");
  await enqueueOperation("PURCHASE_LINE_CLOSE", { lineId });
  const lines = (purchase.lines ?? []).map((l: any) => (l.id === lineId ? { ...l, closed: true } : l));
  await putRecords("purchases", [{ ...purchase, lines }]);
  return { id: lineId };
}