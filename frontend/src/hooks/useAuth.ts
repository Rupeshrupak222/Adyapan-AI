"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import type { PlatformUser } from "@/types/user";

const USER_KEY = "adyapan-user";
const TOKEN_KEY = "adyapan-token";
const SESSION_ID_KEY = "adyapan-session-id";
const REFRESH_TOKEN_KEY = "adyapan-refresh-token";

// Cross-tab logout signal. Writing to this localStorage key fires a `storage`
// event in every OTHER tab of the same browser (the originating tab does not
// receive its own event). We use it to enforce "single login per browser":
// when a different account signs in (or any tab logs out), all other tabs of
// this browser drop their session immediately instead of waiting for their
// next API call to be rejected by the backend's single-session check.
const LOGOUT_BROADCAST_KEY = "adyapan-logout-broadcast";

function broadcastLogout(reason: string) {
  if (typeof window === "undefined") return;
  try {
    // Value must change each time so the storage event always fires.
    localStorage.setItem(LOGOUT_BROADCAST_KEY, `${reason}:${Date.now()}`);
    localStorage.removeItem(LOGOUT_BROADCAST_KEY);
  } catch { /* ignore */ }
}

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
    // A different account is signing in within this browser. Clear this tab's
    // session and tell every other tab to log out too — enforcing a single
    // logged-in account per browser.
    clearAuthSession();
    broadcastLogout("account-switch");
  }
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  if (sessionId) sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  if (refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
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

  // Cross-tab enforcement: if another tab signs in as a different account (or
  // logs out), it writes LOGOUT_BROADCAST_KEY. This tab reacts by clearing its
  // own session and redirecting to the appropriate login page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOGOUT_BROADCAST_KEY || e.newValue === null) return;
      const isAdmin = user?.role === "ADMIN" || window.location.pathname.includes("admin");
      clearAuthSession();
      setUser(null);
      window.location.href = isAdmin ? "/admin-login" : "/login?reason=account_switched";
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user]);

  const logout = useCallback(() => {
    const isNavAdmin = user?.role === "ADMIN" || (typeof window !== "undefined" && window.location.pathname.includes("admin"));
    clearAuthSession();
    broadcastLogout("logout");
    setUser(null);
    window.location.href = isNavAdmin ? "/admin-login" : "/login";
  }, [user]);

  return useMemo(() => ({ user, isAuthenticated: Boolean(user), logout }), [user, logout]);
}
