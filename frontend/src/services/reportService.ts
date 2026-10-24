import { apiClient } from "./api";
import type {
  ReportSummaryData,
  ReportSalesData,
  ReportExpensesData,
  ReportCashData,
  ReportStockData,
} from "../types/reports";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

export async function getReportSummary(): Promise<ReportSummaryData> {
  const resp = await apiClient.get<Envelope<ReportSummaryData>>("/reports/summary");
  return resp.data.data;
}

export async function getReportSales(): Promise<ReportSalesData> {
  const resp = await apiClient.get<Envelope<ReportSalesData>>("/reports/sales");
  return resp.data.data;
}

export async function getReportExpenses(): Promise<ReportExpensesData> {
  const resp = await apiClient.get<Envelope<ReportExpensesData>>("/reports/expenses");
  return resp.data.data;
}

export async function getReportCash(): Promise<ReportCashData> {
  const resp = await apiClient.get<Envelope<ReportCashData>>("/reports/cash");
  return resp.data.data;
}

export async function getReportStock(): Promise<ReportStockData> {
  const resp = await apiClient.get<Envelope<ReportStockData>>("/reports/stock");
  return resp.data.data;
}
