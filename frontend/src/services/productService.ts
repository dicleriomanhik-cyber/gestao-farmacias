import type { Product, Category, ProductRequest, PaginatedResult, ListParams } from "../types/products";

const mockCategories: Category[] = [
  { id: "c1", name: "Analgésicos" },
  { id: "c2", name: "Antibióticos" },
  { id: "c3", name: "Vitaminas" },
];

const mockProducts: Product[] = [
  { id: "p1", name: "Paracetamol 500mg", description: "Caixa 20 comprimidos", price: "500.00", categoryId: "c1", categoryName: "Analgésicos", stockQuantity: 150 },
  { id: "p2", name: "Brufen 200mg", description: "Caixa 20 comprimidos", price: "1200.00", categoryId: "c1", categoryName: "Analgésicos", stockQuantity: 80 },
  { id: "p3", name: "Vitamina C", description: "Tubo 20 comprimidos", price: "250.00", categoryId: "c3", categoryName: "Vitaminas", stockQuantity: 200 },
  { id: "p4", name: "Amoxicilina 500mg", description: "Cápsulas", price: "850.00", categoryId: "c2", categoryName: "Antibióticos", stockQuantity: 40 },
  { id: "p5", name: "Ibuprofeno 400mg", description: "Caixa 20 comprimidos", price: "400.00", categoryId: "c1", categoryName: "Analgésicos", stockQuantity: 60 },
];

export async function getProducts(params: ListParams = {}): Promise<PaginatedResult<Product>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const search = (params.search ?? "").toLowerCase();

  let filtered = mockProducts;
  if (search) {
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  }
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return Promise.resolve({ data, meta: { total, page, limit, totalPages } });
}

export async function getCategories(): Promise<Category[]> {
  return Promise.resolve(mockCategories);
}

export async function createProduct(data: ProductRequest): Promise<Product> {
  const newProduct: Product = {
    id: Math.random().toString(),
    ...data,
    categoryName: mockCategories.find((c) => c.id === data.categoryId)?.name || "Sem categoria",
    stockQuantity: 0,
  };
  mockProducts.push(newProduct);
  return Promise.resolve(newProduct);
}

export async function updateProduct(id: string, data: ProductRequest): Promise<Product> {
  const idx = mockProducts.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Produto não encontrado");
  mockProducts[idx] = { ...mockProducts[idx], ...data };
  return Promise.resolve(mockProducts[idx]);
}

export async function getProductById(id: string): Promise<Product> {
  const p = mockProducts.find((p) => p.id === id);
  if (!p) throw new Error("Produto não encontrado");
  return Promise.resolve(p);
}
