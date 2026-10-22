import type { UserRole } from "../types/auth";

export type Permission =
  | "sales:read"
  | "sales:create"
  | "cash:open"
  | "cash:close"
  | "products:read"
  | "products:write"
  | "stock:read"
  | "stock:write"
  | "stock:adjust"
  | "purchases:read"
  | "purchases:write"
  | "expenses:read"
  | "expenses:create"
  | "expenses:confirm"
  | "expenses:cancel"
  | "reports:read"
  | "reports:financial";

const PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "sales:read", "sales:create",
    "cash:open", "cash:close",
    "products:read", "products:write",
    "stock:read", "stock:write", "stock:adjust",
    "purchases:read", "purchases:write",
    "expenses:read", "expenses:create", "expenses:confirm", "expenses:cancel",
    "reports:read", "reports:financial",
  ],
  PHARMACIST: [
    "sales:read", "sales:create",
    "products:read",
    "stock:read",
    "purchases:read",
    "expenses:read", "expenses:create", "expenses:confirm",
    "reports:read",
  ],
  CASHIER: [
    "sales:read", "sales:create",
    "cash:open", "cash:close",
    "purchases:read",
    "expenses:read", "expenses:create", "expenses:confirm",
    "reports:read",
  ],
  STOCK_MANAGER: [
    "products:read", "products:write",
    "stock:read", "stock:write", "stock:adjust",
    "purchases:read", "purchases:write",
    "sales:read",
    "expenses:read",
    "reports:read",
  ],
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessSales(role: UserRole | undefined): boolean {
  return hasPermission(role, "sales:read");
}

export function canCreateSales(role: UserRole | undefined): boolean {
  return hasPermission(role, "sales:create");
}

export function canAccessCash(role: UserRole | undefined): boolean {
  return hasPermission(role, "cash:open");
}

export function canAccessProducts(role: UserRole | undefined): boolean {
  return hasPermission(role, "products:read");
}

export function canWriteProducts(role: UserRole | undefined): boolean {
  return hasPermission(role, "products:write");
}

export function canAccessStock(role: UserRole | undefined): boolean {
  return hasPermission(role, "stock:read");
}

export function canAccessPurchases(role: UserRole | undefined): boolean {
  return hasPermission(role, "purchases:read");
}

export function canAccessExpenses(role: UserRole | undefined): boolean {
  return hasPermission(role, "expenses:read");
}

export function canAccessReports(role: UserRole | undefined): boolean {
  return hasPermission(role, "reports:read");
}

export function canAccessFinancialReports(role: UserRole | undefined): boolean {
  return hasPermission(role, "reports:financial");
}
