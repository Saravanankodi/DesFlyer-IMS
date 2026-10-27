import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AuthContextValue = {
  email: string | null;
  token: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, token: string, rememberMe: boolean) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionEmailKey = "desflyer-session-email";
const rememberedEmailKey = "desflyer-remembered-email";
const sessionTokenKey = "desflyer-session-token";
const rememberedTokenKey = "desflyer-remembered-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() =>
    sessionStorage.getItem(sessionEmailKey) ?? localStorage.getItem(rememberedEmailKey),
  );
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(sessionTokenKey) ?? localStorage.getItem(rememberedTokenKey),
  );
  const value = useMemo<AuthContextValue>(() => ({
    email,
    token,
    isAuthenticated: Boolean(email && token),
    signIn: (nextEmail, nextToken, rememberMe) => {
      if (rememberMe) {
        localStorage.setItem(rememberedEmailKey, nextEmail);
        localStorage.setItem(rememberedTokenKey, nextToken);
        sessionStorage.removeItem(sessionEmailKey);
        sessionStorage.removeItem(sessionTokenKey);
      } else {
        localStorage.removeItem(rememberedEmailKey);
        localStorage.removeItem(rememberedTokenKey);
        sessionStorage.setItem(sessionEmailKey, nextEmail);
        sessionStorage.setItem(sessionTokenKey, nextToken);
      }
      setEmail(nextEmail);
      setToken(nextToken);
    },
    signOut: () => {
      sessionStorage.removeItem(sessionEmailKey);
      localStorage.removeItem(rememberedEmailKey);
      sessionStorage.removeItem(sessionTokenKey);
      localStorage.removeItem(rememberedTokenKey);
      setEmail(null);
      setToken(null);
    },
  }), [email, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
