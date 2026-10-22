import type { Purchase, PurchaseRequest, PaginatedResult, PurchaseListParams } from "../types/purchases";

const mockPurchases: Purchase[] = [
  { id: "c1", supplierName: "Distribuidora Farmacêutica MZ", status: "DRAFT", total: "4500.00", createdAt: new Date().toISOString(), items: [] },
  { id: "c2", supplierName: "Importadora de Medicamentos", status: "CONFIRMED", total: "12500.00", createdAt: new Date(Date.now() - 86400000).toISOString(), items: [] },
  { id: "c3", supplierName: "Distribuidora Farmacêutica MZ", status: "CANCELLED", total: "800.00", createdAt: new Date(Date.now() - 172800000).toISOString(), items: [] },
  { id: "c4", supplierName: "MedSupply Lda", status: "CONFIRMED", total: "9800.00", createdAt: new Date(Date.now() - 259200000).toISOString(), items: [] },
];

export async function getPurchases(params: PurchaseListParams = {}): Promise<PaginatedResult<Purchase>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  let filtered = mockPurchases;
  if (params.status) {
    filtered = filtered.filter((p) => p.status === params.status);
  }
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return Promise.resolve({ data, meta: { total, page, limit, totalPages } });
}

export async function getPurchaseById(id: string): Promise<Purchase> {
  const p = mockPurchases.find((p) => p.id === id);
  if (!p) throw new Error("Compra não encontrada");
  return Promise.resolve(p);
}

export async function createPurchase(data: PurchaseRequest): Promise<Purchase> {
  const total = data.items.reduce((acc, item) => acc + parseFloat(item.unitPrice) * item.quantity, 0).toFixed(2);
  const newPurchase: Purchase = {
    id: Math.random().toString(),
    supplierName: "Fornecedor Mock",
    status: "DRAFT",
    total,
    createdAt: new Date().toISOString(),
    items: data.items.map((i) => ({ ...i, productName: "Produto Mock" })),
  };
  mockPurchases.push(newPurchase);
  return Promise.resolve(newPurchase);
}

export async function confirmPurchase(id: string): Promise<void> {
  const p = mockPurchases.find((p) => p.id === id);
  if (p) p.status = "CONFIRMED";
  return Promise.resolve();
}

export async function cancelPurchase(id: string): Promise<void> {
  const p = mockPurchases.find((p) => p.id === id);
  if (p) p.status = "CANCELLED";
  return Promise.resolve();
}
