import { openDb, putRecords, deleteRecord } from "./db";
import { enqueueOperation, generateUuid } from "./queue";
import { localActiveCashSession } from "./readModel";

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

export async function openCashLocal(openingBalance: number): Promise<any> {
  const op = await enqueueOperation("CASH_OPEN", { openingBalance });
  const session = {
    id: localId(),
    status: "OPEN",
    openingBalance: String(openingBalance),
    openedAt: new Date().toISOString(),
    closedAt: null,
    countedBalance: null,
    openKey: op.idempotencyKey,
  };
  await putRecords("cash_sessions", [session]);
  return session;
}

export async function closeCashLocal(session: any, countedBalance: number): Promise<any> {
  const closed = {
    ...session,
    status: "CLOSED",
    closedAt: new Date().toISOString(),
    countedBalance: String(countedBalance),
  };
  await putRecords("cash_sessions", [closed]);
  await enqueueOperation("CASH_CLOSE", session.openKey ? { openKey: session.openKey, countedBalance } : { sessionId: session.id, countedBalance });
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