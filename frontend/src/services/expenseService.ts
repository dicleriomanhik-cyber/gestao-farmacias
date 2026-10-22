import type { Expense, ExpenseRequest } from "../types/expenses";
// import { apiClient } from "./api";

// [MOCK]
const mockExpenses: Expense[] = [
  {
    id: "exp-1",
    description: "Renda do espaço comercial",
    amount: "15000.00",
    status: "CONFIRMED",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "exp-2",
    description: "Salários dos funcionários",
    amount: "25000.00",
    status: "CONFIRMED",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "exp-3",
    description: "Material de escritório",
    amount: "1500.00",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
  },
];

export async function getExpenses(): Promise<Expense[]> {
  return Promise.resolve(mockExpenses);
}

export async function getExpenseById(id: string): Promise<Expense> {
  const exp = mockExpenses.find((e) => e.id === id);
  if (!exp) throw new Error("Despesa não encontrada");
  return Promise.resolve(exp);
}

export async function createExpense(data: ExpenseRequest): Promise<Expense> {
  console.log("Mock createExpense:", data);
  const newExpense: Expense = {
    id: Math.random().toString(),
    ...data,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
  };
  mockExpenses.push(newExpense);
  return Promise.resolve(newExpense);
}

export async function updateExpense(id: string, data: ExpenseRequest): Promise<Expense> {
  const idx = mockExpenses.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Despesa não encontrada");
  mockExpenses[idx] = { ...mockExpenses[idx], ...data };
  return Promise.resolve(mockExpenses[idx]);
}

export async function confirmExpense(id: string): Promise<void> {
  const exp = mockExpenses.find((e) => e.id === id);
  if (exp) {
    exp.status = "CONFIRMED";
    exp.confirmedAt = new Date().toISOString();
  }
  return Promise.resolve();
}

export async function cancelExpense(id: string): Promise<void> {
  const exp = mockExpenses.find((e) => e.id === id);
  if (exp) {
    exp.status = "CANCELLED";
    exp.cancelledAt = new Date().toISOString();
  }
  return Promise.resolve();
}
