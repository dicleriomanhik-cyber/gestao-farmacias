export type UserRole = "ADMIN" | "PHARMACIST" | "CASHIER" | "STOCK_MANAGER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserRequest {
  email: string;
  fullName: string;
  password?: string;   // obrigatório ao criar, omitido ao editar
  roleName: UserRole;  // só no POST
}

export interface UserUpdateRequest {
  fullName: string;    // só o nome é atualizável via PATCH
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

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  PHARMACIST: "Farmacêutico",
  CASHIER: "Caixa",
  STOCK_MANAGER: "Gestor de Stock",
};
