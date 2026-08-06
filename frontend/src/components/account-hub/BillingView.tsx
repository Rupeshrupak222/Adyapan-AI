"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Sparkles, Calendar, Award, FileText, Download, Check, Loader2,
  Ticket, ArrowRight, MapPin, Trash2, Star, Plus, RefreshCw, Ban, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/services/api";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

interface SubscriptionState {
  plan: string;
  planKind: string;
  subscriptionStatus: string;
  isActive: boolean;
  subscriptionEnd: string | null;
  nextBillingDate: string | null;
  renewalAmount: number | null;
  autoRenew?: boolean;
  cancellationRequestedAt?: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  paymentId: string | null;
  plan: string | null;
  description: string;
  amount: number;
  taxAmount: number;
  currency: string;
  status: string;
  issuedAt: string;
  paidAt: string | null;
}

interface PaymentMethod {
  id: string;
  provider: string;
  type: string;
  brand: string;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  holderName: string | null;
  email: string | null;
  isDefault: boolean;
}

interface LegacyInvoice {
  id: string;
  orderId: string;
  paymentId: string | null;
  plan: string | null;
  amount: number;
  status: string;
  createdAt: string;
}

interface BillingAddress {
  id?: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  gstin: string | null;
}

interface Coupon {
  id: string;
  code: string;
  discountPct: number;
  validUntil: string | null;
}

function errMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

