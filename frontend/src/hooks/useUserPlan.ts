"use client";

import { useState, useEffect } from "react";
import { getAuthUser } from "@/hooks/useAuth";

type PlanKind = "free" | "premium" | "enterprise";

function normalizePlan(plan: string | undefined): PlanKind {
  const p = (plan || "").toLowerCase();
  if (p === "enterprise" || p === "admin") return "enterprise";
  if (p.includes("premium") || p.includes("pro")) return "premium";
  return "free";
}

/**
 * Returns the user's current plan kind ("free" | "premium" | "enterprise").
 * Reads from localStorage first, then optionally re-validates against the API.
 */
export function useUserPlan(): { plan: PlanKind; isPremium: boolean; loading: boolean } {
  const [plan, setPlan] = useState<PlanKind>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Read from localStorage immediately
    const user = getAuthUser() as any;
    const localPlan = normalizePlan(user?.plan);
    setPlan(localPlan);
    setLoading(false);

    // 2. Re-validate from API for accuracy (subscription may have changed)
    import("@/services/api").then(({ api }) => {
      api.get("/subscription/overview").then((res) => {
        if (res.data?.success && res.data?.subscription?.plan) {
          setPlan(normalizePlan(res.data.subscription.plan));
        }
      }).catch(() => {});
    });
  }, []);

  return {
    plan,
    isPremium: plan === "premium" || plan === "enterprise",
    loading,
  };
}
