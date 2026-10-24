export interface ReportPeriod {
  from: string;
  to: string;
}

// Summary
export interface ReportSummaryData {
  period: ReportPeriod;
  sales: { count: number; total: string };
  expenses: { count: number; total: string };
  returns: { count: number; total: string };
  refunds: { count: number; total: string };
  stock: { lowStockCount: number; expiredLotsCount: number };
}

// Sales
export interface ReportPayment {
  method: string;
  amount: string;
}

export interface ReportSale {
  id: string;
  saleNumber: string;
  status: string;
  total: string;
  paid: string;
  pending: string;
  createdAt: string;
  user: string;
  payments: ReportPayment[];
}

export interface ReportSalesData {
  period: ReportPeriod;
  summary: {
    count: number;
    totalSold: string;
    totalPaid: string;
    totalPending: string;
  };
  byPaymentMethod: { method: string; count: number; total: string }[];
  sales: ReportSale[];
}

// Expenses
export interface ReportExpense {
  id: string;
  description: string;
  category: string;
  method: string;
  amount: string;
  status: string;
  expenseDate: string;
  user: string;
}

export interface ReportExpensesData {
  period: ReportPeriod;
  summary: {
    count: number;
    total: string;
    cashTotal: string;
    digitalTotal: string;
  };
  byCategory: { category: string; count: number; total: string }[];
  byMethod: { method: string; count: number; total: string }[];
  expenses: ReportExpense[];
}

// Cash
export interface ReportCashSession {
  id: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  user: string;
  openingBalance: string;
  cashSalePayments: string;
  cashIn: string;
  cashOut: string;
  breakdown: {
    expensesCash: string;
    refundsCash: string;
    manualOut: string;
  };
  expectedBalance: string;
  countedBalance: string | null;
  difference: string | null;
}

export interface ReportCashData {
  period: ReportPeriod;
  sessions: ReportCashSession[];
}

// Stock
export interface ReportStockLot {
  id: string;
  lotNumber: string;
  quantityAvailable: number;
  expiryDate: string;
  unitCost: string;
  status: string;
}

export interface ReportStockProduct {
  productId: string;
  productName: string;
  sku: string | null;
  totalAvailable: number;
  totalValue: string;
  lots: ReportStockLot[];
}

export interface ReportStockData {
  summary: {
    totalProducts: number;
    totalLots: number;
    expiredLotsCount: number;
    nearExpiryLotsCount: number;
    totalStockValue: string;
  };
  products: ReportStockProduct[];
}
