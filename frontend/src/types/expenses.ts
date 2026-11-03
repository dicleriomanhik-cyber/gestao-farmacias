export type ExpenseCategory =
  | "RENT"
  | "UTILITIES"
  | "TRANSPORT"
  | "CONSUMABLES"
  | "MAINTENANCE"
  | "SALARIES"
  | "TAXES"
  | "OTHER";

export type ExpenseMethod =
  | "CASH"
  | "CARD"
  | "MPESA"
  | "EMOLA"
  | "TRANSFER"
  | "OTHER";

export type ExpenseStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export type ExpensePaidFrom = "PHARMACY_CASH" | "OWNER_CASH" | "BANK" | "MPESA" | "EMOLA" | "OTHER";

export interface Expense {
  id: string;
  pharmacyId: string;
  description: string;
  category: ExpenseCategory;
  amount: string;
  method: ExpenseMethod;
  status: ExpenseStatus;
  expenseDate: string;
  externalReference: string | null;
  notes: string | null;
  cashSessionId: string | null;
  origin: "ADMIN" | "COLLABORATOR";
  paidFrom?: ExpensePaidFrom;
  userId: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequest {
  origin?: "ADMIN" | "COLLABORATOR";
  paidFrom?: ExpensePaidFrom;
  description: string;
  amount: number;
  category: ExpenseCategory;
  method: ExpenseMethod;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ListParams {
  page?: number;
  limit?: number;
}
