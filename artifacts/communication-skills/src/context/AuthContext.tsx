import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiUrl, getBaseUrl } from "@workspace/api-client-react";

interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isStaticHost(): boolean {
  return typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function requestError(res: Response, data: any, fallback: string): Error | null {
  if (res.ok) return null;
  if (data?.error) return new Error(String(data.error));
  if (isStaticHost() && !getBaseUrl()) {
    return new Error("Backend is not connected. Run the Docker stack or configure the public API URL.");
  }
  return new Error(data?.message || `${fallback} (${res.status})`);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((res) => (res.ok ? readJson(res) : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson(res);
    const error = requestError(res, data, "Sign in failed");
    if (error) throw error;
    if (!data?.user) throw new Error("Sign in failed: invalid response");
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson(res);
    const error = requestError(res, data, "Sign up failed");
    if (error) throw error;
    if (!data?.user) throw new Error("Sign up failed: invalid response");
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}