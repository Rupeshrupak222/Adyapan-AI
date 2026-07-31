"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Crown, Check, X, ArrowLeft, Sparkles, Zap,
  Shield, Loader2, Star, ChevronDown,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { FloatingOrbs } from "@/components/ui/PremiumComponents";

interface SubscriptionStatus {
  plan: string;
  status: string;
  endDate: string | null;
  razorpaySubscriptionId: string | null;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "",
    color: "#64748b",
    features: [
      "1 Resume",
      "Basic AI Chat",
      "3 Cover Letters/mo",
      "Basic ATS Check",
      "Study Assistant",
    ],
    missing: [
      "Premium AI Models",
      "Unlimited Cover Letters",
      "Advanced ATS Analysis",
      "Interview Hub",
      "Priority Support",
    ],
  },
  {
    id: "pro_monthly",
    name: "Pro Monthly",
    price: 199,
    period: "/mo",
    popular: true,
    color: "#f59e0b",
    features: [
      "Unlimited Resumes",
      "All AI Models (GPT-4o, Claude, Gemini)",
      "Unlimited Cover Letters",
      "Advanced ATS Checker",
      "Full Interview Hub",
      "Ady Chat with file uploads",
      "Coding Hub (DSA, Challenges)",
      "Priority Support",
    ],
    missing: [],
    yearlyNote: "Billed ₹199/month",
  },
  {
    id: "pro_yearly",
    name: "Pro Yearly",
    price: 1999,
    period: "/yr",
    color: "#8b5cf6",
    features: [
      "Everything in Pro Monthly",
      "2 Months Free",
      "Early Access to New Features",
      "Premium Badge",
    ],
    missing: [],
    yearlyNote: "Billed ₹1,999/year (₹166/mo)",
  },
];

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

