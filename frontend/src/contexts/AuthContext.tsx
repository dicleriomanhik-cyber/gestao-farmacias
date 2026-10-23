import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthResponse, LoginRequest, User } from "../types/auth";
import * as authService from "../services/authService";
import { getRefreshToken } from "../services/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setAuthenticated] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(true);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const applyAuth = (res: AuthResponse) => {
    if (res.user) {
      setUser(res.user);
      setAuthenticated(true);
    }
  };

  const refreshSession = useCallback(async (): Promise<void> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const p = (async () => {
      try {
        const res = await authService.refresh();
        applyAuth(res);
      } catch {
        setUser(null);
        setAuthenticated(false);
      } finally {
        setLoading(false);
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = p;
    return p;
  }, []);

  useEffect(() => {
    if (getRefreshToken()) {
      void refreshSession();
    } else {
      setLoading(false);
    }
  }, [refreshSession]);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authService.login(data);
    applyAuth(res);
  }, []);

  const loginAsDemo = useCallback(() => {
    setUser({
      id: "demo-123",
      email: "demo@farmacia.mz",
      name: "Admin Demo",
      roles: ["ADMIN"],
      permissions: [
        "users:read", "users:write", "roles:read", "roles:write",
        "pharmacy:config:read", "pharmacy:config:write", "audit:read",
        "products:read", "products:write",
        "suppliers:read", "suppliers:write",
        "purchases:read", "purchases:write",
        "stock:read", "stock:write", "stock:adjust",
        "sales:read", "sales:create", "sales:void",
        "cash:open", "cash:close",
        "returns:read", "returns:create", "returns:confirm", "returns:inspect", "returns:release", "returns:refund",
        "expenses:read", "expenses:create", "expenses:confirm", "expenses:cancel",
        "reports:read", "reports:financial",
      ],
    });
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, loginAsDemo, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}
