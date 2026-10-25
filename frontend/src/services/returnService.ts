import { apiClient } from "./api";
import type {
  SaleReturn,
  ReturnListParams,
  PaginatedResult,
  ReturnLineCondition,
  ReturnRefund,
} from "../types/returns";

interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface PaginatedEnvelope<T> {
  success: true;
  data: {
    data: T[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  };
  timestamp: string;
}

export async function getReturns(params: ReturnListParams = {}): Promise<PaginatedResult<SaleReturn>> {
  const resp = await apiClient.get<PaginatedEnvelope<SaleReturn>>("/returns", {
    params: { page: params.page ?? 1, limit: params.limit ?? 20 },
  });
  return resp.data.data;
}

export async function getReturnById(id: string): Promise<SaleReturn> {
  const resp = await apiClient.get<Envelope<SaleReturn>>(`/returns/${id}`);
  return resp.data.data;
}

export async function createReturn(data: {
  saleId: string;
  reason: string;
  lines: { saleLineId: string; quantity: number; lotNumber?: string; expiryDate?: string }[];
}): Promise<SaleReturn> {
  const resp = await apiClient.post<Envelope<SaleReturn>>("/returns", data);
  return resp.data.data;
}

export async function confirmReturn(id: string): Promise<SaleReturn> {
  const resp = await apiClient.patch<Envelope<SaleReturn>>(`/returns/${id}/confirm`);
  return resp.data.data;
}

export async function inspectReturnLine(
  returnId: string,
  lineId: string,
  data: { condition: ReturnLineCondition; quantityToRelease: number }
): Promise<SaleReturn> {
  const resp = await apiClient.patch<Envelope<SaleReturn>>(`/returns/${returnId}/lines/${lineId}/inspect`, data);
  return resp.data.data;
}

export async function createRefund(
  returnId: string,
  data: {
    returnLineId: string;
    salePaymentId: string;
    method: "CASH" | "CARD" | "MPESA" | "EMOLA";
    amount: number;
    cashSessionId?: string;
  }
): Promise<ReturnRefund> {
  const resp = await apiClient.post<Envelope<ReturnRefund>>(`/returns/${returnId}/refund`, data);
  return resp.data.data;
}

export async function confirmRefund(refundId: string, status: "COMPLETED" | "FAILED" | "CANCELLED"): Promise<ReturnRefund> {
  const resp = await apiClient.patch<Envelope<ReturnRefund>>(`/returns/refunds/${refundId}/confirm`, { status });
  return resp.data.data;
}

export async function getQuarantine(params: ReturnListParams = {}): Promise<PaginatedResult<SaleReturn>> {
  const resp = await apiClient.get<PaginatedEnvelope<SaleReturn>>("/returns/quarantine", {
    params: { page: params.page ?? 1, limit: params.limit ?? 20 },
  });
  return resp.data.data;
}
