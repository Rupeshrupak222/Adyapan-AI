"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useRequireAuth(requiredRole?: "USER" | "ADMIN") {
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("adyapan-token") || localStorage.getItem("adyapan-token");
    const raw = sessionStorage.getItem("adyapan-user") || localStorage.getItem("adyapan-user");

    if (!token || !raw) {
      const loginUrl = requiredRole === "ADMIN" ? "/admin-login" : "/login";
      router.replace(`${loginUrl}?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (requiredRole) {
      try {
        const user = JSON.parse(raw) as { role?: string };
        // If the page specifically requires ADMIN, normal users cannot enter
        if (requiredRole === "ADMIN" && user.role !== "ADMIN") {
          router.replace("/dashboard/user");
          return;
        }
        // If the page requires USER, both USER and ADMIN are permitted.
        // Admins have full supervisory access to user platform features.
        if (requiredRole === "USER" && user.role !== "USER" && user.role !== "ADMIN") {
          router.replace("/admin-login");
          return;
        }
      } catch {
        const fallbackUrl = requiredRole === "ADMIN" ? "/admin-login" : "/login";
        router.replace(fallbackUrl);
      }
    }
  }, [router, requiredRole]);
}
