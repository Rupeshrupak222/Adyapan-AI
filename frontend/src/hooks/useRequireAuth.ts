"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side route guard.
 * Call at the top of any protected page.
 *
 * @param requiredRole  "USER" | "ADMIN" — if omitted, just checks login
 */
export function useRequireAuth(requiredRole?: "USER" | "ADMIN") {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token");
    const raw = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");

    if (!token || !raw) {
      const loginUrl = requiredRole === "ADMIN" ? "/admin-login" : "/login";
      router.replace(`${loginUrl}?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (requiredRole) {
      try {
        const user = JSON.parse(raw) as { role?: string };
        if (user.role !== requiredRole) {
          const dest = user.role === "ADMIN" ? "/dashboard/admin" : "/dashboard/user";
          router.replace(dest);
        }
      } catch {
        const fallbackUrl = requiredRole === "ADMIN" ? "/admin-login" : "/login";
        router.replace(fallbackUrl);
      }
    }
  }, [router, requiredRole]);
}

