export type ExpenseStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface Expense {
  id: string;
  description: string;
  amount: string; // Decimal string "1500.00"
  status: ExpenseStatus;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

export interface ExpenseRequest {
  description: string;
  amount: string;
}
