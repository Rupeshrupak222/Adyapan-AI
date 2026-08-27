"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowUpRight, RefreshCw, Crown } from "lucide-react";
import Link from "next/link";
import { useFeatureUsageStore, formatResetDate } from "@/store/feature-usage-store";

interface FeatureLimitBannerProps {
  featureKey: string;
  featureName: string;
  className?: string;
  isDark?: boolean;
}

/**
 * Shown inside a feature view when the monthly allowance is exhausted.
 * Plan-aware:
 * - Free users: Shows free limit reached, reset date, premium benefits (30/9 uses), and Upgrade button.
 * - Premium users: Shows premium limit reached, reset date, and refresh button (no upgrade button).
 */
export const FeatureLimitBanner: React.FC<FeatureLimitBannerProps> = ({
  featureKey,
  featureName,
  className = "",
  isDark,
}) => {
  const getFeatureUsage = useFeatureUsageStore((s) => s.getFeatureUsage);
  const refreshFeature = useFeatureUsageStore((s) => s.refreshFeature);

  const usage = getFeatureUsage(featureKey);
  if (!usage) return null;

  const isFree = usage.plan === "free";
  const resetLabel = formatResetDate(usage.resetAt);
  const targetPremiumLimit = usage.limit === 3 ? 9 : 30;

  const forceDark = isDark === true;
  const forceLight = isDark === false;

  let containerClasses = "";
  if (isFree) {
    containerClasses = forceDark
      ? "bg-rose-500/10 border-rose-500/30 text-slate-100"
      : forceLight
      ? "bg-gradient-to-r from-rose-50/95 via-amber-50/40 to-purple-50/70 border-rose-200/90 shadow-sm text-slate-900"
      : "bg-gradient-to-r from-rose-50/95 via-amber-50/40 to-purple-50/70 border-rose-200/90 shadow-sm text-slate-900 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-slate-100 dark:shadow-none";
  } else {
    containerClasses = forceDark
      ? "bg-purple-950/40 border-purple-500/35 text-slate-100"
      : forceLight
      ? "bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-slate-50 border-purple-200/90 shadow-sm text-slate-900"
      : "bg-gradient-to-r from-purple-50/90 via-indigo-50/40 to-slate-50 border-purple-200/90 shadow-sm text-slate-900 dark:bg-purple-950/40 dark:border-purple-500/35 dark:text-slate-100 dark:shadow-none";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-2xl border transition-all ${containerClasses} ${className}`}
    >
      <div
        className={`p-2.5 rounded-xl shrink-0 ${
          isFree
            ? forceDark
              ? "bg-rose-500/20 text-rose-400"
              : forceLight
              ? "bg-rose-100 text-rose-600 border border-rose-200"
              : "bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-transparent"
            : forceDark
            ? "bg-purple-500/25 text-purple-300"
            : forceLight
            ? "bg-purple-100 text-purple-700 border border-purple-200"
            : "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/25 dark:text-purple-300 dark:border-transparent"
        }`}
      >
        {isFree ? (
          <AlertCircle className="w-5 h-5" />
        ) : (
          <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${forceDark ? "text-slate-100" : forceLight ? "text-slate-900" : "text-slate-900 dark:text-slate-100"}`}>
          {isFree ? `Monthly Free Limit Reached` : `Monthly Premium Limit Reached`}
        </p>
        <p className={`text-xs mt-0.5 leading-relaxed ${forceDark ? "text-slate-300" : forceLight ? "text-slate-600" : "text-slate-600 dark:text-slate-300"}`}>
          {isFree ? (
            <>
              You've used all {usage.limit} free attempts for {featureName} this month.
              {resetLabel ? ` Your allowance resets on ${resetLabel}.` : ""}{" "}
              <span className="font-bold text-purple-700 dark:text-purple-400">
                Premium includes {targetPremiumLimit} monthly attempts for this feature.
              </span>
            </>
          ) : (
            <>
              You've used all {usage.limit} Premium attempts for {featureName} this month.
              {resetLabel ? ` Your monthly allowance resets on ${resetLabel}.` : ""}
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => refreshFeature(featureKey.toUpperCase())}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            forceDark
              ? "border-slate-700 text-slate-300 hover:bg-slate-800/80"
              : forceLight
              ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs"
              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:shadow-none"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        {isFree && (
          <Link
            href="/premium"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-md shadow-purple-900/20"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Upgrade to Premium
          </Link>
        )}
      </div>
    </motion.div>
  );
};
