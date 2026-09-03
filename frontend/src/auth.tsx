import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, clearToken } from "./api";

type User = {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  level: number;
  xp: number;
  default_percentage: number;
  total_earnings: number;
  total_washes: number;
  daily_goal: number;
  weekly_goal: number;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await setToken(res.token);
    setUser(res.user);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await api.register(username, email, password);
    await setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  const refresh = async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {}
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

export function formatMoney(v: number): string {
  return `R$ ${(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
