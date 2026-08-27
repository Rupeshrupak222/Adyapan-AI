"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, X, Check, ArrowLeft, ArrowRight, Loader2, Sparkles,
  CreditCard, Zap, Shield, Star, Wallet, Calendar,
  BadgePercent, Lock, CircleCheck, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { PremiumProgressBar } from "@/components/ui/PremiumComponents";
import { useUsageStore } from "@/store/usage-store";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

interface PlanRow {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  category?: string;
  recommended?: boolean;
}

interface ProviderRow {
  provider: string;
  configured: boolean;
}

interface CouponInfo {
  code: string;
  discountPct: number;
  discountAmount: number;
  finalAmount: number;
  plan: string;
  planLabel: string;
}

interface OrderInfo {
  provider: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  key?: string;
  clientSecret?: string;
  approvalUrl?: string;
}

interface RazorpayOptions {
  key?: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  order_id?: string;
  prefill?: { name?: string; email?: string };
  handler?: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

type RazorpayConstructor = new (options: RazorpayOptions) => { open: () => void };

interface RazorpayGlobal {
  Razorpay?: RazorpayConstructor;
}

const STEPS = ["Plan", "Billing Cycle", "Payment", "Review", "Done"];

function inr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const w = window as unknown as RazorpayGlobal;
    if (w.Razorpay) {
      resolve(true);
      return;
    }
    if (document.getElementById("rzp-checkout-js")) {
      const check = setInterval(() => {
        if (w.Razorpay) {
          clearInterval(check);
          resolve(true);
        }
      }, 200);
      setTimeout(() => {
        clearInterval(check);
        resolve(Boolean(w.Razorpay));
      }, 6000);
      return;
    }
    const script = document.createElement("script");
    script.id = "rzp-checkout-js";
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PremiumSetupWizard({
  open,
  onClose,
  onComplete,
  initialPlan = "pro_monthly",
  initialCoupon,
}: {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  initialPlan?: string;
  initialCoupon?: string | null;
}) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [step, setStep] = useState(1);
  const [planCode, setPlanCode] = useState(initialPlan);
  const [cycle, setCycle] = useState<"monthly" | "yearly">(initialPlan.includes("yearly") ? "yearly" : "monthly");
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState<CouponInfo | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [provider, setProvider] = useState<string>("");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<{ plan: string; expiresAt: string | null } | null>(null);

  const userRef = useRef<{ name?: string; email?: string } | null>(null);
  const couponAttemptedRef = useRef(false);

