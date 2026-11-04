export interface FinanceBlock {
  revenue: number;
  revenueCosted: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  returns: number;
  netProfit: number;
  marginGross: number | null;
  marginNet: number | null;
  expensesOnSales: number | null;
  returnRate: number | null;
  excluded: { lines: number; linesTotal: number; revenue: number };
}

export interface FinanceData {
  period: { from: string; to: string };
  previousPeriod: { from: string; to: string };
  current: FinanceBlock;
  previous: FinanceBlock;
  change: { revenue: number | null; grossProfit: number | null; expenses: number | null; netProfit: number | null };
}

export interface FinanceDetails {
  period: { from: string; to: string };
  granularity: "day" | "month";
  series: { k: string; revenue: number; grossProfit: number; expenses: number }[];
  byPaymentMethod: { method: string; count: number; total: string }[];
  expensesByCategory: { category: string; count: number; total: string }[];
  expensesByOrigin: { paidFrom: string; count: number; total: string }[];
  products: { id: string; name: string; units: number; revenue: number; profit: number; linesNoCost: number }[];
  stock: { valueAtCost: number; unitsNoCost: number; expiringValue: number; expiringLots: number; expiringDays: number };
  noMovement: { id: string; name: string; units: number }[];
}