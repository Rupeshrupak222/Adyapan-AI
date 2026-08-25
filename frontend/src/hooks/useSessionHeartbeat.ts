"use client";

import { useEffect, useRef } from "react";
import { api } from "@/services/api";
import { getAuthToken, getSessionId } from "@/hooks/useAuth";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Polls GET /api/auth/session-check every 30 seconds to detect if the
 * session was terminated from another device.
 * 
 * The api.ts interceptor handles the 401 FORCE_LOGOUT response by dispatching
 * a "force-logout" CustomEvent, which the dashboard's useForceLogoutPopup listens
 * to and shows the popup modal.
 */
export function useSessionHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSession = async () => {
      const token = getAuthToken();
      const sessionId = getSessionId();
      if (!token || !sessionId) return;

      try {
        await api.get("/auth/session-check");
        // If we get here, session is valid — do nothing
      } catch {
        // The api.ts interceptor handles 401 + FORCE_LOGOUT automatically
        // by dispatching the "force-logout" event. No action needed here.
      }
    };

    intervalRef.current = setInterval(checkSession, HEARTBEAT_INTERVAL_MS);
    const initialTimeout = setTimeout(checkSession, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(initialTimeout);
    };
  }, []);
}
