"use client";

import { create } from "zustand";
import { toast } from "sonner";
import { api } from "@/services/api";

export type PlanKind = "free" | "premium" | "enterprise";

export interface UsageSnapshot {
  plan: string;
  planKind: PlanKind;
  subscriptionStatus?: string;
  dailyTokensUsed: number;
  dailyTokensLimit: number;
  dailyTokensRemaining: number;
  dailyTokensPct: number;
  monthlyTokensUsed: number;
  monthlyTokensLimit: number;
  monthlyTokensRemaining: number;
  dailyRequestsUsed: number;
  dailyRequestsLimit: number;
  dailyRequestsRemaining: number;
  dailyRequestsPct: number;
  monthlyRequestsUsed: number;
  monthlyRequestsLimit: number;
  monthlyTokensPct?: number;
  monthlyRequestsPct?: number;
  dailyResetAt: string;
  monthlyResetAt: string;
}

export interface LimitSnapshot {
  code: "LIMIT_EXCEEDED" | "PREMIUM_REQUIRED";
  plan?: string;
  planKind?: PlanKind;
  reason?: string;
  upgrade?: boolean;
  usage?: Partial<UsageSnapshot>;
  featureKey?: string;
  requiredPlan?: string;
  upgradeUrl?: string;
}

interface UsageState {
  usage: UsageSnapshot | null;
  usageLoading: boolean;
  limitOpen: boolean;
  limitData: LimitSnapshot | null;
  premiumRequiredOpen: boolean;
  premiumRequiredData: LimitSnapshot | null;
  lastFetchedAt: number | null;
  setUsage: (usage: UsageSnapshot | null) => void;
  fetchUsage: () => Promise<UsageSnapshot | null>;
  openLimitModal: (snapshot: LimitSnapshot | Partial<UsageSnapshot>) => void;
  closeLimitModal: () => void;
  openPremiumRequiredModal: (snapshot: LimitSnapshot) => void;
  closePremiumRequiredModal: () => void;
}

const DISMISS_KEY = "adyapan-limit-dismissed";

function isAdminUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
    const user = raw ? JSON.parse(raw) : null;
    if (user?.role === "ADMIN") return true;
  } catch {}
  if (window.location.pathname.startsWith("/admin")) return true;
  return false;
}

function normalizeSnapshot(snapshot: LimitSnapshot | Partial<UsageSnapshot>): { info: LimitSnapshot; usage: Partial<UsageSnapshot> } {
  if ((snapshot as LimitSnapshot).code === "LIMIT_EXCEEDED") {
    const info = snapshot as LimitSnapshot;
    return { info, usage: info.usage || {} };
  }
  return { info: { code: "LIMIT_EXCEEDED", usage: snapshot as Partial<UsageSnapshot> }, usage: snapshot as Partial<UsageSnapshot> };
}

export const useUsageStore = create<UsageState>((set) => ({
  usage: null,
  usageLoading: false,
  limitOpen: false,
  limitData: null,
  premiumRequiredOpen: false,
  premiumRequiredData: null,
  lastFetchedAt: null,

  setUsage: (usage) => set({ usage, lastFetchedAt: Date.now() }),

  fetchUsage: async () => {
    set({ usageLoading: true });
    try {
      const res = await api.get<{ success: boolean; usage: UsageSnapshot | null }>("/usage");
      if (res.data?.success) {
        set({ usage: res.data.usage, lastFetchedAt: Date.now() });
        return res.data.usage;
      }
      return null;
    } catch {
      return null;
    } finally {
      set({ usageLoading: false });
    }
  },

  openLimitModal: (snapshot) => {
    if (isAdminUser()) return;
    const { info, usage } = normalizeSnapshot(snapshot);
    const kind = info.planKind || usage.planKind || "free";

    if (kind !== "free") {
      const reset = info.reason?.startsWith("monthly") ? usage.monthlyResetAt : usage.dailyResetAt;
      const when = reset ? new Date(reset).toLocaleString() : "the next reset window";
      toast.info(`Daily AI limit reached. Your limit resets ${when}.`);
      return;
    }

    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY)) return;
    set({ limitOpen: true, limitData: info });
  },

  closeLimitModal: () => {
    if (typeof window !== "undefined") sessionStorage.setItem(DISMISS_KEY, "1");
    set({ limitOpen: false });
  },

  openPremiumRequiredModal: (snapshot) => {
    if (isAdminUser()) return;
    set({ premiumRequiredOpen: true, premiumRequiredData: snapshot });
  },

  closePremiumRequiredModal: () => {
    set({ premiumRequiredOpen: false, premiumRequiredData: null });
  },
}));
