import { useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
}

export interface Session {
  access_token: string;
  user: User;
}

const STORAGE_KEY = "keyvault_auth";

function getStoredAuth(): { user: User | null; session: Session | null } {
  if (typeof window === "undefined") return { user: null, session: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, session: null };
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && parsed.token) {
      const user: User = parsed.user;
      const session: Session = { access_token: parsed.token, user };
      return { user, session };
    }
  } catch {
    return { user: null, session: null };
  }
  return { user: null, session: null };
}

export function setAuthSession(user: User, token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  window.dispatchEvent(new Event("vault-auth-change"));
}

export function updateUserSession(patch: Partial<User>) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.user) {
        parsed.user = { ...parsed.user, ...patch };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        window.dispatchEvent(new Event("vault-auth-change"));
      }
    }
  } catch {
    return;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem("keyvault_pin_verified");
  window.dispatchEvent(new Event("vault-auth-change"));
}

export function useAuth() {
  const [auth, setAuth] = useState<{ user: User | null; session: Session | null }>({
    user: null,
    session: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const current = getStoredAuth();
    setAuth(current);
    setLoading(false);

    const handler = () => {
      setAuth(getStoredAuth());
    };

    window.addEventListener("vault-auth-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("vault-auth-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return {
    session: auth?.session ?? null,
    user: auth?.user ?? null,
    loading,
    signOut: clearAuthSession,
  };
}
