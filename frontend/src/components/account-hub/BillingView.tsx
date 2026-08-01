"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Sparkles, Calendar, Award, FileText, Download, Check, Loader2,
  Ticket, ArrowRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/services/api";

interface Subscription {
  plan: string;
  status: string;
  endDate: string | null;
  razorpaySubscriptionId: string | null;
  appliedCoupon?: { code: string; discountPct: number } | null;
}

interface Invoice {
  id: string;
  orderId: string;
  paymentId: string | null;
  amount: number;
  discountAmount: number | null;
  couponCode: string | null;
  plan: string;
  status: string;
  createdAt: string;
}

interface Coupon {
  id: string;
  code: string;
  discountPct: number;
  validUntil: string | null;
}

export function BillingView() {
  const theme = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponPlan, setCouponPlan] = useState("pro_monthly");
  const [billingOfferMsg, setBillingOfferMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPct: number; discountAmount?: number; finalAmount?: number; plan?: string; planLabel?: string } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [statusRes, invoiceRes, couponRes] = await Promise.all([
          api.get("/payment/status"),
          api.get("/payment/invoices"),
          api.get("/payment/coupons"),
        ]);
        if (statusRes.data?.success) setSubscription(statusRes.data.subscription);
        if (invoiceRes.data?.success) setInvoices(invoiceRes.data.invoices ?? []);
        if (couponRes.data?.success) setCoupons(couponRes.data.coupons ?? []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Invalid coupon code.";
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

  const downloadInvoice = (inv: Invoice) => {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user") || "{}");
    } catch { /* ignore */ }

    const planLabel =
      inv.plan === "pro_yearly" ? "Pro Yearly" : inv.plan === "pro_monthly" ? "Pro Monthly" : inv.plan;
    const paid = inv.status === "paid";
    const date = new Date(inv.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });

    const lines = [
      "ADYAPAN AI",
      "===============",
      "",
      "TAX INVOICE",
      "Invoice #   : " + inv.orderId,
      "Date        : " + date,
      "Billed To   : " + (user?.name || user?.email || "Adyapan User"),
      "Email       : " + (user?.email || "—"),
      "",
      "Plan          : " + planLabel,
      "Base Amount   : ₹" + (((inv.amount + (inv.discountAmount ?? 0)) / 100).toLocaleString("en-IN")),
      "Coupon        : " + (inv.couponCode ? `${inv.couponCode} (-₹${((inv.discountAmount ?? 0) / 100).toLocaleString("en-IN")})` : "—"),
      "Total Paid    : ₹" + ((inv.amount / 100).toLocaleString("en-IN")),
      "Status        : " + (paid ? "PAID" : inv.status.toUpperCase()),
      "",
      "Thank you for choosing Adyapan AI!",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${inv.orderId}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  };

  const planLabel = subscription?.plan === "pro_monthly" ? "Pro Monthly" : subscription?.plan === "pro_yearly" ? "Pro Yearly" : "Free";
  const isActive = subscription?.status === "active";
  const renewalDate = subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";

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
          Manage your subscription plans, view renewal schedules, apply coupons, and download invoice copies.
        </p>
      </div>

      {/* Stats row */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { label: "Current Plan", val: loading ? "..." : planLabel, icon: <Sparkles className="text-amber-500 animate-pulse" /> },
          { label: "Next Renewal", val: loading ? "..." : renewalDate, icon: <Calendar className="text-cyan-500" /> },
          { label: "Status", val: loading ? "..." : isActive ? "Active" : "Inactive", icon: <Award className="text-emerald-500" /> },
          { label: "Subscription ID", val: loading ? "..." : subscription?.razorpaySubscriptionId ? subscription.razorpaySubscriptionId.slice(-8) : "None", icon: <FileText className="text-purple-500" /> }
        ].map((card, idx) => (
          <motion.div
            key={idx}
            custom={idx}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -3, scale: 1.01 }}
            className="p-4 border rounded-xl flex items-center justify-between"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: c.textMuted }}>{card.label}</span>
              <span className="text-lg font-extrabold block">{card.val}</span>
            </div>
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 shrink-0"
            >
              {card.icon}
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        
        {/* Plan Details Card */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
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
            {subscription?.appliedCoupon && (
              <div className="flex justify-between border-b pb-2.5" style={{ borderColor: c.border }}>
                <span style={{ color: c.textSec }}>Coupon Applied</span>
                <span className="font-bold text-emerald-500">{subscription.appliedCoupon.code} ({subscription.appliedCoupon.discountPct}% off)</span>
              </div>
            )}
            <div className="flex justify-between" style={{ color: c.textSec }}>
              <span>Status</span>
              <span className={`font-bold flex items-center gap-1 ${isActive ? "text-emerald-500" : "text-red-500"}`}>
                {isActive ? <><Check size={14} /> Active</> : "Inactive"}
              </span>
            </div>
          </div>
          )}
        </motion.div>

        {/* Coupons & payment details */}
        <motion.div
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          whileHover={{ y: -2, scale: 1.005 }}
          className="p-5 border rounded-2xl space-y-4"
          style={{ background: c.cardBg, borderColor: c.border }}
        >
          <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: c.primary }}>
            <Ticket size={15} /> Apply Offers / Coupons
          </h3>

          {/* Plan selector for discount calculation */}
          <div className="flex gap-2">
            {[
              { id: "pro_monthly", label: "Pro Monthly" },
              { id: "pro_yearly", label: "Pro Yearly" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setCouponPlan(p.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                  couponPlan === p.id ? "bg-amber-500 text-black" : ""
                }`}
                style={{
                  background: couponPlan === p.id ? c.primary : "transparent",
                  color: couponPlan === p.id ? "#000" : c.textSec,
                  borderColor: couponPlan === p.id ? c.primary : c.border,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {!appliedCoupon ? (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="e.g. ADYAPAN20"
                className="flex-1 bg-[var(--bg-card)] border focus:border-amber-500 focus:outline-none rounded-lg p-2 text-xs transition-colors"
                style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
              />
              <motion.button
                type="submit"
                disabled={applying}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="py-2 px-4 rounded-lg bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold transition-all disabled:opacity-60"
              >
                {applying ? <Loader2 size={13} className="animate-spin" /> : "Apply"}
              </motion.button>
            </form>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl text-xs font-bold"
              style={{ background: "rgba(16,185,129,0.1)", border: `1px solid ${c.green}40`, color: c.green }}>
              <span className="flex items-center gap-2">
                <Check size={14} /> {appliedCoupon.code} — {appliedCoupon.discountPct}% off
              </span>
              <button onClick={clearCoupon} className="text-[10px] font-bold underline cursor-pointer" style={{ color: c.red }}>
                Remove
              </button>
            </div>
          )}

          {appliedCoupon && appliedCoupon.finalAmount != null && (
            <div className="flex items-center justify-between text-xs px-1">
              <span style={{ color: c.textSec }}>
                {appliedCoupon.planLabel}: ₹{(appliedCoupon.discountAmount ?? 0) / 100} off
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { localStorage.setItem("adyapan-coupon", JSON.stringify({ code: appliedCoupon.code, plan: appliedCoupon.plan })); router.push("/premium"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-[10px] font-bold cursor-pointer"
              >
                Proceed to Checkout <ArrowRight size={12} />
              </motion.button>
            </div>
          )}

          <AnimatePresence>
            {billingOfferMsg && (
              <motion.p
                key="offer-msg"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-xs font-semibold"
                style={{ color: billingOfferMsg.ok ? c.green : c.red }}
              >
                {billingOfferMsg.text}
              </motion.p>
            )}
          </AnimatePresence>

          {coupons.length > 0 && !appliedCoupon && (
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                Available Coupons
              </div>
              <div className="flex flex-wrap gap-2">
                {coupons.map((cp) => (
                  <button
                    key={cp.id}
                    onClick={() => setCouponCode(cp.code)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:border-amber-500 cursor-pointer"
                    style={{ borderColor: c.border, color: c.textSec }}
                    title={`${cp.discountPct}% off${cp.validUntil ? ` · valid till ${new Date(cp.validUntil).toLocaleDateString()}` : ""}`}
                  >
                    {cp.code} · {cp.discountPct}% OFF
                  </button>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-sm font-bold pt-2" style={{ color: c.primary }}>Subscription</h3>
          <motion.div
            whileHover={{ y: -2, scale: 1.005 }}
            className="p-3 border rounded-xl flex items-center justify-between text-xs"
            style={{ borderColor: c.border }}
          >
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-amber-500" />
              <span className="font-semibold">{planLabel}</span>
            </div>
            <span className={`text-[10px] font-bold ${isActive ? "text-emerald-500" : "text-gray-400"}`}>{isActive ? "Active" : "Inactive"}</span>
          </motion.div>
        </motion.div>

      </motion.div>

      {/* Invoice list */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={2}
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
                const planName = inv.plan === "pro_yearly" ? "Pro Yearly" : inv.plan === "pro_monthly" ? "Pro Monthly" : inv.plan;
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ borderColor: c.border }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: paid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>
                      {paid ? <Check size={16} className="text-emerald-500" /> : <FileText size={16} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{planName}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: paid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                            color: paid ? "#10b981" : "#ef4444",
                          }}>
                          {paid ? "Paid" : inv.status}
                        </span>
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>
                        {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {inv.orderId.slice(0, 16)}…
                        {inv.couponCode ? ` · ${inv.couponCode}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black font-mono" style={{ color: paid ? "#10b981" : c.textSec }}>
                        ₹{(inv.amount / 100).toLocaleString("en-IN")}
                        {inv.discountAmount ? (
                          <span className="block text-[9px] font-semibold text-red-500">-₹{(inv.discountAmount / 100).toLocaleString("en-IN")} off</span>
                        ) : null}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => downloadInvoice(inv)}
                      className="p-2 rounded-lg border cursor-pointer transition-all hover:border-amber-500"
                      style={{ borderColor: c.border, color: c.textSec }}
                      title="Download invoice"
                    >
                      <Download size={14} />
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
