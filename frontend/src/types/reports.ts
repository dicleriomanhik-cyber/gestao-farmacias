export interface ReportSummary {
  totalSales: string;
  totalExpenses: string;
  netProfit: string;
  cashBalance: string;
}

export interface ReportSales {
  totalSales: string;
  countSales: number;
  averageTicket: string;
}

export interface ReportExpenses {
  totalExpenses: string;
  countExpenses: number;
}

export interface ReportCash {
  totalIn: string;
  totalOut: string;
  balance: string;
}

export interface ReportStock {
  totalProducts: number;
  lowStockCount: number;
  expiringLotsCount: number;
}
