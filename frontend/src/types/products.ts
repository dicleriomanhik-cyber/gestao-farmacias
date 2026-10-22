export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string; // Decimal string "1500.00"
  categoryId: string;
  categoryName?: string;
  stockQuantity: number;
}

export interface ProductRequest {
  name: string;
  description: string;
  price: string;
  categoryId: string;
}
