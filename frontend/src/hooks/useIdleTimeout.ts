"use client";

import { useEffect, useRef, useCallback } from "react";
import { api } from "@/services/api";
import { getAuthToken, clearAuthSession } from "@/hooks/useAuth";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Tracks user activity (mouse, keyboard, scroll, click, touch).
 * After 15 minutes of inactivity:
 * 1. Calls POST /auth/logout to clear session on server
 * 2. Clears localStorage/sessionStorage
 * 3. Redirects to /login page
 *
 * Usage: call useIdleTimeout() in your authenticated layout/dashboard component.
 */
export function useIdleTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggedOutRef = useRef(false);

  const performIdleLogout = useCallback(async () => {
    if (isLoggedOutRef.current) return;
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
    let lastActivity = Date.now();
    const THROTTLE_MS = 5000; // Only reset timer every 5 seconds max

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity >= THROTTLE_MS) {
        lastActivity = now;
        resetTimer();
      }
    };

    // Register all activity listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);
}
