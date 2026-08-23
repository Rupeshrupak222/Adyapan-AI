"use client";

import { create } from "zustand";
import { api } from "@/services/api";

export interface FeatureUsageItem {
  featureKey: string;
  featureName?: string;
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  unlimited?: boolean;
  periodStart: string;
  periodEnd: string;
  allowed: boolean;
  resetAt: string;
}

interface FeatureUsageState {
  plan: string;
  features: Record<string, FeatureUsageItem>;
  loading: boolean;
  /** ISO date (first of next month) when free credits reset */
  lastFetchedAt: number | null;
  fetchFeatureUsage: () => Promise<Record<string, FeatureUsageItem>>;
  getFeatureUsage: (featureKey: string) => FeatureUsageItem | null;
  /**
   * ⚠️ Internal/admin use only. Every user-facing billable endpoint already
   * consumes server-side via requireFeatureQuota middleware — calling this
   * before a generate request would DOUBLE-consume.
   */
  checkAndConsume: (
    featureKey: string,
    requestId?: string
  ) => Promise<{ allowed: boolean; consumed?: boolean; status?: FeatureUsageItem; message?: string }>;
  /** Optimistically decrement local cache after a confirmed successful run. */
  optimisticConsume: (featureKey: string) => void;
  /** Re-sync a single feature's counters from the server (after failures/refunds). */
  refreshFeature: (featureKey: string) => Promise<FeatureUsageItem | null>;
  /** Merge authoritative status returned by a generate endpoint / headers. */
  applyStatus: (featureKey: string, status: Partial<FeatureUsageItem> | undefined) => void;
}

/** Stable idempotency key shared across retries of one logical attempt. */
export function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function daysUntilReset(resetAt?: string): number {
  if (!resetAt) return 0;
  const ms = new Date(resetAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function formatResetDate(resetAt?: string): string {
  if (!resetAt) return "";
  try {
    return new Date(resetAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export const useFeatureUsageStore = create<FeatureUsageState>((set, get) => ({
  plan: "free",
  features: {},
  loading: false,
  lastFetchedAt: null,

  fetchFeatureUsage: async () => {
    set({ loading: true });
    try {
      const res = await api.get<{
        success: boolean;
        plan: string;
        features: Record<string, FeatureUsageItem>;
      }>("/usage/features");
      if (res.data?.success) {
        set({
          plan: res.data.plan,
          features: res.data.features || {},
          lastFetchedAt: Date.now(),
        });
        return res.data.features || {};
      }
      return {};
    } catch {
      return {};
    } finally {
      set({ loading: false });
    }
  },

  getFeatureUsage: (featureKey: string) => {
    const keyUpper = featureKey.toUpperCase();
    return get().features[keyUpper] || null;
  },

  checkAndConsume: async (featureKey: string, requestId?: string) => {
    const keyUpper = featureKey.toUpperCase();
    try {
      const res = await api.post(
        `/usage/features/${keyUpper}/check`,
        { requestId: requestId || createRequestId() },
        { headers: { "x-request-id": requestId || "" } }
      );

      if (res.data?.success && res.data?.status) {
        const updatedStatus = res.data.status as FeatureUsageItem;
        set((state) => ({
          features: { ...state.features, [keyUpper]: updatedStatus },
        }));
        return { allowed: true, consumed: res.data.consumed, status: updatedStatus };
      }

      return { allowed: false, message: res.data?.message };
    } catch (err: any) {
      if (err?.response?.status === 429) {
        const status = err?.response?.data?.status as FeatureUsageItem | undefined;
        if (status) {
          set((state) => ({
            features: { ...state.features, [keyUpper]: status },
          }));
        }
        return {
          allowed: false,
          status,
          message:
            err?.response?.data?.message ||
            "Monthly limit reached for this feature.",
        };
      }
      // On network errors or unexpected status, allow client fallback —
      // the server remains the authoritative gatekeeper.
      return { allowed: true };
    }
  },

  optimisticConsume: (featureKey: string) => {
    const keyUpper = featureKey.toUpperCase();
    set((state) => {
      const current = state.features[keyUpper];
      if (!current) return state;
      if (current.unlimited) return state;
      const newUsed = current.used + 1;
      const newRemaining = Math.max(0, current.limit - newUsed);
      return {
        features: {
          ...state.features,
          [keyUpper]: {
            ...current,
            used: newUsed,
            remaining: newRemaining,
            allowed: newRemaining > 0,
          },
        },
      };
    });
  },

  refreshFeature: async (featureKey: string) => {
    const keyUpper = featureKey.toUpperCase();
    try {
      const res = await api.get<{ success: boolean; status: FeatureUsageItem }>(
        `/usage/features/${keyUpper}`
      );
      if (res.data?.success && res.data?.status) {
        const status = res.data.status;
        set((state) => ({
          features: { ...state.features, [keyUpper]: status },
        }));
        return status;
      }
    } catch {}
    return null;
  },

  applyStatus: (featureKey: string, status?: Partial<FeatureUsageItem>) => {
    const keyUpper = featureKey.toUpperCase();
    if (!status || typeof status.remaining !== "number") return;
    set((state) => {
      const current = state.features[keyUpper];
      if (!current) return state;
      return {
        features: {
          ...state.features,
          [keyUpper]: { ...current, ...status },
        },
      };
    });
  },
}));
