"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowUpRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useFeatureUsageStore, formatResetDate } from "@/store/feature-usage-store";

interface FeatureLimitBannerProps {
  featureKey: string;
  featureName: string;
  className?: string;
  isDark?: boolean;
}

/**
 * Shown inside a feature view when the free monthly allowance is exhausted.
 * Communicates: what happened, when it resets, and the path forward.
 */
export const FeatureLimitBanner: React.FC<FeatureLimitBannerProps> = ({
  featureKey,
  featureName,
  className = "",
  isDark = true,
}) => {
  const getFeatureUsage = useFeatureUsageStore((s) => s.getFeatureUsage);
  const refreshFeature = useFeatureUsageStore((s) => s.refreshFeature);

  const usage = getFeatureUsage(featureKey);
  if (!usage) return null;

  const resetLabel = formatResetDate(usage.resetAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-2xl border ${
        isDark
          ? "bg-red-500/5 border-red-500/25"
          : "bg-red-50 border-red-200"
      } ${className}`}
    >
      <div
        className={`p-2 rounded-xl shrink-0 ${
          isDark ? "bg-red-500/15" : "bg-red-100"
        }`}
      >
        <AlertCircle className="w-5 h-5 text-red-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {featureName} limit reached
        </p>
        <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          You've used all {usage.limit} free attempts this month.
          {resetLabel ? ` Credits reset on ${resetLabel}.` : ""} Upgrade for unlimited access.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => refreshFeature(featureKey.toUpperCase())}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
            isDark
              ? "border-slate-700 text-slate-300 hover:bg-slate-800/60"
              : "border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        <Link
          href="/premium"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-900/30"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Go Unlimited
        </Link>
      </div>
    </motion.div>
  );
};
