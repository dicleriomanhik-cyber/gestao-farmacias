import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission, isCollaborator } from "../../utils/permissions";
import AccessDeniedPage from "../../pages/auth/AccessDeniedPage";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, requiredPermission, adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <div style={{ padding: 24 }}>A carregar…</div>;
  if (!isAuthenticated) return <Navigate to={location.pathname.startsWith("/pos") ? "/pos/login" : "/login"} replace state={{ from: location }} />;
  if (adminOnly && isCollaborator(user)) return <Navigate to="/pos" replace />;
  if (requiredPermission && !hasPermission(user?.permissions ?? [], requiredPermission)) {
    return <AccessDeniedPage />;
  }
  return <>{children}</>;
}
