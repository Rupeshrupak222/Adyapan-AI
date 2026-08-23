"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  useFeatureUsageStore,
  createRequestId,
  type FeatureUsageItem,
} from "@/store/feature-usage-store";

interface UseFeatureQuotaResult {
  status: FeatureUsageItem | null;
  remaining: number;
  limit: number;
  allowed: boolean;
  unlimited: boolean;
  exhausted: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Call after a successful generation — optimistic local decrement. */
  onSuccess: () => void;
  /** Call after a failed/aborted generation — server refunds; re-sync cache. */
  onFailure: () => Promise<void>;
  /**
   * Inspect an api error from a metered endpoint.
   * Detects HTTP 429 FEATURE_LIMIT_REACHED, syncs the store, toasts the user
   * and returns true when the error was quota-related (caller should stop).
   */
  handleQuotaError: (err: unknown) => boolean;
  /** Fresh idempotency key for one logical attempt. */
  newRequestId: () => string;
}

/**
 * Read-mostly view hook for the centralized feature credit system.
 *
 * IMPORTANT: do NOT call checkAndConsume before generate requests — every
 * billable endpoint consumes server-side via requireFeatureQuota middleware.
 * This hook only keeps the informational UI in sync:
 *   mount → fetch summary → generate → success ⇒ optimisticConsume
 *                                    → failure ⇒ refreshFeature (refund lands)
 */
export function useFeatureQuota(featureKey: string): UseFeatureQuotaResult {
  const keyUpper = featureKey.toUpperCase();
  const features = useFeatureUsageStore((s) => s.features);
  const loading = useFeatureUsageStore((s) => s.loading);
  const fetchFeatureUsage = useFeatureUsageStore((s) => s.fetchFeatureUsage);
  const refreshFeature = useFeatureUsageStore((s) => s.refreshFeature);
  const optimisticConsume = useFeatureUsageStore((s) => s.optimisticConsume);

  useEffect(() => {
    if (!features[keyUpper]) {
      fetchFeatureUsage();
    }
  }, [keyUpper, features, fetchFeatureUsage]);

  const status = features[keyUpper] || null;

  const refresh = useCallback(async () => {
    await refreshFeature(keyUpper);
  }, [keyUpper, refreshFeature]);

  const onSuccess = useCallback(() => {
    optimisticConsume(keyUpper);
  }, [keyUpper, optimisticConsume]);

  const onFailure = useCallback(async () => {
    await refreshFeature(keyUpper);
  }, [keyUpper, refreshFeature]);

  const handleQuotaError = useCallback(
    (err: unknown): boolean => {
      const axiosErr = err as any;
      const status = axiosErr?.response?.status;
      if (status !== 429) return false;

      const data = axiosErr?.response?.data;
      if (data?.status) {
        useFeatureUsageStore.setState((state) => ({
          features: { ...state.features, [keyUpper]: data.status },
        }));
      }
      toast.error(
        data?.message ||
          `You've reached your monthly ${keyUpper.replaceAll("_", " ").toLowerCase()} limit.`,
        {
          description: "Upgrade to Premium for unlimited access.",
          action: data?.upgradeRequired
            ? { label: "Upgrade", onClick: () => (window.location.href = "/premium") }
            : undefined,
        }
      );
      return true;
    },
    [keyUpper]
  );

  const newRequestId = useCallback(() => createRequestId(), []);

  return {
    status,
    remaining: status?.unlimited ? Number.MAX_SAFE_INTEGER : status?.remaining ?? 0,
    limit: status?.limit ?? 0,
    allowed: (status?.unlimited || status?.allowed) ?? true,
    unlimited: Boolean(status?.unlimited),
    exhausted: !status?.unlimited && status ? !status.allowed || status.remaining === 0 : false,
    loading,
    refresh,
    onSuccess,
    onFailure,
    handleQuotaError,
    newRequestId,
  };
}
