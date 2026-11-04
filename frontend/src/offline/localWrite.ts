import { openDb } from "./db";

function uid(): string {
  return "LOCAL-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function getAll(db: IDBDatabase, store: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

const money = (n: number) => n.toFixed(2);

export async function saveLocalSale(
  lines: { productId: string; quantity: number }[],
  payment?: { amount?: number; method: string; cashSessionId: string | null; userId: string },
  localId?: string,
  operator?: { id: string; name: string } | null
): Promise<{ saleId: string; saleNumber: string; total: string; faltas: number }> {
  const db = await openDb();
  const products = await getAll(db, "products");
  const stockLots = await getAll(db, "stock_lots");
  const saleId = localId ?? uid();
  const saleNumber = "LOCAL-" + saleId.slice(-6).toUpperCase();
  const now = new Date().toISOString();
  const agora = Date.now();
  const lotsById = new Map<string, any>(stockLots.map((l) => [l.id, { ...l }]));
  const userId = payment?.userId ?? "offline";
  const saleLines: any[] = [];
  const movements: any[] = [];
  let subtotal = 0;
  let faltas = 0;

  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId);
    const qty = Number(line.quantity) || 0;
    const unitPrice = Number(product?.salePrice ?? 0);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    const lineId = uid();
    const usados: any[] = [];
    let falta = qty;
    const candidatos = [...lotsById.values()]
      .filter(
        (l) =>
          l.productId === line.productId &&
          l.status === "ACTIVE" &&
          Number(l.quantityAvailable) > 0 &&
          new Date(l.expiryDate).getTime() > agora
      )
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    for (const lote of candidatos) {
      if (falta <= 0) break;
      const consome = Math.min(falta, Number(lote.quantityAvailable));
      lote.quantityAvailable = Number(lote.quantityAvailable) - consome;
      falta -= consome;
      usados.push({ id: uid(), saleLineId: lineId, lotId: lote.id, quantity: consome });
      movements.push({
        id: uid(),
        pharmacyId: product?.pharmacyId ?? null,
        productId: line.productId,
        lotId: lote.id,
        type: "SALE",
        quantity: -consome,
        referenceId: saleId,
        referenceType: "Sale",
        notes: null,
        userId,
        createdAt: now,
      });
    }
    faltas += Math.max(falta, 0);

    saleLines.push({
      id: lineId,
      saleId,
      productId: line.productId,
      quantity: qty,
      unitPrice: money(unitPrice),
      discount: "0",
      subtotal: money(lineTotal),
      lots: usados,
      product: product ? { name: product.name, salePrice: String(product.salePrice), sku: product.sku ?? null } : undefined,
    });
  }

  const total = money(subtotal);
  const tx = db.transaction(["sales", "sale_lines", "payments", "stock_movements", "stock_lots"], "readwrite");
  tx.objectStore("sales").put({
    id: saleId,
    pharmacyId: products[0]?.pharmacyId ?? null,
    saleNumber,
    status: "CONFIRMED",
    subtotal: total,
    discount: "0",
    total,
    notes: "Venda offline (pendente de sincronização)",
    operatorId: operator?.id ?? null,
    operatorName: operator?.name ?? null,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  for (const sl of saleLines) tx.objectStore("sale_lines").put(sl);
  for (const m of movements) tx.objectStore("stock_movements").put(m);
  for (const lote of lotsById.values()) tx.objectStore("stock_lots").put(lote);
  if (payment && subtotal > 0) {
    tx.objectStore("payments").put({
      id: uid(),
      saleId,
      cashSessionId: payment.cashSessionId,
      method: payment.method,
      amount: total,
      idempotencyKey: null,
      createdAt: now,
      userId,
    });
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return { saleId, saleNumber, total, faltas };
}

