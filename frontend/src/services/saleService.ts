import type { Sale, SaleRequest, PaginatedResult, SaleListParams } from "../types/sales";

const mockSales: Sale[] = [
  { id: "s1", status: "CONFIRMED", total: "1500.00", createdAt: new Date(Date.now() - 3600000).toISOString(), paymentMethod: "CASH", items: [] },
  { id: "s2", status: "DRAFT", total: "250.00", createdAt: new Date(Date.now() - 7200000).toISOString(), paymentMethod: "MPESA", items: [] },
  { id: "s3", status: "CONFIRMED", total: "3200.00", createdAt: new Date(Date.now() - 86400000).toISOString(), paymentMethod: "CARD", items: [] },
  { id: "s4", status: "CANCELLED", total: "100.00", createdAt: new Date(Date.now() - 172800000).toISOString(), paymentMethod: "CASH", items: [] },
  { id: "s5", status: "CONFIRMED", total: "850.00", createdAt: new Date(Date.now() - 259200000).toISOString(), paymentMethod: "EMOLA", items: [] },
];

export async function getSales(params: SaleListParams = {}): Promise<PaginatedResult<Sale>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  let filtered = mockSales;
  if (params.status) {
    filtered = filtered.filter((s) => s.status === params.status);
  }
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return Promise.resolve({ data, meta: { total, page, limit, totalPages } });
}

export async function getSaleById(id: string): Promise<Sale> {
  const sale = mockSales.find((s) => s.id === id);
  if (!sale) throw new Error("Venda não encontrada");
  return Promise.resolve(sale);
}

export async function createSale(data: SaleRequest): Promise<Sale> {
  const total = data.items.reduce((acc, item) => acc + parseFloat(item.unitPrice) * item.quantity, 0).toFixed(2);
  const newSale: Sale = {
    id: Math.random().toString(),
    status: "DRAFT",
    total,
    createdAt: new Date().toISOString(),
    paymentMethod: data.paymentMethod,
    items: data.items.map((i) => ({ ...i, productName: "Produto Mock" })),
  };
  mockSales.push(newSale);
  return Promise.resolve(newSale);
}

export async function confirmSale(id: string): Promise<void> {
  const sale = mockSales.find((s) => s.id === id);
  if (sale) sale.status = "CONFIRMED";
  return Promise.resolve();
}
