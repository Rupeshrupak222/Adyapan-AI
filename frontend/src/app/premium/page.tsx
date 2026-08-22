"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { motion } from "framer-motion";
import {
  Crown, Check, X, ArrowLeft, Sparkles, Zap,
  Shield, Loader2, Star, ChevronDown, Gauge, BadgeCheck,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { FloatingOrbs, PremiumProgressBar } from "@/components/ui/PremiumComponents";
import { PremiumSetupWizard } from "@/components/premium/PremiumSetupWizard";

interface CatalogPlan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  category?: string;
  recommended?: boolean;
}

interface CatalogFeature {
  featureKey: string;
  name: string;
  description: string | null;
  category: string;
  requiredPlan: "free" | "premium" | "enterprise";
  gated: boolean;
}

interface OverviewUsage {
  dailyTokensUsed: number;
  dailyTokensLimit: number;
  dailyTokensPct: number;
  monthlyTokensUsed: number;
  monthlyTokensLimit: number;
  dailyRequestsUsed: number;
  dailyRequestsLimit: number;
  dailyRequestsPct: number;
  monthlyRequestsUsed: number;
  monthlyRequestsLimit: number;
  dailyResetAt: string;
  monthlyResetAt: string;
}

interface OverviewData {
  subscription?: {
    plan: string;
    subscriptionStatus: string;
    isActive: boolean;
    nextBillingDate: string | null;
  } | null;
  usage: OverviewUsage | null;
  featureUsage?: { featureKey: string; dailyLimit: number | null; monthlyLimit: number | null }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  resume: "Resume & Career",
  interview: "Interview Prep",
  ai: "AI Assistant",
  learning: "Learning",
  placement: "Placement Tools",
  coding: "Coding",
  other: "More Features",
};

