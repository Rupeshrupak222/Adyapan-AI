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
        toast.info("Stripe checkout requires a redirect — use Mock or Razorpay in development.");
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
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white/80 dark:bg-[#0c0d16]/95 shadow-2xl backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-amber-500/15 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-orange-500/15 blur-[90px]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

            {/* Header */}
            <div className="relative px-7 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.35)]">
                    <Crown className="w-4.5 h-4.5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-gray-50">
                      Premium Setup
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400">
                      {STEPS[step - 1]} · Step {step} of 5
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !processing && onClose()}
                  disabled={processing}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
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
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-all ${
                              isDone
                                ? "bg-emerald-500 text-black"
                                : isActive
                                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                                  : "bg-white/10 text-slate-400 border border-white/10"
                            }`}
                          >
                            {isDone ? <Check size={11} strokeWidth={3} /> : idx}
                          </div>
                          <div
                            className={`hidden sm:block text-[9px] font-bold uppercase tracking-wider ${
                              isActive ? "text-amber-500" : isDone ? "text-emerald-500" : "text-slate-400 dark:text-gray-500"
                            }`}
                          >
                            {label}
                          </div>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`h-[2px] mt-0.5 rounded-full ${isDone ? "bg-emerald-500/50" : "bg-white/10"}`}
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
                  <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">Loading plans...</span>
                </div>
              ) : (
                <>
                  {/* STEP 1 — Plan */}
                  {step === 1 && (
                    <div className="grid sm:grid-cols-2 gap-3">
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
                                ? "border-amber-500/60 bg-amber-500/[0.06] shadow-[0_0_20px_rgba(245,158,11,0.12)]"
                                : "border-white/10 bg-white/60 dark:bg-white/[0.02] hover:border-white/20"
                            }`}
                          >
                            {p.popular && (
                              <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow">
                                Best Value
                              </span>
                            )}
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
                                {p.icon}
                              </div>
                              <div
                                className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${
                                  selected ? "border-amber-500" : "border-white/20"
                                }`}
                              >
                                {selected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                              </div>
                            </div>
                            <div className="text-sm font-extrabold text-slate-800 dark:text-gray-100">{p.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{p.tagline}</div>
                            <div className="mt-3 flex items-baseline gap-1">
                              <span className="text-2xl font-black text-slate-900 dark:text-white">₹{p.price}</span>
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">{p.period}</span>
                            </div>
                          </button>
                        );
                      })}
                      <div className="sm:col-span-2 rounded-xl p-3 flex items-start gap-2.5 bg-white/50 dark:bg-white/[0.02] border border-white/10 text-[10px] text-slate-500 dark:text-gray-400">
                        <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        All premium plans include unlimited resumes, all AI models (GPT-4o, Claude, Gemini), unlimited cover letters, full Interview & Coding Hub, and priority support. Cancel anytime.
                      </div>
                    </div>
                  )}

                  {/* STEP 2 — Billing cycle + coupon */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {(["monthly", "yearly"] as const).map((c) => {
                          const active = cycle === c;
                          const price = c === "monthly" ? monthlyPrice : yearlyPrice;
                          const perMonth = c === "yearly" ? (yearlyPrice / 12).toFixed(0) : null;
                          return (
                            <button
                              key={c}
                              onClick={() => toggleCycle(c)}
                              className={`relative rounded-2xl p-4 text-left border transition-all cursor-pointer ${
                                active
                                  ? "border-amber-500/60 bg-amber-500/[0.06] shadow-[0_0_20px_rgba(245,158,11,0.12)]"
                                  : "border-white/10 bg-white/60 dark:bg-white/[0.02] hover:border-white/20"
                              }`}
                            >
                              {c === "yearly" && (
                                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/90 text-black">
                                  2 months free
                                </span>
                              )}
                              <div className="flex items-center gap-2 mb-1.5">
                                <Calendar className={`w-4 h-4 ${active ? "text-amber-500" : "text-slate-400"}`} />
                                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-gray-200">
                                  {c === "monthly" ? "Monthly" : "Yearly"}
                                </span>
                              </div>
                              <div className="text-lg font-black text-slate-900 dark:text-white">
                                ₹{price}
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">/{c === "monthly" ? "mo" : "yr"}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">
                                {c === "yearly" && perMonth ? `≈ ₹${perMonth}/month · you save ₹${monthlyPrice * 12 - yearlyPrice}` : "Billed every month"}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Coupon */}
                      <div className="rounded-2xl p-4 border border-white/10 bg-white/60 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-2.5">
                          <BadgePercent className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold text-slate-700 dark:text-gray-200">Coupon Code</span>
                        </div>
                        {couponInfo ? (
                          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold"
                            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                            <span className="flex items-center gap-2">
                              <CircleCheck size={14} /> {couponInfo.code} — {couponInfo.discountPct}% off
                            </span>
                            <button onClick={() => { setCouponInfo(null); setCouponCode(""); }} className="text-[10px] underline cursor-pointer text-rose-500">
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              placeholder="e.g. ADYAPAN20"
                              className="flex-1 px-3 py-2.5 rounded-xl text-xs border border-white/10 bg-white/60 dark:bg-black/40 dark:bg-white/[0.02] outline-none focus:border-amber-500/40 transition-colors text-slate-800 dark:text-gray-100"
                            />
                            <button
                              onClick={handleApplyCoupon}
                              disabled={couponBusy}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black cursor-pointer transition-all disabled:opacity-50"
                            >
                              {couponBusy ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
                            </button>
                          </div>
                        )}
                        {couponInfo && couponInfo.discountAmount > 0 && (
                          <p className="mt-2 text-[10px] text-emerald-500 font-semibold">
                            You save {inr(couponInfo.discountAmount)} on {couponInfo.planLabel}.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 3 — Payment method */}
                  {step === 3 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-200">
                        <CreditCard className="w-4 h-4 text-amber-500" /> Select Payment Method
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {availableProviders.map((pname) => {
                          const active = provider === pname;
                          const meta: Record<string, { label: string; hint: string; icon: React.ReactNode }> = {
                            razorpay: { label: "Razorpay", hint: "UPI · Cards · NetBanking · Wallets", icon: <Wallet className="w-4 h-4" /> },
                            stripe: { label: "Stripe", hint: "Cards · Apple/Google Pay", icon: <CreditCard className="w-4 h-4" /> },
                            paypal: { label: "PayPal", hint: "PayPal balance · Cards", icon: <Zap className="w-4 h-4" /> },
                            mock: { label: "Test Mode", hint: "Simulate payment instantly", icon: <RefreshCw className="w-4 h-4" /> },
                          };
                          const m = meta[pname] || { label: pname, hint: "", icon: <CreditCard className="w-4 h-4" /> };
                          return (
                            <button
                              key={pname}
                              onClick={() => setProvider(pname)}
                              className={`rounded-2xl p-4 text-left border transition-all cursor-pointer ${
                                active
                                  ? "border-amber-500/60 bg-amber-500/[0.06] shadow-[0_0_20px_rgba(245,158,11,0.12)]"
                                  : "border-white/10 bg-white/60 dark:bg-white/[0.02] hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
                                  {m.icon}
                                </div>
                                <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${active ? "border-amber-500" : "border-white/20"}`}>
                                  {active && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                                </div>
                              </div>
                              <div className="text-xs font-extrabold text-slate-800 dark:text-gray-100">{m.label}</div>
                              <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{m.hint}</div>
                            </button>
                          );
                        })}
                      </div>
                      {provider === "mock" && (
                        <div className="rounded-xl p-3 bg-amber-500/[0.08] border border-amber-500/25 text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-2">
                          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          Test mode — no real charge. Payment is simulated and your subscription activates instantly.
                        </div>
                      )}
                      {provider === "razorpay" && (
                        <div className="rounded-xl p-3 bg-sky-500/[0.08] border border-sky-500/25 text-[10px] text-sky-600 dark:text-sky-400 flex items-start gap-2">
                          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          A secure Razorpay checkout will open to complete your payment. Test card: 4111 1111 1111 1111.
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4 — Review */}
                  {step === 4 && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-white/60 dark:bg-white/[0.02] divide-y divide-white/5">
                        <div className="flex items-center justify-between p-4 text-xs">
                          <span className="text-slate-500 dark:text-gray-400">Plan</span>
                          <span className="font-bold text-slate-800 dark:text-gray-100">{selectedPlanName}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 text-xs">
                          <span className="text-slate-500 dark:text-gray-400">Billing cycle</span>
                          <span className="font-bold text-slate-800 dark:text-gray-100 capitalize">{cycle}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 text-xs">
                          <span className="text-slate-500 dark:text-gray-400">Subtotal</span>
                          <span className="font-bold text-slate-800 dark:text-gray-100">{inr(cycle === "yearly" ? yearlyInPaise : monthlyInPaise)}</span>
                        </div>
                        {couponInfo && couponInfo.discountAmount > 0 && (
                          <div className="flex items-center justify-between p-4 text-xs">
                            <span className="text-slate-500 dark:text-gray-400 flex items-center gap-1.5">
                              <BadgePercent className="w-3.5 h-3.5 text-emerald-500" /> Coupon {couponInfo.code}
                            </span>
                            <span className="font-bold text-emerald-500">−{inr(couponInfo.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-4">
                          <span className="text-xs font-bold text-slate-700 dark:text-gray-200">Total</span>
                          <span className="text-xl font-black text-slate-900 dark:text-white">{inr(totalPaise)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-gray-400 px-1">
                        <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                        Payments are processed securely via {provider === "mock" ? "simulated gateway" : provider}. GST invoice generated automatically.
                      </div>
                      {order?.provider === "paypal" && (
                        <button
                          onClick={() => order && verifyOrder(order, order.providerOrderId, `sig_${Date.now()}`)}
                          disabled={processing}
                          className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black cursor-pointer transition-all disabled:opacity-50"
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
                        className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 mb-5 shadow-[0_0_24px_rgba(16,185,129,0.3)]"
                      >
                        <CircleCheck size={30} strokeWidth={2.5} />
                      </motion.div>
                      <h3 className="text-lg font-extrabold text-slate-800 dark:text-gray-50">You&apos;re on Premium!</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                        Your <span className="font-bold text-amber-500">{done.plan}</span> subscription is now active.
                        {done.expiresAt
                          ? ` Access continues until ${new Date(done.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`
                          : " Enjoy unlimited access to every feature."}
                      </p>
                      <div className="mt-6 w-full grid grid-cols-1 gap-2">
                        {[
                          "All AI models & unlimited resumes",
                          "Unlimited cover letters & ATS checks",
                          "Full Interview & Coding Hub",
                          "Priority support",
                        ].map((perk) => (
                          <div key={perk} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-gray-300">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                              <Check size={10} strokeWidth={3} />
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
              <div className="relative px-7 pb-6 pt-1 flex items-center justify-between gap-3 border-t border-white/5 mt-1">
                <button
                  onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white/5 cursor-pointer transition-all disabled:opacity-40"
                >
                  <ArrowLeft size={13} /> {step === 1 ? "Cancel" : "Back"}
                </button>
                {step === 4 && order?.provider !== "paypal" ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePay}
                    disabled={processing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-[0_8px_20px_rgba(245,158,11,0.3)] cursor-pointer transition-all disabled:opacity-50"
                  >
                    {processing ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                    {processing ? "Processing..." : `Pay ${inr(totalPaise)}`}
                  </motion.button>
                ) : step < 4 ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canNext || processing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-[0_8px_20px_rgba(245,158,11,0.3)] cursor-pointer transition-all disabled:opacity-50"
                  >
                    Continue <ArrowRight size={13} />
                  </motion.button>
                ) : null}
              </div>
            )}

            {step === 5 && (
              <div className="relative px-7 pb-6 pt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onComplete?.(); onClose(); }}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-[0_8px_20px_rgba(245,158,11,0.3)] cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
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
