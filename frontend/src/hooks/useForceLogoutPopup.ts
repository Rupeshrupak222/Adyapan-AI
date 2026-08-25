"use client";

import { useEffect, useState, useCallback } from "react";
import { clearAuthSession } from "@/hooks/useAuth";

/**
 * Listens for force-logout events and shows a popup before redirecting.
 * The popup blocks the UI until the user clicks OK, then redirects to login.
 *
 * Usage: const [forceLogoutMessage, dismissForceLogout] = useForceLogoutPopup();
 * Render the popup when forceLogoutMessage is non-null.
 */
export function useForceLogoutPopup(): [string | null, () => void] {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setMessage(detail?.message || "This account has been logged in on another device.");
    };

    window.addEventListener("force-logout", handler);
    return () => window.removeEventListener("force-logout", handler);
  }, []);

  const dismiss = useCallback(() => {
    setMessage(null);
    clearAuthSession();
    const isAdmin = typeof window !== "undefined" && window.location.pathname.includes("admin");
    window.location.href = isAdmin ? "/admin-login" : "/login";
  }, []);

  return [message, dismiss];
}

/**
 * Dispatch a force-logout event (called from api.ts interceptor).
 * If a dashboard is mounted and listening, it will show the popup.
 * If no listener (e.g., on a non-dashboard page), falls back to direct redirect.
 */
export function dispatchForceLogout(message: string): boolean {
  if (typeof window === "undefined") return false;
  const event = new CustomEvent("force-logout", { detail: { message } });
  // Check if anyone is listening by seeing if the event was handled
  return window.dispatchEvent(event);
}
