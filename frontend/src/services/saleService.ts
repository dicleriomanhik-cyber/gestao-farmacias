import type { Sale, SaleRequest } from "../types/sales";
// import { apiClient } from "./api"; // Usar quando o Back-end ligar

// [MOCK] Dados simulados para desenvolvimento UI
const mockSales: Sale[] = [
  {
    id: "1",
    status: "CONFIRMED",
    total: "1500.00",
    createdAt: new Date().toISOString(),
    paymentMethod: "CASH",
    items: [
      { productId: "p1", productName: "Paracetamol 500mg", quantity: 2, unitPrice: "500.00" },
      { productId: "p2", productName: "Brufen 200mg", quantity: 1, unitPrice: "500.00" },
    ],
  },
  {
    id: "2",
    status: "DRAFT",
    total: "250.00",
    createdAt: new Date().toISOString(),
    paymentMethod: "MPESA",
    items: [{ productId: "p3", productName: "Vitamina C", quantity: 1, unitPrice: "250.00" }],
  },
];

export async function getSales(): Promise<Sale[]> {
  // return apiClient.get("/sales").then(res => res.data.data);
  return Promise.resolve(mockSales);
}

export async function getSaleById(id: string): Promise<Sale> {
  // return apiClient.get(`/sales/${id}`).then(res => res.data.data);
  const sale = mockSales.find((s) => s.id === id);
  if (!sale) throw new Error("Venda não encontrada");
  return Promise.resolve(sale);
}

export async function createSale(data: SaleRequest): Promise<Sale> {
  // return apiClient.post("/sales", data).then(res => res.data.data);
  console.log("Mock createSale:", data);
  const total = data.items.reduce((acc, item) => acc + parseFloat(item.unitPrice) * item.quantity, 0).toFixed(2);
  const newSale: Sale = {
    id: Math.random().toString(),
    status: "DRAFT",
    total,
    createdAt: new Date().toISOString(),
    paymentMethod: data.paymentMethod,
    items: data.items.map(i => ({ ...i, productName: "Produto Mock" })), // No real, o Back-end devolve o nome
  };
  mockSales.push(newSale);
  return Promise.resolve(newSale);
}

export async function confirmSale(id: string): Promise<void> {
  // return apiClient.patch(`/sales/${id}/confirm`).then(res => res.data);
  console.log("Mock confirmSale:", id);
  const sale = mockSales.find((s) => s.id === id);
  if (sale) sale.status = "CONFIRMED";
  return Promise.resolve();
}
