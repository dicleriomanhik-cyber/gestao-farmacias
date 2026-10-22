import type { ReportSummary, ReportSales, ReportExpenses, ReportCash, ReportStock } from "../types/reports";

// [MOCK] Assumindo estrutura comum - ajustar ao contrato real quando disponível
export async function getReportSummary(): Promise<ReportSummary> {
  return Promise.resolve({
    totalSales: "12500.00",
    totalExpenses: "40000.00",
    netProfit: "-27500.00",
    cashBalance: "5000.00",
  });
}

export async function getReportSales(): Promise<ReportSales> {
  return Promise.resolve({
    totalSales: "12500.00",
    countSales: 45,
    averageTicket: "277.78",
  });
}

export async function getReportExpenses(): Promise<ReportExpenses> {
  return Promise.resolve({
    totalExpenses: "40000.00",
    countExpenses: 15,
  });
}

export async function getReportCash(): Promise<ReportCash> {
  return Promise.resolve({
    totalIn: "15000.00",
    totalOut: "2500.00",
    balance: "12500.00",
  });
}

export async function getReportStock(): Promise<ReportStock> {
  return Promise.resolve({
    totalProducts: 150,
    lowStockCount: 5,
    expiringLotsCount: 3,
  });
}
