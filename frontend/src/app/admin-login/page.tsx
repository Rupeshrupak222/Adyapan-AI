"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { saveAuthSession } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { SessionPopup } from "@/components/ui/SessionPopup";
import {
  ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSessionConfirm, setShowSessionConfirm] = useState(false);
  const [sessionConfirmMsg, setSessionConfirmMsg] = useState("");

  // Login screens render on the dark video background — force dark like the
  // user login page so the glass card looks identical.
  useEffect(() => {
    document.body.classList.add("landing");
    document.documentElement.setAttribute("data-theme", "dark");
    return () => { document.body.classList.remove("landing"); };
  }, []);

  // Card sits on the video background, so it uses the SAME fixed dark-glass
  // palette as the user login page (translucent + blur + white text) in both
  // themes — matching the user login card exactly.
  const cardBg     = "rgba(18,18,30,0.15)";
  const cardBorder = "rgba(255,255,255,0.15)";
  const cardText   = "#ffffff";
  const labelClr   = "rgba(255,255,255,0.75)";
  const mutedClr   = "rgba(255,255,255,0.6)";
  const iconClr    = "rgba(255,255,255,0.75)";
  const inputBg    = "rgba(255,255,255,0.1)";
  const inputBdr   = "rgba(255,255,255,0.2)";

  const inpStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.75rem 0.65rem 2.4rem",
    background: inputBg, border: `1px solid ${inputBdr}`,
    borderRadius: 10, color: cardText, fontSize: "0.85rem",
    WebkitTextFillColor: "#ffffff", colorScheme: "dark",
    outline: "none", transition: "border-color 0.2s",
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin-login", { email, password, rememberMe, portal: "admin" });

      // Another active session exists on this account. Ask before ending it,
      // mirroring the user-login flow. Without this, the response has no token
      // and the page would hang on "Authenticating Admin…".
      if (data.requireSessionConfirmation) {
        setSessionConfirmMsg(data.message || "There is an active session on another device. End it and log in here?");
        setShowSessionConfirm(true);
        setLoading(false);
        return;
      }

      if (data.user?.role !== "ADMIN") {
        setError("Access denied. This account does not have Admin privileges.");
        setLoading(false);
        return;
      }

      saveAuthSession(data.token, data.user, rememberMe, data.sessionId, data.refreshToken);
      window.location.href = "/dashboard/admin";
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string; error?: string } } })?.response;
      const status = response?.status;
      const serverMsg = response?.data?.message || response?.data?.error;
      setError(
        status && status >= 500
          ? "Server error. Please try again in a moment."
          : serverMsg || "Invalid admin credentials. Please try again.",
      );
      setLoading(false);
    }
  };

  const handleForceAdminLogin = async () => {
    setShowSessionConfirm(false);
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/admin-login", { email, password, rememberMe, portal: "admin", forceLogin: true });

      if (data.user?.role !== "ADMIN") {
        setError("Access denied. This account does not have Admin privileges.");
        setLoading(false);
        return;
      }

      saveAuthSession(data.token, data.user, rememberMe, data.sessionId, data.refreshToken);
      router.replace("/dashboard/admin");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        "Login failed. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Video Background — same as the user login page */}
      <video
        autoPlay
        muted
        loop
        className="fixed inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay for readability */}
      <div className="fixed inset-0" style={{ background: "rgba(0,0,0,0.35)", zIndex: 1 }} />

      <Navbar forceWhiteText hideThemeToggle />

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          width: "100%", maxWidth: 440, background: cardBg,
          border: `1px solid ${cardBorder}`, borderRadius: 20,
          padding: "2.25rem 2rem", backdropFilter: "blur(24px)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          position: "relative", zIndex: 10,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: 16, margin: "0 auto 1rem",
              background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))",
              border: "1px solid rgba(245,158,11,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#f59e0b",
            }}
          >
            <ShieldCheck size={26} />
          </div>

          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: cardText, margin: 0 }}>
            Admin Portal Sign In
          </h1>
          <p style={{ fontSize: "0.8rem", color: mutedClr, marginTop: 4 }}>
            Enter your credentials to access the Executive Admin Dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Email field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: labelClr }}>
              Admin Email
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
                  color: iconClr, display: "flex", pointerEvents: "none",
                }}
              >
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={inpStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b")}
                onBlur={(e) => (e.currentTarget.style.borderColor = inputBdr)}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: labelClr }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
                  color: iconClr, display: "flex", pointerEvents: "none",
                }}
              >
                <Lock size={15} />
              </span>
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ ...inpStyle, paddingRight: "2.4rem" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b")}
                onBlur={(e) => (e.currentTarget.style.borderColor = inputBdr)}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: mutedClr, display: "flex",
                }}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: labelClr, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#f59e0b", borderRadius: 4 }}
              />
              Keep me signed in
            </label>
          </div>

          {error && (
            <div
              style={{
                fontSize: "0.78rem", color: "#f87171", fontWeight: 500,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                padding: "0.6rem 0.8rem", borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.75rem",
              background: "linear-gradient(135deg,#f59e0b,#d97706)",
              color: "#000", border: "none", borderRadius: 12,
              fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
              opacity: loading ? 0.65 : 1, transition: "opacity 0.2s",
              marginTop: "0.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading ? "Authenticating Admin…" : (
              <>
                Access Admin Dashboard <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ margin: "1.5rem 0 1rem", borderTop: `1px solid ${cardBorder}` }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
          <span style={{ color: mutedClr }}>Student or User?</span>
          <Link href="/login" style={{ color: cardText, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            User Login →
          </Link>
        </div>
      </motion.div>
      </div>

      {/* Active-session confirm popup — shared style */}
      <SessionPopup
        open={showSessionConfirm}
        message={sessionConfirmMsg || "There is an active session on another device. Do you want to end it and login here?"}
        actions={[
          { label: "Cancel", variant: "secondary", onClick: () => { setShowSessionConfirm(false); setLoading(false); } },
          { label: "Login Here", variant: "primary", onClick: handleForceAdminLogin },
        ]}
      />
    </div>
  );
}
