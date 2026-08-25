"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, Zap } from "lucide-react";
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
  isDark = true,
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

  const { remaining, limit, plan, allowed, unlimited, resetAt } = usage;
  const isPaid =
    unlimited || plan === "pro" || plan === "premium" || plan === "enterprise";

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
  const isLow = remaining <= 2;
  const isExhausted = !allowed || remaining === 0;
  const resetLabel = formatResetDate(resetAt);

  const barColor = isExhausted ? "bg-red-400" : isLow ? "bg-amber-400" : "bg-emerald-400";

  if (compact) {
    return (
      <motion.div
        key={remaining}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        title={resetLabel ? `Resets ${resetLabel}` : undefined}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
          isExhausted
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : isLow
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
            : isDark
            ? "bg-slate-800/80 border-slate-700/80 text-slate-300"
            : "bg-slate-100 border-slate-200 text-slate-700"
        } ${className}`}
      >
        <Sparkles className={`w-3 h-3 ${isExhausted ? "text-red-400" : "text-amber-400"}`} />
        <span>
          {remaining} / {limit} free left
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`${remaining}-${limit}`}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex flex-col gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm transition-all min-w-[150px] ${
        isExhausted
          ? "bg-red-500/10 border-red-500/30"
          : isLow
          ? "bg-amber-500/10 border-amber-500/30"
          : isDark
          ? "bg-slate-900/90 border-slate-800"
          : "bg-white border-slate-200"
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        {isExhausted ? (
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        ) : (
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <span className={isDark ? "text-slate-300" : "text-slate-600"}>Free Usage:</span>
        <span
          className={`font-black ${
            isExhausted ? "text-red-400" : isLow ? "text-amber-400" : "text-emerald-400"
          }`}
        >
          {remaining} / {limit} left
        </span>
      </div>

      <div className={`h-1 w-full rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>

      <div className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        {isExhausted
          ? resetLabel
            ? `Limit reached · Resets ${resetLabel}`
            : "Monthly limit reached"
          : resetLabel
          ? `Resets ${resetLabel}`
          : "Resets monthly"}
      </div>
    </motion.div>
  );
};
