import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentUser, type UserRole } from "./services/expenseService";

type AuthContextValue = {
  email: string | null;
  token: string | null;
  role: UserRole | null;
  isReady: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (email: string, token: string, role: UserRole, rememberMe: boolean) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionEmailKey = "desflyer-session-email";
const rememberedEmailKey = "desflyer-remembered-email";
const sessionTokenKey = "desflyer-session-token";
const rememberedTokenKey = "desflyer-remembered-token";
const sessionRoleKey = "desflyer-session-role";
const rememberedRoleKey = "desflyer-remembered-role";
const sessionExpiryKey = "desflyer-session-expires-at";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function clearStoredAuth() {
  for (const key of [
    rememberedEmailKey,
    rememberedTokenKey,
    rememberedRoleKey,
    sessionEmailKey,
    sessionTokenKey,
    sessionRoleKey,
    sessionExpiryKey,
  ]) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

function readStoredAuth() {
  const expiresAt = Number(localStorage.getItem(sessionExpiryKey));
  if (localStorage.getItem(sessionTokenKey) && expiresAt > 0 && expiresAt <= Date.now()) {
    localStorage.removeItem(sessionEmailKey);
    localStorage.removeItem(sessionTokenKey);
    localStorage.removeItem(sessionRoleKey);
    localStorage.removeItem(sessionExpiryKey);
  }
  return {
    email: localStorage.getItem(rememberedEmailKey)
      ?? localStorage.getItem(sessionEmailKey)
      ?? sessionStorage.getItem(sessionEmailKey),
    token: localStorage.getItem(rememberedTokenKey)
      ?? localStorage.getItem(sessionTokenKey)
      ?? sessionStorage.getItem(sessionTokenKey),
    role: (localStorage.getItem(rememberedRoleKey)
      ?? localStorage.getItem(sessionRoleKey)
      ?? sessionStorage.getItem(sessionRoleKey)) as UserRole | null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialAuth] = useState(readStoredAuth);
  const [email, setEmail] = useState<string | null>(initialAuth.email);
  const [token, setToken] = useState<string | null>(initialAuth.token);
  const [role, setRole] = useState<UserRole | null>(initialAuth.role);
  const [isReady, setIsReady] = useState(() => !initialAuth.token);

  useEffect(() => {
    if (!email || !token) {
      setIsReady(true);
      return;
    }
    let active = true;
    setIsReady(false);
    getCurrentUser(token)
      .then(({ user }) => {
        if (!active) return;
        setRole(user.role);
        const remembered = localStorage.getItem(rememberedTokenKey) === token;
        localStorage.setItem(remembered ? rememberedRoleKey : sessionRoleKey, user.role);
      })
      .catch(() => {
        if (!active) return;
        clearStoredAuth();
        setEmail(null);
        setToken(null);
        setRole(null);
      })
      .finally(() => { if (active) setIsReady(true); });
    return () => { active = false; };
  }, [email, token]);

  const value = useMemo<AuthContextValue>(() => ({
    email,
    token,
    role,
    isReady,
    isAuthenticated: Boolean(email && token),
    isAdmin: role === "admin",
    signIn: (nextEmail, nextToken, nextRole, rememberMe) => {
      if (rememberMe) {
        localStorage.setItem(rememberedEmailKey, nextEmail);
        localStorage.setItem(rememberedTokenKey, nextToken);
        localStorage.setItem(rememberedRoleKey, nextRole);
        localStorage.removeItem(sessionEmailKey);
        localStorage.removeItem(sessionTokenKey);
        localStorage.removeItem(sessionRoleKey);
        localStorage.removeItem(sessionExpiryKey);
        sessionStorage.removeItem(sessionEmailKey);
        sessionStorage.removeItem(sessionTokenKey);
        sessionStorage.removeItem(sessionRoleKey);
      } else {
        localStorage.removeItem(rememberedEmailKey);
        localStorage.removeItem(rememberedTokenKey);
        localStorage.removeItem(rememberedRoleKey);
        localStorage.setItem(sessionEmailKey, nextEmail);
        localStorage.setItem(sessionTokenKey, nextToken);
        localStorage.setItem(sessionRoleKey, nextRole);
        localStorage.setItem(sessionExpiryKey, String(Date.now() + sessionLifetimeMs));
        sessionStorage.removeItem(sessionEmailKey);
        sessionStorage.removeItem(sessionTokenKey);
        sessionStorage.removeItem(sessionRoleKey);
      }
      setEmail(nextEmail);
      setToken(nextToken);
      setRole(nextRole);
      setIsReady(true);
    },
    signOut: () => {
      sessionStorage.removeItem(sessionEmailKey);
      localStorage.removeItem(rememberedEmailKey);
      sessionStorage.removeItem(sessionTokenKey);
      localStorage.removeItem(rememberedTokenKey);
      sessionStorage.removeItem(sessionRoleKey);
      localStorage.removeItem(sessionEmailKey);
      localStorage.removeItem(sessionTokenKey);
      localStorage.removeItem(sessionRoleKey);
      localStorage.removeItem(sessionExpiryKey);
      localStorage.removeItem(rememberedRoleKey);
      setEmail(null);
      setToken(null);
      setRole(null);
      setIsReady(true);
    },
  }), [email, token, role, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
