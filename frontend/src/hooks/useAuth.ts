"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import type { PlatformUser } from "@/types/user";

const USER_KEY = "adyapan-user";
const TOKEN_KEY = "adyapan-token";

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/**
 * Save auth session.
 * When rememberMe is true → persists in localStorage + cookie (survives browser close).
 * When false → persists in sessionStorage only (cleared on browser close).
 */
export function saveAuthSession(token: string, user: PlatformUser, rememberMe = true) {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setCookie(TOKEN_KEY, token, 30);
    setCookie(USER_KEY, JSON.stringify(user), 30);
  } else {
    // Clear any old persistent data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    deleteCookie(TOKEN_KEY);
    deleteCookie(USER_KEY);
    // Use session storage (clears when browser closes)
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  deleteCookie(TOKEN_KEY);
  deleteCookie(USER_KEY);
}

/**
 * Get the token from either localStorage or sessionStorage.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Get the user from either localStorage or sessionStorage.
 */
export function getAuthUser(): PlatformUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlatformUser;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<PlatformUser | null>(() => getAuthUser());

  useEffect(() => {
    const stored = getAuthUser();
    if (stored) {
      setUser(stored);
    }
  }, []);

  const logout = useCallback(() => {
    const isNavAdmin = user?.role === "ADMIN" || (typeof window !== "undefined" && window.location.pathname.includes("admin"));
    clearAuthSession();
    setUser(null);
    window.location.href = isNavAdmin ? "/admin-login" : "/login";
  }, [user]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      logout,
    }),
    [user, logout],
  );
}