  // Reset state each time the modal opens
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPlanCode(initialPlan);
    setCycle(initialPlan.includes("yearly") ? "yearly" : "monthly");
    setCouponCode(initialCoupon || "");
    setCouponInfo(null);
    setOrder(null);
    setDone(null);
    setProcessing(false);
    couponAttemptedRef.current = false;
    try {
      userRef.current = JSON.parse(
        localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user") || "{}"
      );
    } catch {
      userRef.current = null;
    }
  }, [open, initialPlan, initialCoupon]);

  // Fetch plans + providers once when opened
  useEffect(() => {
    if (!open) return;
    setLoadingPlans(true);
    api
      .get("/subscription/plans")
      .then((res) => {
        if (res.data?.success) {
          const rows: PlanRow[] = Array.isArray(res.data.plans) ? res.data.plans : [];
          setPlans(rows);
          const provs: ProviderRow[] = Array.isArray(res.data.providers) ? res.data.providers : [];
          setProviders(provs);
          const configured = provs.filter((p) => p.configured);
          const ordered = ["razorpay", "stripe", "paypal", "mock"];
          const preferred = ordered.find((n) => configured.some((p) => p.provider === n));
          setProvider(preferred || configured[0]?.provider || "mock");
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, [open]);

  // Reset coupon preview when plan/cycle changes
  useEffect(() => {
    setCouponInfo(null);
    setOrder(null);
  }, [planCode, cycle]);

  const proMonthly = useMemo(() => plans.find((p) => p.code === "pro_monthly") || null, [plans]);
  const proYearly = useMemo(() => plans.find((p) => p.code === "pro_yearly") || null, [plans]);

  const monthlyPrice = proMonthly ? proMonthly.priceMonthly : 199;
  const yearlyPrice = proYearly ? proYearly.priceYearly : 1999;
  const selectedPlanName = cycle === "yearly" ? (proYearly?.name || "Pro Yearly") : (proMonthly?.name || "Pro Monthly");
  const monthlyInPaise = Math.round(monthlyPrice * 100);
  const yearlyInPaise = Math.round(yearlyPrice * 100);

  const availableProviders = useMemo(
    () =>
      providers.filter((p) => p.configured).map((p) => p.provider),
    [providers]
  );

  const handleApplyCoupon = useCallback(async () => {
    const code = couponCode.trim();
    if (!code) {
      toast.error("Enter a coupon code first.");
      return;
    }
    setCouponBusy(true);
    try {
      const res = await api.post("/payment/coupon/apply", {
        code,
        plan: cycle === "yearly" ? "pro_yearly" : "pro_monthly",
      });
      if (res.data?.success) {
        setCouponInfo(res.data.coupon as CouponInfo);
        toast.success(`Coupon ${code} applied — ${res.data.coupon.discountPct}% off`);
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Invalid coupon code.";
      toast.error(msg);
    } finally {
      setCouponBusy(false);
    }
  }, [couponCode, cycle]);

  // Auto-validate a prefilled coupon (once per open)
  useEffect(() => {
    if (!open || couponAttemptedRef.current) return;
    if (!couponCode || couponInfo) return;
    couponAttemptedRef.current = true;
    handleApplyCoupon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, couponCode, couponInfo]);

  const totalPaise = useMemo(() => {
    const base = cycle === "yearly" ? yearlyInPaise : monthlyInPaise;
    if (couponInfo && couponInfo.finalAmount >= 0) {
      // Server computed final amount for the selected plan
      const matches = (couponInfo.plan || "").includes(cycle === "yearly" ? "yearly" : "monthly");
      return matches ? couponInfo.finalAmount : Math.max(0, base - couponInfo.discountAmount);
    }
    return base;
  }, [cycle, yearlyInPaise, monthlyInPaise, couponInfo]);

  const verifyOrder = useCallback(
    async (o: OrderInfo, paymentId: string, signature: string) => {
      const verifyRes = await api.post("/subscription/verify", {
        orderId: o.providerOrderId,
        paymentId,
        signature,
        provider: o.provider,
      });
      if (verifyRes.data?.success) {
        setDone({ plan: verifyRes.data.plan, expiresAt: verifyRes.data.expiresAt || null });
        setStep(5);
        useUsageStore.getState().fetchUsage().catch(() => {});
        onComplete?.();
        return true;
      }
      throw new Error(verifyRes.data?.message || "Payment verification failed");
    },
    [onComplete]
  );

  const handlePay = async () => {
    if (processing) return;
    if (!planCode) {
      toast.error("Select a plan first.");
      return;
    }
    setProcessing(true);
    try {
      const checkoutRes = await api.post("/subscription/checkout", {
        plan: cycle === "yearly" ? "pro_yearly" : "pro_monthly",
        billingCycle: cycle,
        provider: provider || undefined,
        couponCode: couponInfo?.code || undefined,
      });
      if (!checkoutRes.data?.success) throw new Error("Failed to create order");
      const o = checkoutRes.data.order as OrderInfo;
      setOrder(o);

      if (o.provider === "mock") {
        await verifyOrder(o, `pay_mock_${Date.now()}`, `sig_mock_${Date.now()}`);
      } else if (o.provider === "razorpay") {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Razorpay checkout failed to load");
        const w = window as unknown as RazorpayGlobal;
        const options: RazorpayOptions = {
          key: o.key,
          amount: o.amount,
          currency: o.currency,
          name: "Adyapan AI",
          description: `${selectedPlanName} ${cycle} subscription`,
          order_id: o.providerOrderId,
          prefill: {
            name: userRef.current?.name || "",
            email: userRef.current?.email || "",
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await verifyOrder(
                { ...o, providerOrderId: response.razorpay_order_id },
                response.razorpay_payment_id,
                response.razorpay_signature
              );
            } catch (err) {
              toast.error((err as Error).message || "Payment verification failed");
            } finally {
              setProcessing(false);
            }
          },
          modal: {
            ondismiss: () => setProcessing(false),
          },
        };
        const rzp = new w.Razorpay!(options);
        rzp.open();
      } else if (o.provider === "paypal" && o.approvalUrl) {
        window.open(o.approvalUrl, "_blank", "noopener,noreferrer");
        setStep(4);
        toast.info("Complete payment in the new window, then click Verify Payment.");
      } else if (o.provider === "stripe") {
        setStep(4);
        toast.info("Stripe checkout requires a redirect.");
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        "Failed to initiate payment";
      toast.error(msg);
    } finally {
      if (order?.provider !== "razorpay") setProcessing(false);
    }
  };

  const canNext =
    step === 1 ? Boolean(planCode)
      : step === 2 ? true
      : step === 3 ? Boolean(provider)
      : true;

  const switchPlanCode = (code: string) => {
    setPlanCode(code);
    setCycle(code.includes("yearly") ? "yearly" : "monthly");
  };

  const toggleCycle = (c: "monthly" | "yearly") => {
    setCycle(c);
    setPlanCode(c === "yearly" ? "pro_yearly" : "pro_monthly");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur-[8px]"
          onClick={() => !processing && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d16] shadow-2xl backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-amber-500/15 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-orange-500/15 blur-[90px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

            {/* Header */}
            <div className="relative px-7 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.35)]">
                    <Crown className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-gray-50">
                      Premium Setup
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 dark:text-gray-400">
                      {STEPS[step - 1]} · Step {step} of 5
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !processing && onClose()}
                  disabled={processing}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-100 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stepper */}
              <div className="mt-5">
                <div className="flex items-center gap-1.5">
                  {STEPS.map((label, i) => {
                    const idx = i + 1;
                    const isActive = idx === step;
                    const isDone = idx < step;
                    return (
                      <div key={label} className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${
                              isDone
                                ? "bg-emerald-500 text-black shadow-sm"
                                : isActive
                                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400 border border-slate-300 dark:border-white/10"
                            }`}
                          >
                            {isDone ? <Check size={12} strokeWidth={3} /> : idx}
                          </div>
                          <div
                            className={`hidden sm:block text-[9px] font-black uppercase tracking-wider ${
                              isActive
                                ? "text-amber-500"
                                : isDone
                                  ? "text-emerald-500"
                                  : "text-slate-600 dark:text-gray-400"
                            }`}
                          >
                            {label}
                          </div>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`h-[2px] mt-1 rounded-full ${
                              isDone ? "bg-emerald-500/80" : "bg-slate-200 dark:bg-white/10"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <PremiumProgressBar value={((step - 1) / (STEPS.length - 1)) * 100} color="amber" height={3} />
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="relative px-7 pb-6 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {loadingPlans && plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-gray-400">Loading plans...</span>
                </div>
              ) : (
                <>
                  {/* STEP 1 — Plan */}
                  {step === 1 && (
                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                      {[
                        {
                          code: "pro_monthly",
                          name: "Pro Monthly",
                          tagline: "Full access · billed monthly",
                          price: monthlyPrice,
                          period: "/mo",
                          icon: <Zap className="w-4 h-4" />,
                        },
                        {
                          code: "pro_yearly",
                          name: "Pro Yearly",
                          tagline: "2 months free · save 16%",
                          price: yearlyPrice,
                          period: "/yr",
                          icon: <Star className="w-4 h-4" />,
                          popular: true,
                        },
                      ].map((p) => {
                        const selected = planCode === p.code;
                        return (
                          <button
                            key={p.code}
                            onClick={() => switchPlanCode(p.code)}
                            className={`relative rounded-2xl p-5 text-left border transition-all cursor-pointer ${
                              selected
                                ? "border-2 border-amber-500 bg-amber-500/[0.08] shadow-[0_4px_24px_rgba(245,158,11,0.18)] dark:bg-amber-500/[0.1]"
                                : "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/[0.02]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-8.5 h-8.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                                {p.icon}
                              </div>
                              <div className="flex items-center gap-2">
                                {p.popular && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm">
                                    Best Value
                                  </span>
                                )}
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    selected ? "border-amber-500 bg-amber-500" : "border-slate-300 dark:border-white/30"
                                  }`}
                                >
                                  {selected && <span className="w-2 h-2 rounded-full bg-black" />}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm font-black text-slate-900 dark:text-gray-50">{p.name}</div>
                            <div className="text-[11px] font-semibold text-slate-600 dark:text-gray-400 mt-0.5">{p.tagline}</div>
                            <div className="mt-4 flex items-baseline gap-1">
                              <span className="text-2.5xl font-black text-slate-900 dark:text-white">₹{p.price}</span>
                              <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400">{p.period}</span>
                            </div>
                          </button>
                        );
                      })}
                      <div className="sm:col-span-2 rounded-2xl p-4 flex items-start gap-3 bg-amber-500/[0.06] border border-amber-500/20 text-xs leading-relaxed text-slate-700 dark:text-gray-300 mt-1">
                        <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          All premium plans include <strong>30 monthly uses on standard AI tools</strong>, <strong>9 monthly uses on advanced tools</strong>, all AI models (GPT-4o, Claude, Gemini), full Interview & Coding Hub, and priority support. Cancel anytime.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 — Billing cycle + coupon */}
                  {step === 2 && (
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        {(["monthly", "yearly"] as const).map((c) => {
                          const active = cycle === c;
                          const price = c === "monthly" ? monthlyPrice : yearlyPrice;
                          const perMonth = c === "yearly" ? (yearlyPrice / 12).toFixed(0) : null;
                          return (
                            <button
                              key={c}
                              onClick={() => toggleCycle(c)}
                              className={`relative rounded-2xl p-5 text-left border transition-all cursor-pointer ${
                                active
                                  ? "border-2 border-amber-500 bg-amber-500/[0.08] shadow-[0_4px_24px_rgba(245,158,11,0.18)] dark:bg-amber-500/[0.1]"
                                  : "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/[0.02]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className={`w-4.5 h-4.5 ${active ? "text-amber-500" : "text-slate-500"}`} />
                                  <span className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-gray-100">
                                    {c === "monthly" ? "Monthly" : "Yearly"}
                                  </span>
                                </div>
                                {c === "yearly" && (
                                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-500 text-black">
                                    2 months free
                                  </span>
                                )}
                              </div>
                              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                                ₹{price}
                                <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400">/{c === "monthly" ? "mo" : "yr"}</span>
                              </div>
                              <div className="text-[11px] font-semibold text-slate-600 dark:text-gray-400 mt-1">
                                {c === "yearly" && perMonth ? `≈ ₹${perMonth}/month · Save ₹${monthlyPrice * 12 - yearlyPrice}` : "Billed every month"}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Coupon */}
                      <div className="rounded-2xl p-4 border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-2.5">
                          <BadgePercent className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-black text-slate-900 dark:text-gray-100">Coupon Code</span>
                        </div>
                        {couponInfo ? (
                          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold"
                            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                            <span className="flex items-center gap-2">
                              <CircleCheck size={14} /> {couponInfo.code} — {couponInfo.discountPct}% off
                            </span>
                            <button onClick={() => { setCouponInfo(null); setCouponCode(""); }} className="text-[11px] underline cursor-pointer text-rose-500 font-extrabold">
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              placeholder="e.g. ADYAPAN20"
                              className="flex-1 px-3.5 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] outline-none focus:border-amber-500 transition-colors text-slate-900 dark:text-gray-100 font-semibold"
                            />
                            <button
                              onClick={handleApplyCoupon}
                              disabled={couponBusy}
                              className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-black cursor-pointer transition-all disabled:opacity-50 shadow-sm"
                            >
                              {couponBusy ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                            </button>
                          </div>
                        )}
                        {couponInfo && couponInfo.discountAmount > 0 && (
                          <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            You save {inr(couponInfo.discountAmount)} on {couponInfo.planLabel}.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 3 — Payment method */}
                  {step === 3 && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-gray-100">
                        <CreditCard className="w-4 h-4 text-amber-500" /> Select Payment Method
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {availableProviders.map((pname) => {
                          const active = provider === pname;
                          const meta: Record<string, { label: string; hint: string; icon: React.ReactNode }> = {
                            razorpay: { label: "Razorpay", hint: "UPI · Cards · NetBanking · Wallets", icon: <Wallet className="w-4 h-4" /> },
                            stripe: { label: "Stripe", hint: "Cards · Apple/Google Pay", icon: <CreditCard className="w-4 h-4" /> },
                            paypal: { label: "PayPal", hint: "PayPal balance · Cards", icon: <Zap className="w-4 h-4" /> },
                          };
                          const m = meta[pname] || { label: pname, hint: "", icon: <CreditCard className="w-4 h-4" /> };
                          return (
                            <button
                              key={pname}
                              onClick={() => setProvider(pname)}
                              className={`rounded-2xl p-4.5 text-left border transition-all cursor-pointer ${
                                active
                                  ? "border-2 border-amber-500 bg-amber-500/[0.08] shadow-[0_4px_24px_rgba(245,158,11,0.18)] dark:bg-amber-500/[0.1]"
                                  : "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/[0.02]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="w-8.5 h-8.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                                  {m.icon}
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-amber-500 bg-amber-500" : "border-slate-300 dark:border-white/30"}`}>
                                  {active && <span className="w-2 h-2 rounded-full bg-black" />}
                                </div>
                              </div>
                              <div className="text-xs font-black text-slate-900 dark:text-gray-100">{m.label}</div>
                              <div className="text-[11px] font-semibold text-slate-600 dark:text-gray-400 mt-0.5">{m.hint}</div>
                            </button>
                          );
                        })}
                      </div>
                      {provider === "razorpay" && (
                        <div className="rounded-2xl p-3.5 bg-sky-500/[0.08] border border-sky-500/25 text-xs text-sky-700 dark:text-sky-400 flex items-start gap-2.5 font-medium">
                          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                          A secure Razorpay checkout gateway will open to complete your instant payment.
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4 — Review */}
                  {step === 4 && (
                    <div className="space-y-3 pt-1">
                      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] divide-y divide-slate-200 dark:divide-white/5">
                        <div className="flex items-center justify-between p-4 text-xs font-semibold">
                          <span className="text-slate-600 dark:text-gray-400">Plan</span>
                          <span className="font-extrabold text-slate-900 dark:text-gray-100">{selectedPlanName}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 text-xs font-semibold">
                          <span className="text-slate-600 dark:text-gray-400">Billing cycle</span>
                          <span className="font-extrabold text-slate-900 dark:text-gray-100 capitalize">{cycle}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 text-xs font-semibold">
                          <span className="text-slate-600 dark:text-gray-400">Subtotal</span>
                          <span className="font-extrabold text-slate-900 dark:text-gray-100">{inr(cycle === "yearly" ? yearlyInPaise : monthlyInPaise)}</span>
                        </div>
                        {couponInfo && couponInfo.discountAmount > 0 && (
                          <div className="flex items-center justify-between p-4 text-xs font-semibold">
                            <span className="text-slate-600 dark:text-gray-400 flex items-center gap-1.5">
                              <BadgePercent className="w-4 h-4 text-emerald-500" /> Coupon {couponInfo.code}
                            </span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">−{inr(couponInfo.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-4">
                          <span className="text-xs font-black text-slate-900 dark:text-gray-100">Total</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{inr(totalPaise)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-gray-400 px-1">
                        <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        Payments are processed securely via {provider === "mock" ? "simulated gateway" : provider}. GST invoice generated automatically.
                      </div>
                      {order?.provider === "paypal" && (
                        <button
                          onClick={() => order && verifyOrder(order, order.providerOrderId, `sig_${Date.now()}`)}
                          disabled={processing}
                          className="w-full py-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-black cursor-pointer transition-all disabled:opacity-50 shadow-md"
                        >
                          {processing ? <Loader2 size={14} className="animate-spin mx-auto" /> : "I completed payment — Verify"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* STEP 5 — Confirmation */}
                  {step === 5 && done && (
                    <div className="flex flex-col items-center text-center py-6">
                      <motion.div
                        initial={{ scale: 0.3, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 280, damping: 16 }}
                        className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 mb-5 shadow-[0_0_24px_rgba(16,185,129,0.3)]"
                      >
                        <CircleCheck size={32} strokeWidth={2.5} />
                      </motion.div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-gray-50">You&apos;re on Premium!</h3>
                      <p className="text-xs font-medium text-slate-600 dark:text-gray-300 mt-2 max-w-xs leading-relaxed">
                        Your <span className="font-extrabold text-amber-500">{done.plan}</span> subscription is now active.
                        {done.expiresAt
                          ? ` Access continues until ${new Date(done.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`
                          : " Higher limits and premium models are now ready."}
                      </p>
                      <div className="mt-6 w-full grid grid-cols-1 gap-2.5">
                        {[
                          "Up to 30 monthly attempts on standard AI tools",
                          "Up to 9 monthly attempts on advanced tools",
                          "All AI models (GPT-4o, Claude, Gemini)",
                          "Full Interview & Coding Hub",
                          "Priority support",
                        ].map((perk) => (
                          <div key={perk} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-gray-200">
                            <span className="w-4.5 h-4.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                              <Check size={11} strokeWidth={3} />
                            </span>
                            {perk}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {step < 5 && (
              <div className="relative px-7 pb-6 pt-2 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 mt-1">
                <button
                  onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-gray-200 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 cursor-pointer transition-all disabled:opacity-40"
                >
                  <ArrowLeft size={14} /> {step === 1 ? "Cancel" : "Back"}
                </button>
                {step === 4 && order?.provider !== "paypal" ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePay}
                    disabled={processing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.5)] cursor-pointer transition-all disabled:opacity-50"
                  >
                    {processing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    {processing ? "Processing..." : `Pay ${inr(totalPaise)}`}
                  </motion.button>
                ) : step < 4 ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canNext || processing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.5)] cursor-pointer transition-all disabled:opacity-50"
                  >
                    Continue <ArrowRight size={14} />
                  </motion.button>
                ) : null}
              </div>
            )}

            {step === 5 && (
              <div className="relative px-7 pb-6 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onComplete?.(); onClose(); }}
                  className="w-full py-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black shadow-[0_4px_20px_rgba(245,158,11,0.35)] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 inline mr-1.5" />
                  Explore Your Premium Access
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
