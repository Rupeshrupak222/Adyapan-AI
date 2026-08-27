"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, Crown, ShieldAlert, Zap } from "lucide-react";
import { useFeatureUsageStore, formatResetDate } from "@/store/feature-usage-store";

interface FeatureCreditBadgeProps {
  featureKey: string;
  className?: string;
  isDark?: boolean;
  compact?: boolean;
}

export const FeatureCreditBadge: React.FC<FeatureCreditBadgeProps> = ({
  featureKey,
  className = "",
  isDark,
  compact = false,
}) => {
  const fetchFeatureUsage = useFeatureUsageStore((s) => s.fetchFeatureUsage);
  const getFeatureUsage = useFeatureUsageStore((s) => s.getFeatureUsage);
  const features = useFeatureUsageStore((s) => s.features);

  useEffect(() => {
    if (Object.keys(features).length === 0) {
      fetchFeatureUsage();
    }
  }, [fetchFeatureUsage, features]);

  const usage = getFeatureUsage(featureKey);

  if (!usage) return null;

  const { remaining, limit, plan, allowed, resetAt } = usage;
  const isPaid = plan !== "free";
  const isExhausted = !allowed || remaining === 0;
  const isWarning = !isExhausted && limit > 0 && (remaining / limit) <= 0.25;
  const isSubtleNotice = !isExhausted && !isWarning && remaining <= 5;

  if (isPaid) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black shadow-md border bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white border-purple-400/40 ${className}`}
      >
        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
        <span className="tracking-wide">Unlimited Pro Access</span>
      </div>
    );
  }

  const pct = limit > 0 ? Math.max(0, Math.min(100, ((limit - remaining) / limit) * 100)) : 0;
  const resetLabel = formatResetDate(resetAt);

  // Theme helper classes: if isDark is explicitly passed boolean, honor it; otherwise use dark: modifier
  const forceDark = isDark === true;
  const forceLight = isDark === false;

  const barColor = isExhausted
    ? "bg-rose-500"
    : isWarning
    ? "bg-amber-500"
    : isPaid
    ? "bg-gradient-to-r from-purple-600 to-indigo-500 dark:from-purple-500 dark:to-amber-400"
    : "bg-emerald-500 dark:bg-emerald-400";

  if (compact) {
    let containerStyle = "";
    if (isExhausted) {
      containerStyle = forceDark
        ? "bg-rose-500/15 border-rose-500/35 text-rose-300"
        : forceLight
        ? "bg-rose-50 border-rose-200 text-rose-900 shadow-xs"
        : "bg-rose-50 border-rose-200 text-rose-900 shadow-xs dark:bg-rose-500/15 dark:border-rose-500/35 dark:text-rose-300 dark:shadow-none";
    } else if (isWarning) {
      containerStyle = forceDark
        ? "bg-amber-500/15 border-amber-500/35 text-amber-200"
        : forceLight
        ? "bg-amber-50 border-amber-200 text-amber-950 shadow-xs"
        : "bg-amber-50 border-amber-200 text-amber-950 shadow-xs dark:bg-amber-500/15 dark:border-amber-500/35 dark:text-amber-200 dark:shadow-none";
    } else if (isPaid) {
      containerStyle = forceDark
        ? "bg-purple-950/50 border-purple-500/35 text-purple-200"
        : forceLight
        ? "bg-purple-50/90 border-purple-200/90 text-purple-900 shadow-xs"
        : "bg-purple-50/90 border-purple-200/90 text-purple-900 shadow-xs dark:bg-purple-950/50 dark:border-purple-500/35 dark:text-purple-200 dark:shadow-none";
    } else {
      containerStyle = forceDark
        ? "bg-slate-800/80 border-slate-700/80 text-slate-200"
        : forceLight
        ? "bg-slate-100/90 border-slate-300/80 text-slate-800 shadow-xs"
        : "bg-slate-100/90 border-slate-300/80 text-slate-800 shadow-xs dark:bg-slate-800/80 dark:border-slate-700/80 dark:text-slate-200 dark:shadow-none";
    }

    return (
      <motion.div
        key={`${remaining}-${limit}-${plan}`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        title={resetLabel ? `Resets ${resetLabel}` : undefined}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-default select-none ${containerStyle} ${className}`}
      >
        {isPaid ? (
          <Crown
            className={`w-3.5 h-3.5 shrink-0 ${
              isExhausted
                ? "text-rose-600 dark:text-rose-400"
                : isWarning
                ? "text-amber-600 dark:text-amber-400"
                : "text-amber-500 dark:text-amber-400"
            }`}
          />
        ) : (
          <Sparkles
            className={`w-3.5 h-3.5 shrink-0 ${
              isExhausted
                ? "text-rose-600 dark:text-rose-400"
                : isWarning
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          />
        )}
        <span className="flex items-center gap-1">
          <span
            className={`font-black ${
              isExhausted
                ? "text-rose-700 dark:text-rose-300"
                : isWarning
                ? "text-amber-700 dark:text-amber-300"
                : isPaid
                ? "text-purple-700 dark:text-purple-300"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {remaining}/{limit}
          </span>
          <span className="opacity-90 font-medium">
            {isPaid ? "premium left" : "free left"}
          </span>
        </span>
      </motion.div>
    );
  }

  // Full Card View
  let cardContainerStyle = "";
  if (isExhausted) {
    cardContainerStyle = forceDark
      ? "bg-rose-500/10 border-rose-500/30"
      : forceLight
      ? "bg-rose-50/70 border-rose-200 text-slate-900 shadow-sm"
      : "bg-rose-50/70 border-rose-200 text-slate-900 shadow-sm dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-slate-100";
  } else if (isWarning) {
    cardContainerStyle = forceDark
      ? "bg-amber-500/10 border-amber-500/30"
      : forceLight
      ? "bg-amber-50/70 border-amber-200 text-slate-900 shadow-sm"
      : "bg-amber-50/70 border-amber-200 text-slate-900 shadow-sm dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-slate-100";
  } else if (isPaid) {
    cardContainerStyle = forceDark
      ? "bg-slate-900/90 border-purple-500/30 shadow-purple-950/20 text-slate-100"
      : forceLight
      ? "bg-white border-purple-200/90 shadow-[0_2px_8px_rgba(147,51,234,0.06)] text-slate-900"
      : "bg-white border-purple-200/90 shadow-[0_2px_8px_rgba(147,51,234,0.06)] text-slate-900 dark:bg-slate-900/90 dark:border-purple-500/30 dark:shadow-purple-950/20 dark:text-slate-100";
  } else {
    cardContainerStyle = forceDark
      ? "bg-slate-900/90 border-slate-800 text-slate-100"
      : forceLight
      ? "bg-white border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-slate-900"
      : "bg-white border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-slate-900 dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100";
  }

  return (
    <motion.div
      key={`${remaining}-${limit}-${plan}`}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex flex-col gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all min-w-[165px] ${cardContainerStyle} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isExhausted ? (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : isPaid ? (
            <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <span className={forceDark ? "text-slate-300" : forceLight ? "text-slate-700" : "text-slate-700 dark:text-slate-300"}>
            {isPaid ? "Premium Usage:" : "Free Usage:"}
          </span>
        </div>
        <span
          className={`font-black ${
            isExhausted
              ? "text-rose-600 dark:text-rose-400"
              : isWarning
              ? "text-amber-600 dark:text-amber-400"
              : isPaid
              ? "text-purple-700 dark:text-purple-300"
              : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {remaining} / {limit} left
        </span>
      </div>

      <div className={`h-1.5 w-full rounded-full overflow-hidden ${forceDark ? "bg-slate-800" : forceLight ? "bg-slate-200" : "bg-slate-200 dark:bg-slate-800"}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>

      <div className={`text-[10px] font-medium ${forceDark ? "text-slate-400" : forceLight ? "text-slate-500" : "text-slate-500 dark:text-slate-400"}`}>
        {isExhausted
          ? resetLabel
            ? `Limit reached · Resets ${resetLabel}`
            : "Monthly limit reached"
          : isWarning
          ? `Only ${remaining} ${isPaid ? "Premium" : "free"} uses remaining`
          : isSubtleNotice
          ? `${remaining} uses remaining this month`
          : resetLabel
          ? `Resets ${resetLabel}`
          : "Resets monthly"}
      </div>
    </motion.div>
  );
};
