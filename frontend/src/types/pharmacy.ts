export type PharmacyStatus = "ACTIVE" | "INACTIVE";

export interface Pharmacy {
  id: string;
  name: string;
  tradeName: string | null;
  legalName: string | null;
  nif: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  status: PharmacyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyUpdateRequest {
  name?: string;
  tradeName?: string | null;
  legalName?: string | null;
  nif?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
}