export default function PremiumPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [user, setUser] = useState<Record<string, any> | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [planPrices, setPlanPrices] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token");
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const u = JSON.parse(localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user") || "{}");
      setUser(u);
    } catch { /* ignore */ }

    api.get("/payment/status").then((res) => {
      if (res.data.success) setSub(res.data.subscription);
    }).catch(() => {}).finally(() => setLoading(false));

    api.get("/payment/plans").then((res) => {
      if (res.data?.success && Array.isArray(res.data.plans)) {
        const map: Record<string, number> = {};
        res.data.plans.forEach((p: { id: string; amount: number }) => {
          map[p.id] = Math.round((p.amount ?? 0) / 100);
        });
        setPlanPrices(map);
      }
    }).catch(() => {});

    // Load Razorpay script
    if (!(window as unknown as Record<string, any>).Razorpay) {
      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT;
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => setRazorpayLoaded(false);
      document.body.appendChild(script);
    } else {
      setRazorpayLoaded(true);
    }
  }, [router]);

  const handleSubscribe = async (planId: string) => {
    if (processing) return;

    setProcessing(planId);
    try {
      const orderRes = await api.post("/payment/create-order", { plan: planId });
      if (!orderRes.data.success) throw new Error("Failed to create order");

      const { order, key } = orderRes.data;

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Adyapan AI",
        description: `${planId === "pro_monthly" ? "Pro Monthly" : "Pro Yearly"} Subscription`,
        order_id: order.id,
        handler: async function (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
          try {
            const verifyRes = await api.post("/payment/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              setSub({
                plan: planId,
                status: "active",
                endDate: null,
                razorpaySubscriptionId: order.id,
              });
              toast.success("Payment successful! Your plan is now active.");
            } else {
              toast.error("Payment verification failed. Please contact support.");
            }
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
          setProcessing(null);
        },
        modal: {
          ondismiss: function () {
            setProcessing(null);
          },
        },
      };

      const rzp = new (window as unknown as { Razorpay: new (options: unknown) => { open: () => void } }).Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to initiate payment");
      setProcessing(null);
    }
  };

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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ background: colors.bg }}>
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const isPro = sub?.status === "active";

  const resolvedPlans = PLANS.map((plan) => ({
    ...plan,
    price: planPrices && planPrices[plan.id] != null ? planPrices[plan.id] : plan.price,
  }));

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
        <div className="flex items-center gap-2 font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <Crown className="w-5 h-5 text-amber-500" />
          Premium
        </div>
        <div className="flex-1" />
        {isPro && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: colors.badgeProBg, color: colors.badgeProText, border: colors.badgeProBorder }}>
            <Sparkles className="w-3.5 h-3.5" />
            {sub?.plan === "pro_yearly" ? "Pro Yearly" : "Pro Monthly"} Active
          </div>
        )}
      </header>

      {/* Hero */}
      <div className="relative z-10 text-center py-16 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Crown className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl font-extrabold mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Unlock <span style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Premium</span>
          </h1>
          <p className="text-sm max-w-lg mx-auto transition-colors duration-300" style={{ color: colors.subtext }}>
            Get unlimited access to all AI features, premium models, and advanced tools to accelerate your career.
          </p>
        </motion.div>
      </div>

      {/* Plans */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          {resolvedPlans.map((plan, i) => {
            const isCurrentPlan = isPro && sub?.plan === plan.id;
            const isFreePlan = plan.id === "free";
            const showUpgradeBtn = !isCurrentPlan && !isFreePlan;
            const showCurrentLabel = isCurrentPlan || (!isPro && isFreePlan);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl p-6 flex flex-col backdrop-blur-md transition-all duration-300"
                style={{
                  background: plan.popular ? colors.cardPopularBg : colors.cardDefaultBg,
                  border: plan.popular ? colors.cardPopularBorder : colors.cardDefaultBorder,
                  boxShadow: plan.popular ? colors.cardPopularShadow : colors.cardDefaultShadow,
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold shadow-md"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                    <Star className="w-3 h-3 inline mr-1" />Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-extrabold mb-1" style={{ color: plan.color }}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold" style={{ color: colors.text }}>₹{plan.price}</span>
                    <span style={{ color: colors.subtextMuted }}>{plan.period}</span>
                  </div>
                  {plan.yearlyNote && (
                    <div className="text-[10px] mt-1" style={{ color: colors.subtextMuted }}>
                      {plan.yearlyNote}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span style={{ color: colors.featureText }}>{f}</span>
                    </div>
                  ))}
                  {plan.missing.map((f, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs" style={{ color: colors.missingFeatureText }}>
                      <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {showCurrentLabel && (
                  <div className="w-full py-3 rounded-xl text-center text-xs font-bold transition-colors"
                    style={{
                      background: isPro ? colors.badgeProBg : colors.badgeFreeBg,
                      color: isPro ? colors.badgeProText : colors.badgeFreeText,
                      border: isPro ? colors.badgeProBorder : colors.badgeFreeBorder,
                    }}>
                    {isPro ? "Current Plan" : "Free Plan"}
                  </div>
                )}

                {showUpgradeBtn && (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={processing !== null}
                    className="w-full py-3 rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 cursor-pointer hover:shadow-lg"
                    style={{
                      background: plan.popular
                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
                        : colors.upgradeBtnStandardBg,
                      color: plan.popular ? "#000" : colors.upgradeBtnStandardText,
                      border: plan.popular ? "none" : colors.upgradeBtnStandardBorder,
                    }}
                  >
                    {processing === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      `Upgrade to ${plan.name.split(" ")[0]}`
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 rounded-2xl p-8 backdrop-blur-md transition-colors duration-300"
          style={{ background: colors.gridCardBg, border: colors.gridCardBorder }}
        >
          <h2 className="text-xl font-extrabold mb-6 flex items-center gap-2" style={{ color: colors.text }}>
            <Zap className="w-5 h-5 text-amber-500" />
            Everything in Premium
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Sparkles className="w-4 h-4" />, title: "All AI Models", desc: "GPT-4o, Claude Sonnet 4, Gemini 2.5, DeepSeek, Llama 3.3, Mistral Large" },
              { icon: <Crown className="w-4 h-4" />, title: "Unlimited Resumes", desc: "Create and manage unlimited professional resumes" },
              { icon: <Shield className="w-4 h-4" />, title: "Advanced ATS", desc: "Deep keyword analysis with personalized optimization" },
              { icon: <Zap className="w-4 h-4" />, title: "Interview Hub", desc: "AI mock interviews with personalized feedback" },
              { icon: <Crown className="w-4 h-4" />, title: "Cover Letters", desc: "Unlimited AI-generated cover letters" },
              { icon: <Sparkles className="w-4 h-4" />, title: "Priority Support", desc: "Get help within 24 hours" },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl transition-colors duration-300"
                style={{ background: colors.itemCardBg, border: colors.itemCardBorder }}>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-500">{feature.icon}</span>
                </div>
                <div>
                  <div className="text-sm font-bold mb-0.5" style={{ color: colors.text }}>{feature.title}</div>
                  <div className="text-xs" style={{ color: colors.itemDesc }}>{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Test Mode Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-colors"
            style={{ background: colors.testNoticeBg, color: colors.testNoticeText, border: colors.testNoticeBorder }}>
            <Shield className="w-3 h-3" />
            Test Mode — Use card 4111 1111 1111 1111 for test payments
          </div>
        </motion.div>
      </div>
    </div>
  );
}

