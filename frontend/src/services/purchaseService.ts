import type { Purchase, PurchaseRequest } from "../types/purchases";
// import { apiClient } from "./api"; // Usar quando o Back-end ligar

// [MOCK] Dados simulados
const mockPurchases: Purchase[] = [
  {
    id: "comp-1",
    supplierName: "Distribuidora Farmacêutica MZ",
    status: "DRAFT",
    total: "4500.00",
    createdAt: new Date().toISOString(),
    items: [
      { productId: "p1", productName: "Paracetamol 500mg", quantity: 100, unitPrice: "45.00" },
    ],
  },
  {
    id: "comp-2",
    supplierName: "Importadora de Medicamentos",
    status: "CONFIRMED",
    total: "12500.00",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    items: [
      { productId: "p2", productName: "Brufen 200mg", quantity: 50, unitPrice: "250.00" },
    ],
  },
];

export async function getPurchases(): Promise<Purchase[]> {
  // return apiClient.get("/purchases").then(res => res.data.data);
  return Promise.resolve(mockPurchases);
}

export async function getPurchaseById(id: string): Promise<Purchase> {
  // return apiClient.get(`/purchases/${id}`).then(res => res.data.data);
  const purchase = mockPurchases.find((p) => p.id === id);
  if (!purchase) throw new Error("Compra não encontrada");
  return Promise.resolve(purchase);
}

export async function createPurchase(data: PurchaseRequest): Promise<Purchase> {
  // return apiClient.post("/purchases", data).then(res => res.data.data);
  console.log("Mock createPurchase:", data);
  const total = data.items.reduce((acc, item) => acc + parseFloat(item.unitPrice) * item.quantity, 0).toFixed(2);
  const newPurchase: Purchase = {
    id: Math.random().toString(),
    supplierName: "Fornecedor Mock",
    status: "DRAFT",
    total,
    createdAt: new Date().toISOString(),
    items: data.items.map(i => ({ ...i, productName: "Produto Mock" })),
  };
  mockPurchases.push(newPurchase);
  return Promise.resolve(newPurchase);
}

export async function confirmPurchase(id: string): Promise<void> {
  // return apiClient.patch(`/purchases/${id}/confirm`).then(res => res.data);
  console.log("Mock confirmPurchase:", id);
  const purchase = mockPurchases.find((p) => p.id === id);
  if (purchase) purchase.status = "CONFIRMED";
  return Promise.resolve();
}

export async function cancelPurchase(id: string): Promise<void> {
  // return apiClient.patch(`/purchases/${id}/cancel`).then(res => res.data);
  console.log("Mock cancelPurchase:", id);
  const purchase = mockPurchases.find((p) => p.id === id);
  if (purchase) purchase.status = "CANCELLED";
  return Promise.resolve();
}
