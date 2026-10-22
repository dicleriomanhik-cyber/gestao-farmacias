import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission, type Permission } from "../../utils/permissions";
import AccessDeniedPage from "../../pages/auth/AccessDeniedPage";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: Permission;
}

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <div style={{ padding: 24 }}>A carregar…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (requiredPermission && !hasPermission(user?.role, requiredPermission)) {
    return <AccessDeniedPage />;
  }
  return <>{children}</>;
}
