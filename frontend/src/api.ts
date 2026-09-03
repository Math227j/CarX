import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const TOKEN_KEY = "flashcarx_token";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    const msg = data?.detail || `Erro ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const api = {
  register: (username: string, email: string, password: string) =>
    apiFetch<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<any>("/auth/me"),
  updateMe: (payload: any) =>
    apiFetch<any>("/auth/me", { method: "PATCH", body: JSON.stringify(payload) }),

  dashboard: () => apiFetch<any>("/stats/dashboard"),
  analytics: () => apiFetch<any>("/stats/analytics"),
  createWash: (data: { car_name: string; value: number; percentage?: number }) =>
    apiFetch<any>("/washes", { method: "POST", body: JSON.stringify(data) }),
  listWashes: (params?: { date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiFetch<any[]>(`/washes${qs ? `?${qs}` : ""}`);
  },
  updateWash: (id: string, data: any) =>
    apiFetch<any>(`/washes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWash: (id: string) =>
    apiFetch<any>(`/washes/${id}`, { method: "DELETE" }),

  searchUsers: (q: string) => apiFetch<any[]>(`/users/search?q=${encodeURIComponent(q)}`),
  listFriends: () => apiFetch<any[]>("/friends"),
  friendRequests: () => apiFetch<any>("/friends/requests"),
  sendFriendRequest: (uid: string) =>
    apiFetch<any>(`/friends/request/${uid}`, { method: "POST" }),
  acceptFriend: (rid: string) => apiFetch<any>(`/friends/accept/${rid}`, { method: "POST" }),
  rejectFriend: (rid: string) => apiFetch<any>(`/friends/reject/${rid}`, { method: "POST" }),
  removeFriend: (uid: string) => apiFetch<any>(`/friends/${uid}`, { method: "DELETE" }),

  ranking: (period: "daily" | "weekly" | "monthly", metric: "earnings" | "revenue" | "washes") =>
    apiFetch<any>(`/ranking?period=${period}&metric=${metric}`),

  achievements: () => apiFetch<any[]>("/achievements"),
  feed: () => apiFetch<any[]>("/feed"),
};
