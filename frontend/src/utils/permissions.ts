export type Permission =
  | "users:read" | "users:write"
  | "roles:read" | "roles:write"
  | "pharmacy:config:read" | "pharmacy:config:write"
  | "audit:read"
  | "products:read" | "products:write"
  | "suppliers:read" | "suppliers:write"
  | "purchases:read" | "purchases:write"
  | "stock:read" | "stock:write" | "stock:adjust"
  | "sales:read" | "sales:create" | "sales:void"
  | "cash:open" | "cash:close"
  | "reports:read" | "reports:financial"
  | "returns:read" | "returns:create" | "returns:confirm" | "returns:inspect" | "returns:release" | "returns:refund"
  | "expenses:read" | "expenses:create" | "expenses:confirm" | "expenses:cancel";

export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function canAccessSales(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "sales:read");
}

export function canCreateSales(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "sales:create");
}

export function canAccessCash(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "cash:open");
}

export function canAccessProducts(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "products:read");
}

export function canWriteProducts(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "products:write");
}

export function canAccessStock(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "stock:read");
}

export function canAccessPurchases(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "purchases:read");
}

export function canAccessExpenses(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "expenses:read");
}

export function canAccessReports(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "reports:read");
}

export function canAccessFinancialReports(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "reports:financial");
}
