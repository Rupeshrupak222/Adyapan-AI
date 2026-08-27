"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import type { PlatformUser } from "@/types/user";

const USER_KEY = "adyapan-user";
const TOKEN_KEY = "adyapan-token";
const SESSION_ID_KEY = "adyapan-session-id";
const REFRESH_TOKEN_KEY = "adyapan-refresh-token";

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/**
 * Save auth session. Always uses sessionStorage — session ends when tab/browser closes.
 */
export function saveAuthSession(token: string, user: PlatformUser, _rememberMe = true, sessionId?: string, refreshToken?: string) {
  const prevUser = getAuthUser();
  if (prevUser && (prevUser.id !== user.id || prevUser.email !== user.email)) {
    clearAuthSession();
  }
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (sessionId) {
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  if (refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  // Set cookies so Next.js middleware.ts server-side checks succeed
  setCookie(TOKEN_KEY, token, 7);
  setCookie(USER_KEY, JSON.stringify(user), 7);
}

export function saveSessionId(sessionId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_ID_KEY, sessionId);
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_ID_KEY) || localStorage.getItem(SESSION_ID_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function updateStoredTokens(newToken: string, newRefreshToken: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, newToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    try {
      const keysToKeep = new Set(["adyapan-theme"]);
      const localKeys = Object.keys(localStorage);
      localKeys.forEach((key) => { if (!keysToKeep.has(key)) localStorage.removeItem(key); });
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach((key) => { if (!keysToKeep.has(key)) sessionStorage.removeItem(key); });
    } catch { /* ignore */ }
  }
  deleteCookie(TOKEN_KEY);
  deleteCookie(USER_KEY);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getAuthUser(): PlatformUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PlatformUser; } catch { return null; }
}

export function useAuth() {
  const [user, setUser] = useState<PlatformUser | null>(() => getAuthUser());

  useEffect(() => {
    const stored = getAuthUser();
    if (stored) setUser(stored);
  }, []);

  const logout = useCallback(() => {
    const isNavAdmin = user?.role === "ADMIN" || (typeof window !== "undefined" && window.location.pathname.includes("admin"));
    clearAuthSession();
    setUser(null);
    window.location.href = isNavAdmin ? "/admin-login" : "/login";
  }, [user]);

  return useMemo(() => ({ user, isAuthenticated: Boolean(user), logout }), [user, logout]);
}
