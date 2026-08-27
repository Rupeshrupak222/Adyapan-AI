"use client";

import { useEffect, useRef, useCallback } from "react";
import { api } from "@/services/api";
import { getAuthToken, clearAuthSession } from "@/hooks/useAuth";

// 24 Hours idle timeout
const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Tracks user activity (mouse, keyboard, scroll, click, touch, visibility change).
 * After 24 hours of total inactivity:
 * 1. Calls POST /auth/logout to clear session on server
 * 2. Clears localStorage/sessionStorage
 * 3. Redirects to /login page with idle_timeout reason
 */
export function useIdleTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggedOutRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());

  const performIdleLogout = useCallback(async () => {
    if (isLoggedOutRef.current) return;

    // Check if user was active recently (e.g. returned to tab)
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    if (timeSinceLastActivity < IDLE_TIMEOUT_MS) {
      // Re-arm timer if active recently
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(performIdleLogout, IDLE_TIMEOUT_MS - timeSinceLastActivity);
      return;
    }

    isLoggedOutRef.current = true;

    const token = getAuthToken();

    // Attempt server-side logout (non-blocking)
    if (token) {
      try {
        await api.post("/auth/logout");
      } catch {
        // Ignore errors — we're logging out regardless
      }
    }

    clearAuthSession();
    window.location.href = "/login?reason=idle_timeout";
  }, []);

  const resetTimer = useCallback(() => {
    if (isLoggedOutRef.current) return;
    lastActivityRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(performIdleLogout, IDLE_TIMEOUT_MS);
  }, [performIdleLogout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only activate if user is logged in
    const token = getAuthToken();
    if (!token) return;

    // Activity events that reset the idle timer
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "click",
      "touchstart",
      "touchmove",
    ];

    // Throttle event handling to avoid excessive timer resets
    const THROTTLE_MS = 10000; // Only reset timer every 10 seconds max

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current >= THROTTLE_MS) {
        resetTimer();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };

    // Register all activity listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start the initial timer
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resetTimer]);
}