export default function PremiumPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [features, setFeatures] = useState<CatalogFeature[]>([]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [coupon, setCoupon] = useState<{ code: string; plan?: string } | null>(null);
  const [couponInfo, setCouponInfo] = useState<{ code: string; discountPct: number; finalAmount: number } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPlan, setWizardPlan] = useState<"pro_monthly" | "pro_yearly">("pro_monthly");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const couponPct = couponInfo?.discountPct || 0;

  useEffect(() => {
    const token = localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const stored = localStorage.getItem("adyapan-coupon");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.code) setCoupon({ code: parsed.code, plan: parsed.plan || "pro_monthly" });
      }
    } catch { /* ignore */ }

    (async () => {
      try {
        const [plansRes, featuresRes, overviewRes] = await Promise.all([
          api.get("/subscription/plans"),
          api.get("/subscription/features"),
          api.get("/subscription/overview"),
        ]);
        if (plansRes.data?.success && Array.isArray(plansRes.data.plans)) {
          setPlans(plansRes.data.plans);
        }
        if (featuresRes.data?.success && Array.isArray(featuresRes.data.features)) {
          setFeatures(featuresRes.data.features);
        }
        if (overviewRes.data?.success) {
          setOverview({
            subscription: overviewRes.data.subscription ?? null,
            usage: overviewRes.data.usage ?? null,
            featureUsage: overviewRes.data.featureUsage ?? [],
          });
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Validate stored coupon and show its discount.
  useEffect(() => {
    if (!coupon?.code) return;
    api.post("/payment/coupon/apply", { code: coupon.code, plan: coupon.plan || "pro_monthly" })
      .then((res) => {
        if (res.data?.success) {
          const d = res.data.coupon;
          setCouponInfo({ code: d.code, discountPct: d.discountPct, finalAmount: d.finalAmount });
        }
      })
      .catch(() => { /* coupon may be expired; ignore */ });
  }, [coupon]);

  const proMonthly = useMemo(() => plans.find((p) => p.code === "pro_monthly"), [plans]);
  const proYearly = useMemo(() => plans.find((p) => p.code === "pro_yearly"), [plans]);
  const monthlyPrice = proMonthly?.priceMonthly ?? 199;
  const yearlyPrice = proYearly?.priceYearly ?? proMonthly?.priceYearly ?? 1999;

  const basePrice = cycle === "yearly" ? yearlyPrice : monthlyPrice;
  const discountedPrice = couponPct > 0 ? Math.round(basePrice * (1 - couponPct / 100)) : basePrice;

  const groupedFeatures = useMemo(() => {
    const map: Record<string, CatalogFeature[]> = {};
    for (const f of features) {
      const cat = f.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(f);
    }
    return map;
  }, [features]);

  const catEntries = Object.entries(groupedFeatures).sort(
    (a, b) => (a[1][0]?.requiredPlan === "free" ? 1 : 0) - (b[1][0]?.requiredPlan === "free" ? 1 : 0)
  );

  const sub = overview?.subscription;
  const isPro = Boolean(sub?.isActive);
  const usage = overview?.usage;

  const openWizard = (plan: "pro_monthly" | "pro_yearly") => {
    setWizardPlan(plan);
    setWizardOpen(true);
  };

  const handleWizardComplete = useCallback(() => {
    api.get("/subscription/overview").then((res) => {
      if (res.data?.success) {
        setOverview({
          subscription: res.data.subscription ?? null,
          usage: res.data.usage ?? null,
          featureUsage: res.data.featureUsage ?? [],
        });
      }
    }).catch(() => {});
    localStorage.removeItem("adyapan-coupon");
    setCoupon(null);
    setCouponInfo(null);
  }, []);

  const colors = {
    bg: isDark ? "#080710" : "#f8fafc",
    text: isDark ? "#ffffff" : "#0f172a",
    subtext: isDark ? "rgba(255,255,255,0.6)" : "#475569",
    subtextMuted: isDark ? "rgba(255,255,255,0.4)" : "#64748b",
    headerBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    backBtnBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    backBtnBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    cardPopularBg: isDark
      ? "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))"
      : "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(254,243,199,0.6))",
    cardPopularBorder: isDark ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(245,158,11,0.4)",
    cardPopularShadow: isDark ? "0 0 40px rgba(245,158,11,0.1)" : "0 10px 30px rgba(245,158,11,0.12)",
    cardDefaultBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.85)",
    cardDefaultBorder: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    cardDefaultShadow: isDark ? "none" : "0 4px 20px rgba(0,0,0,0.03)",
    featureText: isDark ? "rgba(255,255,255,0.8)" : "#334155",
    missingFeatureText: isDark ? "rgba(255,255,255,0.25)" : "#94a3b8",
    badgeProBg: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.12)",
    badgeProText: isDark ? "#f59e0b" : "#d97706",
    badgeProBorder: isDark ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(245,158,11,0.3)",
    badgeFreeBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    badgeFreeText: isDark ? "rgba(255,255,255,0.4)" : "#64748b",
    badgeFreeBorder: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    upgradeBtnStandardBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    upgradeBtnStandardText: isDark ? "#ffffff" : "#0f172a",
    upgradeBtnStandardBorder: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
    gridCardBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
    gridCardBorder: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    itemCardBg: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
    itemCardBorder: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
    itemDesc: isDark ? "rgba(255,255,255,0.5)" : "#64748b",
    testNoticeBg: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.1)",
    testNoticeText: isDark ? "#f59e0b" : "#b45309",
    testNoticeBorder: isDark ? "1px solid rgba(245,158,11,0.15)" : "1px solid rgba(245,158,11,0.25)",
    cycleToggleBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    cycleToggleBorder: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ background: colors.bg }}>
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const freePlanFeatures = [
    "50 AI Requests / day",
    "5 Resume Generations / day",
    "Basic AI Chat",
    "3 Cover Letters / month",
    "Basic ATS Check",
    "Community Support",
  ];
  const proPlanFeatures = proMonthly?.features?.length
    ? proMonthly.features
    : [
        "Unlimited Resumes & ATS Checks",
        "All AI Models (GPT-4o, Claude, Gemini)",
        "Unlimited Cover Letters & LinkedIn Tools",
        "Full Interview & Coding Hub Access",
        "Ady Chat with file uploads",
        "Priority Support",
      ];
  const enterpriseFeatures = [
    "University / Institute License",
    "Custom AI Model Access",
    "SSO / SAML Login",
    "Bulk Student Onboarding",
    "Dedicated Success Manager",
  ];

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300" style={{ background: colors.bg, color: colors.text }}>
      <FloatingOrbs />

      {/* Nav */}
      <header className="relative z-10 flex items-center gap-3 px-6 py-4 border-b transition-colors duration-300" style={{ borderColor: colors.headerBorder }}>
        <button
          onClick={() => router.push("/dashboard/user")}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          style={{ background: colors.backBtnBg, border: `1px solid ${colors.backBtnBorder}`, color: colors.text }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 font-bold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
          <Crown className="w-5 h-5 text-amber-500" />
          Premium
        </div>
        <div className="flex-1" />
        {isPro && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: colors.badgeProBg, color: colors.badgeProText, border: colors.badgeProBorder }}>
            <Sparkles className="w-3.5 h-3.5" />
            {sub?.plan?.includes("yearly") ? "Pro Yearly" : sub?.plan === "enterprise" ? "Enterprise" : "Pro Premium"} Active
          </div>
        )}
      </header>

      {/* Hero */}
      <div className="relative z-10 text-center py-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Crown className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl font-extrabold mb-3" style={{ fontFamily: "var(--font-display), sans-serif" }}>
            Unlock <span style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Premium</span>
          </h1>
          <p className="text-sm max-w-lg mx-auto transition-colors duration-300" style={{ color: colors.subtext }}>
            Get unlimited access to all AI features, premium models, and advanced tools to accelerate your career.
          </p>
        </motion.div>
      </div>

      {/* Billing cycle toggle */}
      <div className="relative z-10 flex justify-center mb-8">
        <div className="inline-flex items-center rounded-2xl p-1 gap-1" style={{ background: colors.cycleToggleBg, border: colors.cycleToggleBorder }}>
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className="px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
              style={{
                background: cycle === c ? "linear-gradient(135deg, #f59e0b, #d97706)" : "transparent",
                color: cycle === c ? "#000" : colors.subtext,
              }}
            >
              {c === "monthly" ? "Monthly" : "Yearly"}
              {c === "yearly" && (
                <span className={`ml-1.5 text-[9px] font-bold ${cycle === c ? "text-black/70" : "text-emerald-500"}`}>
                  Save 16%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-20">
        {couponInfo && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold"
            style={{ background: colors.badgeProBg, color: colors.badgeProText, border: colors.badgeProBorder }}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="flex-1">
              Coupon <span className="underline">{couponInfo.code}</span> applied — {couponInfo.discountPct}% discount will be deducted at checkout.
            </span>
            <button
              onClick={() => { localStorage.removeItem("adyapan-coupon"); setCoupon(null); setCouponInfo(null); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors hover:bg-amber-500 hover:text-black"
            >
              Remove
            </button>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            className="relative rounded-2xl p-6 flex flex-col backdrop-blur-md transition-all duration-300"
            style={{ background: colors.cardDefaultBg, border: colors.cardDefaultBorder, boxShadow: colors.cardDefaultShadow }}
          >
            <div className="mb-5">
              <h3 className="text-lg font-extrabold mb-1" style={{ color: "#64748b" }}>Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold" style={{ color: colors.text }}>₹0</span>
                <span style={{ color: colors.subtextMuted }}>/forever</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 mb-6">
              {freePlanFeatures.map((f, j) => (
                <div key={j} className="flex items-start gap-2 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span style={{ color: colors.featureText }}>{f}</span>
                </div>
              ))}
              {["Premium AI Models", "Unlimited Cover Letters", "Advanced ATS Analysis", "Interview Hub"].map((f, j) => (
                <div key={j} className="flex items-start gap-2 text-xs" style={{ color: colors.missingFeatureText }}>
                  <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <div className="w-full py-3 rounded-xl text-center text-xs font-bold transition-colors"
              style={{ background: !isPro ? colors.badgeProBg : colors.badgeFreeBg, color: !isPro ? colors.badgeProText : colors.badgeFreeText, border: !isPro ? colors.badgeProBorder : colors.badgeFreeBorder }}>
              {!isPro ? "Current Plan" : "Downgrade"}
            </div>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="relative rounded-2xl p-6 flex flex-col backdrop-blur-md transition-all duration-300"
            style={{ background: colors.cardPopularBg, border: colors.cardPopularBorder, boxShadow: colors.cardPopularShadow }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold shadow-md"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
              <Star className="w-3 h-3 inline mr-1" />Most Popular
            </div>
            <div className="mb-5">
              <h3 className="text-lg font-extrabold mb-1" style={{ color: "#f59e0b" }}>Pro</h3>
              <div className="flex items-baseline gap-1">
                {couponPct > 0 && (
                  <span className="text-base font-bold line-through" style={{ color: colors.subtextMuted }}>₹{basePrice}</span>
                )}
                <span className="text-4xl font-extrabold" style={{ color: colors.text }}>₹{discountedPrice}</span>
                <span style={{ color: colors.subtextMuted }}>{cycle === "monthly" ? "/mo" : "/yr"}</span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: colors.subtextMuted }}>
                {cycle === "yearly" ? `Billed ₹${yearlyPrice.toLocaleString("en-IN")}/year (₹${Math.round(yearlyPrice / 12)}/mo)` : "Billed every month"}
              </div>
              {couponPct > 0 && (
                <div className="text-[10px] mt-1 font-bold text-emerald-500">{couponInfo?.code} applied — {couponPct}% off</div>
              )}
            </div>
            <div className="flex-1 space-y-2 mb-6">
              {proPlanFeatures.map((f, j) => (
                <div key={j} className="flex items-start gap-2 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span style={{ color: colors.featureText }}>{f}</span>
                </div>
              ))}
            </div>
            {isPro ? (
              <button
                onClick={() => {
                  window.location.href = "/dashboard/user?view=billing";
                }}
                className="w-full py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer hover:shadow-lg"
                style={{ background: colors.badgeProBg, color: colors.badgeProText, border: colors.badgeProBorder }}
              >
                Manage Subscription
              </button>
            ) : (
              <button
                onClick={() => openWizard(cycle === "yearly" ? "pro_yearly" : "pro_monthly")}
                className="w-full py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "none" }}
              >
                Upgrade to Pro
              </button>
            )}
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="relative rounded-2xl p-6 flex flex-col backdrop-blur-md transition-all duration-300"
            style={{ background: colors.cardDefaultBg, border: colors.cardDefaultBorder, boxShadow: colors.cardDefaultShadow }}
          >
            <div className="mb-5">
              <h3 className="text-lg font-extrabold mb-1" style={{ color: "#8b5cf6" }}>Enterprise</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold" style={{ color: colors.text }}>Custom</span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: colors.subtextMuted }}>For institutes & teams</div>
            </div>
            <div className="flex-1 space-y-2 mb-6">
              {enterpriseFeatures.map((f, j) => (
                <div key={j} className="flex items-start gap-2 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span style={{ color: colors.featureText }}>{f}</span>
                </div>
              ))}
            </div>
            <a
              href="mailto:sales@adyapan.ai?subject=Enterprise%20Plan%20Enquiry"
              className="w-full py-3 rounded-xl text-center text-xs font-extrabold transition-all cursor-pointer hover:shadow-lg"
              style={{ background: colors.upgradeBtnStandardBg, color: colors.upgradeBtnStandardText, border: colors.upgradeBtnStandardBorder, display: "block" }}
            >
              Contact Sales
            </a>
          </motion.div>
        </div>



        {/* Categorized feature comparison */}
        {catEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mt-10 rounded-2xl p-8 backdrop-blur-md transition-colors duration-300"
            style={{ background: colors.gridCardBg, border: colors.gridCardBorder }}
          >
            <h2 className="text-xl font-extrabold mb-6 flex items-center gap-2" style={{ color: colors.text }}>
              <Zap className="w-5 h-5 text-amber-500" />
              Everything in Premium
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catEntries.map(([cat, list]) => {
                const expanded = expandedCat === cat;
                const visible = expanded ? list : list.slice(0, 4);
                const label = CATEGORY_LABELS[cat] || cat;
                const premiumCount = list.filter((f) => f.requiredPlan !== "free").length;
                return (
                  <div key={cat} className="flex flex-col p-4 rounded-xl transition-colors duration-300"
                    style={{ background: colors.itemCardBg, border: colors.itemCardBorder }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold" style={{ color: colors.text }}>{label}</span>
                      {premiumCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: colors.badgeProBg, color: colors.badgeProText, border: colors.badgeProBorder }}>
                          {premiumCount} Premium
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      {visible.map((f) => (
                        <div key={f.featureKey} className="flex items-start gap-2 text-xs">
                          {f.requiredPlan === "free" ? (
                            <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <BadgeCheck className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <span className="block" style={{ color: colors.featureText }}>{f.name}</span>
                            {f.description && (
                              <span className="block text-[10px]" style={{ color: colors.itemDesc }}>{f.description}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {list.length > 4 && (
                      <button
                        onClick={() => setExpandedCat(expanded ? null : cat)}
                        className="mt-3 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        style={{ color: colors.badgeProText }}
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        {expanded ? "Show less" : `Show all ${list.length} features`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>

      <PremiumSetupWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
        initialPlan={wizardPlan}
        initialCoupon={coupon?.code}
      />
    </div>
  );
}
