"use client";

import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, Sparkles, X, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUsageStore } from "@/store/usage-store";
import { PremiumProgressBar } from "@/components/ui/PremiumComponents";

const REASON_COPY: Record<string, { title: string; body: string }> = {
  daily_token: {
    title: "Daily AI token limit reached",
    body: "You've used all of today's AI tokens on the free plan. Upgrade to Premium for 10x more tokens every day and unlimited learning power.",
  },
  monthly_token: {
    title: "Monthly AI token limit reached",
    body: "Your free monthly token allowance is used up. Upgrade to Premium to unlock 10x more tokens each month.",
  },
  daily_request: {
    title: "Daily request limit reached",
    body: "You've hit today's free limit of AI requests. Upgrade to Premium to unlock 10x more requests every single day.",
  },
  monthly_request: {
    title: "Monthly request limit reached",
    body: "Your free monthly request allowance is exhausted. Upgrade to Premium for 10x more requests every month.",
  },
};

const PERKS = [
  "10x daily AI tokens & requests",
  "Unlimited Ady Chat & Resume AI",
  "Priority access to new AI tools",
  "Cancel anytime, keep your work",
];

export function PremiumUpgradeModal() {
  const router = useRouter();
  const { limitOpen, limitData, closeLimitModal, usage } = useUsageStore();

  const reason = limitData?.reason || "daily_token";
  const copy = REASON_COPY[reason] || REASON_COPY.daily_token;

  const usageData = useMemo(() => {
    const u = limitData?.usage;
    if (!u) return null;
    const isToken = reason.includes("token");
    const isMonthly = reason.startsWith("monthly");
    const used = isToken
      ? (isMonthly ? u.monthlyTokensUsed ?? u.dailyTokensUsed ?? 0 : u.dailyTokensUsed ?? u.monthlyTokensUsed ?? 0)
      : (isMonthly ? u.monthlyRequestsUsed ?? u.dailyRequestsUsed ?? 0 : u.dailyRequestsUsed ?? u.monthlyRequestsUsed ?? 0);
    const limit = isToken
      ? (isMonthly ? u.monthlyTokensLimit ?? u.dailyTokensLimit ?? 0 : u.dailyTokensLimit ?? u.monthlyTokensLimit ?? 0)
      : (isMonthly ? u.monthlyRequestsLimit ?? u.dailyRequestsLimit ?? 0 : u.dailyRequestsLimit ?? u.monthlyRequestsLimit ?? 0);
    const pct = isToken
      ? (isMonthly ? u.monthlyTokensPct ?? u.dailyTokensPct ?? (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100) : u.dailyTokensPct ?? u.monthlyTokensPct ?? (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100))
      : (isMonthly ? u.monthlyRequestsPct ?? u.dailyRequestsPct ?? (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100) : u.dailyRequestsPct ?? u.monthlyRequestsPct ?? (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100));
    return { used, limit, pct, isMonthly };
  }, [limitData, reason]);

  useEffect(() => {
    if (!limitOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLimitModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [limitOpen, closeLimitModal]);

  if (limitData?.planKind && limitData.planKind !== "free") return null;

  return (
    <AnimatePresence>
      {limitOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur-[8px]"
          onClick={closeLimitModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/75 dark:bg-[#0c0d16]/90 shadow-2xl backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute -top-24 -left-16 w-64 h-64 rounded-full bg-amber-500/20 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-orange-500/20 blur-[80px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

            <button
              onClick={closeLimitModal}
              aria-label="Dismiss"
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="relative p-7">
              <div className="mb-5 relative">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.45)]"
                >
                  <Crown className="w-7 h-7 text-black" />
                </motion.div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping opacity-60" />
              </div>

              <h3 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-gray-50">{copy.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-gray-400">{copy.body}</p>

              {usageData && usageData.limit > 0 && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/60 dark:bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                      {reason.includes("token") ? "Tokens used" : "Requests used"} {usageData.isMonthly ? "this month" : "today"}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-500">
                      {usageData.used.toLocaleString()} / {usageData.limit.toLocaleString()}
                    </span>
                  </div>
                  <PremiumProgressBar value={usageData.pct} color="amber" height={7} />
                  <p className="mt-2 text-[10px] text-slate-400 dark:text-gray-500">
                    Resets automatically{usage ? ` · Plan: ${usage.plan}` : ""}
                  </p>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 gap-2">
                {PERKS.map((perk) => (
                  <div key={perk} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-gray-300">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </span>
                    {perk}
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2.5">
                <motion.button
                  whileHover={{ y: -2, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    closeLimitModal();
                    router.push("/premium");
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold tracking-wide bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black shadow-[0_8px_24px_rgba(245,158,11,0.35)] border border-amber-400/30 cursor-pointer"
                >
                  <Sparkles size={15} />
                  Upgrade to Premium
                  <ArrowRight size={15} />
                </motion.button>
                <button
                  onClick={closeLimitModal}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Zap size={13} /> Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