export function BillingView() {
  const theme = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponPlan, setCouponPlan] = useState("pro_monthly");
  const [billingOfferMsg, setBillingOfferMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPct: number; discountAmount?: number; finalAmount?: number; plan?: string; planLabel?: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Payment method form
  const [showPmForm, setShowPmForm] = useState(false);
  const [pmForm, setPmForm] = useState({ type: "card", brand: "", last4: "", expiryMonth: "", expiryYear: "", holderName: "", email: "" });

  // Billing address form
  const [editAddress, setEditAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<BillingAddress>({
    name: null, email: null, phone: null, line1: null, line2: null,
    city: null, state: null, postalCode: null, country: "IN", gstin: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, couponRes] = await Promise.all([
        api.get("/subscription/overview").catch(() => null),
        api.get("/payment/coupons").catch(() => null),
      ]);
      if (overviewRes?.data?.success) {
        const d = overviewRes.data;
        setSubscription(d.subscription ?? null);
        setInvoices(Array.isArray(d.invoices) ? d.invoices : []);
        setPaymentMethods(Array.isArray(d.paymentMethods) ? d.paymentMethods : []);
        const addr = d.billingAddress ?? null;
        setBillingAddress(addr);
        if (addr) setAddressForm({ ...addressForm, ...addr });
      } else {
        // Fall back to legacy endpoints if the subscription overview is unavailable
        const statusRes = await api.get("/payment/status").catch(() => null);
        if (statusRes?.data?.success) {
          const s = statusRes.data.subscription;
          setSubscription({
            plan: s.plan,
            planKind: s.planKind || "free",
            subscriptionStatus: s.status,
            isActive: s.status === "active" || s.status === "cancel_at_period_end",
            subscriptionEnd: s.endDate,
            nextBillingDate: s.endDate,
            renewalAmount: null,
          });
        }
        const invRes = await api.get("/payment/invoices").catch(() => null);
        if (invRes?.data?.success) {
          setInvoices((invRes.data.invoices ?? []).map((i: LegacyInvoice) => ({
            id: i.id,
            invoiceNumber: i.orderId,
            paymentId: i.paymentId,
            plan: i.plan,
            description: `${i.plan} subscription`,
            amount: i.amount,
            taxAmount: 0,
            currency: "INR",
            status: i.status,
            issuedAt: i.createdAt,
            paidAt: i.status === "paid" ? i.createdAt : null,
          })));
        }
      }
      if (couponRes?.data?.success) setCoupons(couponRes.data.coupons ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [addressForm]);

  useEffect(() => { load(); }, [load]);

  const c = {
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#475569",
    textMuted: isDark ? "rgba(255,255,255,0.45)" : "#94a3b8",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    primary: "#f59e0b",
    green: "#10b981",
    red: "#ef4444",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim();
    if (!code) {
      toast.error("Enter a coupon code first.");
      return;
    }
    setApplying(true);
    try {
      const res = await api.post("/payment/coupon/apply", { code, plan: couponPlan });
      if (res.data?.success) {
        const data = res.data.coupon;
        setAppliedCoupon(data);
        localStorage.setItem("adyapan-coupon", JSON.stringify({ code: data.code, plan: data.plan }));
        setBillingOfferMsg({
          text: `✅ Coupon ${data.code} applied! ${data.discountPct}% off — ${data.finalAmount > 0 ? `pay ₹${(data.finalAmount / 100).toLocaleString("en-IN")}` : "FREE"} for ${data.planLabel}.`,
          ok: true,
        });
        toast.success("Coupon applied successfully!");
      }
    } catch (err) {
      const msg = errMsg(err, "Invalid coupon code.");
      setBillingOfferMsg({ text: `❌ ${msg}`, ok: false });
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setBillingOfferMsg(null);
    localStorage.removeItem("adyapan-coupon");
  };

  const downloadInvoice = async (inv: Invoice) => {
    setActionBusy(`inv-${inv.id}`);
    try {
      const res = await api.get(`/subscription/invoices/${inv.invoiceNumber}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Invoice PDF downloaded");
    } catch (err) {
      // Fall back to legacy text invoice for older records
      toast.error(errMsg(err, "Invoice download failed"));
    } finally {
      setActionBusy(null);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy("add-pm");
    try {
      const res = await api.post("/subscription/payment-methods", {
        type: pmForm.type || "card",
        brand: pmForm.brand || "Visa",
        last4: pmForm.last4 ? String(pmForm.last4).slice(-4) : null,
        expiryMonth: pmForm.expiryMonth ? Number(pmForm.expiryMonth) : null,
        expiryYear: pmForm.expiryYear ? Number(pmForm.expiryYear) : null,
        holderName: pmForm.holderName || null,
        email: pmForm.email || null,
        isDefault: paymentMethods.length === 0,
      });
      if (res.data?.success) {
        setPaymentMethods((prev) => [...prev, res.data.paymentMethod]);
        setShowPmForm(false);
        setPmForm({ type: "card", brand: "", last4: "", expiryMonth: "", expiryYear: "", holderName: "", email: "" });
        toast.success("Payment method added");
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to add payment method"));
    } finally {
      setActionBusy(null);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!window.confirm("Remove this payment method?")) return;
    setActionBusy(`pm-${id}`);
    try {
      await api.delete(`/subscription/payment-methods/${id}`);
      setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
      toast.success("Payment method removed");
    } catch (err) {
      toast.error(errMsg(err, "Failed to remove payment method"));
    } finally {
      setActionBusy(null);
    }
  };

  const handleSetDefaultPaymentMethod = async (id: string) => {
    setActionBusy(`pmd-${id}`);
    try {
      await api.put(`/subscription/payment-methods/${id}/default`);
      setPaymentMethods((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
      toast.success("Default payment method updated");
    } catch (err) {
      toast.error(errMsg(err, "Failed to update default"));
    } finally {
      setActionBusy(null);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy("address");
    try {
      const payload: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(addressForm)) {
        if (k === "id") continue;
        payload[k] = String(v ?? "").trim() || null;
      }
      const res = await api.put("/subscription/billing-address", payload);
      if (res.data?.success) {
        setBillingAddress(res.data.billingAddress);
        setEditAddress(false);
        toast.success("Billing address saved");
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to save billing address"));
    } finally {
      setActionBusy(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel auto-renewal? You'll keep access until the end of the billing period.")) return;
    setActionBusy("cancel");
    try {
      const res = await api.post("/subscription/cancel", {});
      if (res.data?.success) {
        toast.success("Subscription will not renew");
        load();
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to cancel subscription"));
    } finally {
      setActionBusy(null);
    }
  };

  const handleRenewSubscription = async () => {
    setActionBusy("renew");
    try {
      const res = await api.post("/subscription/renew", {});
      if (res.data?.success) {
        toast.success("Auto-renew enabled");
        load();
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to re-enable auto-renew"));
    } finally {
      setActionBusy(null);
    }
  };

  const planLabel =
    subscription?.plan?.includes("yearly") ? "Pro Yearly"
      : subscription?.plan?.includes("pro") ? "Pro Monthly"
      : "Free";
  const isActive = Boolean(subscription?.isActive);
  const isCancelAtPeriodEnd = subscription?.subscriptionStatus === "cancel_at_period_end";
  const renewalDate = subscription?.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "N/A";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 p-1"
      style={{ color: c.text }}
    >
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <CreditCard className="text-amber-500" size={22} /> Billing & Plans
        </h1>
        <p className="text-xs mt-1" style={{ color: c.textMuted }}>
          Manage your subscription plans, payment methods, billing address, coupons, and download invoices.
        </p>
      </div>

      {/* Stats row */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Current Plan", val: loading ? "..." : planLabel, icon: <Sparkles className="text-amber-500 animate-pulse" /> },
          { label: "Next Renewal", val: loading ? "..." : renewalDate, icon: <Calendar className="text-cyan-500" /> },
          { label: "Status", val: loading ? "..." : isActive ? (isCancelAtPeriodEnd ? "Cancelling" : "Active") : "Inactive", icon: <Award className="text-emerald-500" /> },
          { label: "Plan Type", val: loading ? "..." : subscription?.planKind === "free" ? "Free" : "Premium", icon: <FileText className="text-purple-500" /> }
        ].map((card, idx) => (
          <motion.div
            key={idx} custom={idx} variants={fadeUp} initial="hidden" animate="visible"
            whileHover={{ y: -3, scale: 1.01 }}
            className="p-4 border rounded-xl flex items-center justify-between"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: c.textMuted }}>{card.label}</span>
              <span className="text-lg font-extrabold block">{card.val}</span>
            </div>
            <motion.div
              initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 shrink-0"
            >
              {card.icon}
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
        className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Plan Details Card */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
          whileHover={{ y: -2, scale: 1.005 }}
          className="p-5 border rounded-2xl space-y-4"
          style={{ background: c.cardBg, borderColor: c.border }}
        >
          <h3 className="text-sm font-bold" style={{ color: c.primary }}>Plan Details</h3>
          {loading ? (
            <div className="flex items-center gap-2 py-4"><Loader2 size={16} className="animate-spin" style={{ color: c.textMuted }} /> <span className="text-xs" style={{ color: c.textMuted }}>Loading subscription data...</span></div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2.5" style={{ borderColor: c.border }}>
                <span style={{ color: c.textSec }}>Active Subscription</span>
                <span className="font-bold text-amber-500">{planLabel}</span>
              </div>
              <div className="flex justify-between border-b pb-2.5" style={{ borderColor: c.border }}>
                <span style={{ color: c.textSec }}>Billing Interval</span>
                <span className="font-bold">{subscription?.plan?.includes("yearly") ? "Yearly" : subscription?.plan ? "Monthly" : "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2.5" style={{ borderColor: c.border }}>
                <span style={{ color: c.textSec }}>Next Renewal Date</span>
                <span className="font-bold">{renewalDate}</span>
              </div>
              {subscription?.renewalAmount != null && (
                <div className="flex justify-between border-b pb-2.5" style={{ borderColor: c.border }}>
                  <span style={{ color: c.textSec }}>Renewal Amount</span>
                  <span className="font-bold">₹{(subscription.renewalAmount).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ color: c.textSec }}>
                <span>Status</span>
                <span className={`font-bold flex items-center gap-1 ${isActive ? "text-emerald-500" : "text-red-500"}`}>
                  {isActive ? <><Check size={14} /> {isCancelAtPeriodEnd ? "Cancels at period end" : "Active"}</> : "Inactive"}
                </span>
              </div>

              {isActive && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {isCancelAtPeriodEnd ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={handleRenewSubscription} disabled={actionBusy === "renew"}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "rgba(16,185,129,0.12)", color: c.green, border: `1px solid ${c.green}40` }}
                    >
                      {actionBusy === "renew" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Re-enable Auto-renew
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={handleCancelSubscription} disabled={actionBusy === "cancel"}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", color: c.red, border: `1px solid ${c.red}40` }}
                    >
                      {actionBusy === "cancel" ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                      Cancel Auto-renew
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => router.push("/premium")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                    style={{ background: "rgba(245,158,11,0.12)", color: c.primary, border: `1px solid ${c.primary}40` }}
                  >
                    <ArrowRight size={12} /> Change Plan
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Payment Methods Card */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
          whileHover={{ y: -2, scale: 1.005 }}
          className="p-5 border rounded-2xl space-y-3"
          style={{ background: c.cardBg, borderColor: c.border }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: c.primary }}>
              <CreditCard size={15} /> Payment Methods
            </h3>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setShowPmForm((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
              style={{ background: "rgba(245,158,11,0.12)", color: c.primary, border: `1px solid ${c.primary}40` }}
            >
              <Plus size={11} /> Add
            </motion.button>
          </div>

          {showPmForm && (
            <form onSubmit={handleAddPaymentMethod} className="grid grid-cols-2 gap-2 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.04)", border: `1px solid ${c.primary}30` }}>
              <input value={pmForm.brand} onChange={(e) => setPmForm((s) => ({ ...s, brand: e.target.value }))} placeholder="Brand (Visa/Mastercard)" className="col-span-2 px-3 py-2 rounded-lg text-xs outline-none focus:border-amber-500 transition-colors" style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} />
              <input value={pmForm.last4} onChange={(e) => setPmForm((s) => ({ ...s, last4: e.target.value }))} placeholder="Card no. (last 4 saved)" className="col-span-2 px-3 py-2 rounded-lg text-xs outline-none focus:border-amber-500 transition-colors" style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} />
              <input value={pmForm.expiryMonth} onChange={(e) => setPmForm((s) => ({ ...s, expiryMonth: e.target.value }))} placeholder="MM" className="px-3 py-2 rounded-lg text-xs outline-none focus:border-amber-500 transition-colors" style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} />
              <input value={pmForm.expiryYear} onChange={(e) => setPmForm((s) => ({ ...s, expiryYear: e.target.value }))} placeholder="YY" className="px-3 py-2 rounded-lg text-xs outline-none focus:border-amber-500 transition-colors" style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} />
              <input value={pmForm.holderName} onChange={(e) => setPmForm((s) => ({ ...s, holderName: e.target.value }))} placeholder="Card holder name" className="col-span-2 px-3 py-2 rounded-lg text-xs outline-none focus:border-amber-500 transition-colors" style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} />
              <button type="submit" disabled={actionBusy === "add-pm"}
                className="col-span-2 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                {actionBusy === "add-pm" ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Save Card"}
              </button>
            </form>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" style={{ color: c.textMuted }} /> <span className="text-xs" style={{ color: c.textMuted }}>Loading...</span></div>
          ) : paymentMethods.length === 0 ? (
            <div className="py-4 text-center text-xs" style={{ color: c.textMuted }}>No saved payment methods yet.</div>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: c.border }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.1)" }}>
                    <CreditCard size={14} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate">{pm.brand || pm.type} •••• {pm.last4 || "—"}</span>
                      {pm.isDefault && <Star size={11} className="text-amber-500 shrink-0" />}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>
                      {pm.holderName || pm.email || pm.provider}
                      {pm.expiryMonth ? ` · Exp ${String(pm.expiryMonth).padStart(2, "0")}/${pm.expiryYear}` : ""}
                    </div>
                  </div>
                  {!pm.isDefault && (
                    <button onClick={() => handleSetDefaultPaymentMethod(pm.id)} disabled={actionBusy === `pmd-${pm.id}`}
                      className="p-1.5 rounded-lg border cursor-pointer transition-all hover:border-amber-500" style={{ borderColor: c.border, color: c.textMuted }} title="Set default">
                      <Star size={12} />
                    </button>
                  )}
                  <button onClick={() => handleDeletePaymentMethod(pm.id)} disabled={actionBusy === `pm-${pm.id}`}
                    className="p-1.5 rounded-lg border cursor-pointer transition-all hover:border-red-500 hover:text-red-500" style={{ borderColor: c.border, color: c.textMuted }} title="Remove">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Coupons & offers */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
          whileHover={{ y: -2, scale: 1.005 }}
          className="p-5 border rounded-2xl space-y-4"
          style={{ background: c.cardBg, borderColor: c.border }}
        >
          <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: c.primary }}>
            <Ticket size={15} /> Apply Offers / Coupons
          </h3>

          <div className="flex gap-2">
            {[{ id: "pro_monthly", label: "Pro Monthly" }, { id: "pro_yearly", label: "Pro Yearly" }].map((p) => (
              <button key={p.id} type="button" onClick={() => setCouponPlan(p.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${couponPlan === p.id ? "bg-amber-500 text-black" : ""}`}
                style={{ background: couponPlan === p.id ? c.primary : "transparent", color: couponPlan === p.id ? "#000" : c.textSec, borderColor: couponPlan === p.id ? c.primary : c.border }}>
                {p.label}
              </button>
            ))}
          </div>

          {!appliedCoupon ? (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                placeholder="e.g. ADYAPAN20" className="flex-1 bg-[var(--bg-card)] border focus:border-amber-500 focus:outline-none rounded-lg p-2 text-xs transition-colors"
                style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
              <motion.button type="submit" disabled={applying} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="py-2 px-4 rounded-lg bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold transition-all disabled:opacity-60">
                {applying ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
              </motion.button>
            </form>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl text-xs font-bold"
              style={{ background: "rgba(16,185,129,0.1)", border: `1px solid ${c.green}40`, color: c.green }}>
              <span className="flex items-center gap-2"><Check size={14} /> {appliedCoupon.code} — {appliedCoupon.discountPct}% off</span>
              <button onClick={clearCoupon} className="text-[10px] font-bold underline cursor-pointer" style={{ color: c.red }}>Remove</button>
            </div>
          )}

          {appliedCoupon && appliedCoupon.finalAmount != null && (
            <div className="flex items-center justify-between text-xs px-1">
              <span style={{ color: c.textSec }}>{appliedCoupon.planLabel}: ₹{(appliedCoupon.discountAmount ?? 0) / 100} off</span>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { localStorage.setItem("adyapan-coupon", JSON.stringify({ code: appliedCoupon.code, plan: appliedCoupon.plan })); router.push("/premium"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-[10px] font-bold cursor-pointer">
                Proceed to Checkout <ArrowRight size={12} />
              </motion.button>
            </div>
          )}

          <AnimatePresence>
            {billingOfferMsg && (
              <motion.p key="offer-msg" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                className="text-xs font-semibold" style={{ color: billingOfferMsg.ok ? c.green : c.red }}>
                {billingOfferMsg.text}
              </motion.p>
            )}
          </AnimatePresence>

          {coupons.length > 0 && !appliedCoupon && (
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Available Coupons</div>
              <div className="flex flex-wrap gap-2">
                {coupons.map((cp) => (
                  <button key={cp.id} onClick={() => setCouponCode(cp.code)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:border-amber-500 cursor-pointer"
                    style={{ borderColor: c.border, color: c.textSec }}
                    title={`${cp.discountPct}% off${cp.validUntil ? ` · valid till ${new Date(cp.validUntil).toLocaleDateString()}` : ""}`}>
                    {cp.code} · {cp.discountPct}% OFF
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Billing Address Card */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
          whileHover={{ y: -2, scale: 1.005 }}
          className="p-5 border rounded-2xl space-y-3"
          style={{ background: c.cardBg, borderColor: c.border }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: c.primary }}>
              <MapPin size={15} /> Billing Address
            </h3>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setEditAddress((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
              style={{ background: "rgba(245,158,11,0.12)", color: c.primary, border: `1px solid ${c.primary}40` }}>
              <Pencil size={11} /> {editAddress ? "Close" : "Edit"}
            </motion.button>
          </div>

          {editAddress ? (
            <form onSubmit={handleSaveAddress} className="grid grid-cols-2 gap-2">
              {([
                ["name", "Full Name"], ["email", "Email"], ["phone", "Phone"],
                ["line1", "Address Line 1"], ["line2", "Address Line 2"], ["city", "City"],
                ["state", "State"], ["postalCode", "PIN Code"], ["country", "Country (e.g. IN)"], ["gstin", "GSTIN (optional)"],
              ] as const).map(([key, label]) => (
                <div key={key} className={key === "line1" || key === "line2" ? "col-span-2" : ""}>
                  <span className="text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>{label}</span>
                  <input value={addressForm[key] ?? ""} onChange={(e) => setAddressForm((s) => ({ ...s, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none focus:border-amber-500 transition-colors"
                    style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} />
                </div>
              ))}
              <button type="submit" disabled={actionBusy === "address"}
                className="col-span-2 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                {actionBusy === "address" ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Save Address"}
              </button>
            </form>
          ) : loading ? (
            <div className="flex items-center gap-2 py-3"><Loader2 size={14} className="animate-spin" style={{ color: c.textMuted }} /> <span className="text-xs" style={{ color: c.textMuted }}>Loading...</span></div>
          ) : billingAddress?.line1 ? (
            <div className="text-xs space-y-0.5" style={{ color: c.textSec }}>
              <div className="font-bold" style={{ color: c.text }}>{billingAddress.name || "—"}</div>
              <div>{[billingAddress.line1, billingAddress.line2].filter(Boolean).join(", ")}</div>
              <div>{[billingAddress.city, billingAddress.state].filter(Boolean).join(", ")} {billingAddress.postalCode || ""}</div>
              <div>{billingAddress.country}</div>
              <div>{billingAddress.email}</div>
              {billingAddress.phone && <div>{billingAddress.phone}</div>}
              {billingAddress.gstin && <div className="text-[10px]" style={{ color: c.textMuted }}>GSTIN: {billingAddress.gstin}</div>}
            </div>
          ) : (
            <div className="py-4 text-center text-xs" style={{ color: c.textMuted }}>No billing address set. Add one to appear on your invoices.</div>
          )}
        </motion.div>
      </motion.div>

      {/* Invoice list */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
        whileHover={{ y: -2, scale: 1.005 }}
        className="p-5 border rounded-2xl space-y-4"
        style={{ background: c.cardBg, borderColor: c.border }}
      >
        <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: c.primary }}>
          <FileText size={15} /> Invoice History
        </h3>
        <div className="text-sm leading-relaxed">
          {loading ? (
            <div className="flex items-center gap-2 py-4"><Loader2 size={16} className="animate-spin" style={{ color: c.textMuted }} /> <span className="text-xs" style={{ color: c.textMuted }}>Loading invoices...</span></div>
          ) : invoices.length === 0 ? (
            <div className="py-4 text-center text-xs" style={{ color: c.textMuted }}>No invoices yet. Subscribe to see your billing history.</div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const paid = inv.status === "paid";
                const planName = inv.plan?.includes("yearly") ? "Pro Yearly" : inv.plan?.includes("pro") ? "Pro Monthly" : inv.plan || "Subscription";
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: c.border }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: paid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>
                      {paid ? <Check size={16} className="text-emerald-500" /> : <FileText size={16} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{planName}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: paid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: paid ? "#10b981" : "#ef4444" }}>
                          {paid ? "Paid" : inv.status}
                        </span>
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>
                        {inv.invoiceNumber} · {new Date(inv.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black font-mono" style={{ color: paid ? "#10b981" : c.textSec }}>
                        ₹{(inv.amount / 100).toLocaleString("en-IN")}
                        {inv.taxAmount > 0 && (
                          <span className="block text-[9px] font-semibold text-slate-500">incl. GST ₹{(inv.taxAmount / 100).toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => downloadInvoice(inv)} disabled={actionBusy === `inv-${inv.id}`}
                      className="p-2 rounded-lg border cursor-pointer transition-all hover:border-amber-500 disabled:opacity-50"
                      style={{ borderColor: c.border, color: c.textSec }} title="Download PDF invoice">
                      {actionBusy === `inv-${inv.id}` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
