import type { Product, Category, ProductRequest } from "../types/products";
// import { apiClient } from "./api";

// [MOCK]
const mockCategories: Category[] = [
  { id: "c1", name: "Analgésicos" },
  { id: "c2", name: "Antibióticos" },
  { id: "c3", name: "Vitaminas" },
];

const mockProducts: Product[] = [
  { id: "p1", name: "Paracetamol 500mg", description: "Caixa 20 comprimidos", price: "500.00", categoryId: "c1", categoryName: "Analgésicos", stockQuantity: 150 },
  { id: "p2", name: "Brufen 200mg", description: "Caixa 20 comprimidos", price: "1200.00", categoryId: "c1", categoryName: "Analgésicos", stockQuantity: 80 },
  { id: "p3", name: "Vitamina C", description: "Tubo 20 comprimidos", price: "250.00", categoryId: "c3", categoryName: "Vitaminas", stockQuantity: 200 },
];

export async function getProducts(): Promise<Product[]> {
  return Promise.resolve(mockProducts);
}

export async function getCategories(): Promise<Category[]> {
  return Promise.resolve(mockCategories);
}

export async function createProduct(data: ProductRequest): Promise<Product> {
  console.log("Mock createProduct:", data);
  const newProduct: Product = {
    id: Math.random().toString(),
    ...data,
    categoryName: mockCategories.find(c => c.id === data.categoryId)?.name || "Sem categoria",
    stockQuantity: 0,
  };
  mockProducts.push(newProduct);
  return Promise.resolve(newProduct);
}

export async function updateProduct(id: string, data: ProductRequest): Promise<Product> {
  console.log("Mock updateProduct:", id, data);
  const idx = mockProducts.findIndex(p => p.id === id);
  if (idx === -1) throw new Error("Produto não encontrado");
  mockProducts[idx] = { ...mockProducts[idx], ...data };
  return Promise.resolve(mockProducts[idx]);
}

export async function getProductById(id: string): Promise<Product> {
  const p = mockProducts.find(p => p.id === id);
  if (!p) throw new Error("Produto não encontrado");
  return Promise.resolve(p);
}
