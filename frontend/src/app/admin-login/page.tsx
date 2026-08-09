"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { saveAuthSession } from "@/hooks/useAuth";
import {
  ShieldCheck, Mail, Lock, Eye, EyeOff, KeyRound, ArrowRight, Shield,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("adyapan-theme") as "dark" | "light") || "dark";
    setTheme(saved);

    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme");
      setTheme(t === "light" ? "light" : "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const isDark = theme === "dark";
  const bg         = isDark ? "var(--bg-dark, #060b0e)"        : "#f1f5f9";
  const cardBg     = isDark ? "rgba(18,18,30,0.95)"             : "rgba(255,255,255,0.98)";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)"           : "rgba(0,0,0,0.1)";
  const cardText   = isDark ? "#ffffff"                          : "#0f172a";
  const labelClr   = isDark ? "rgba(255,255,255,0.65)"          : "#475569";
  const mutedClr   = isDark ? "rgba(255,255,255,0.45)"          : "#64748b";
  const iconClr    = isDark ? "rgba(255,255,255,0.75)"          : "#475569";
  const inputBg    = isDark ? "rgba(255,255,255,0.06)"          : "rgba(0,0,0,0.04)";
  const inputBdr   = isDark ? "rgba(255,255,255,0.12)"          : "rgba(0,0,0,0.12)";

  const inpStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.75rem 0.65rem 2.4rem",
    background: inputBg, border: `1px solid ${inputBdr}`,
    borderRadius: 10, color: cardText, fontSize: "0.85rem",
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
      
      if (data.user?.role !== "ADMIN") {
        setError("Access denied. This account does not have Admin privileges.");
        setLoading(false);
        return;
      }

      saveAuthSession(data.token, data.user, rememberMe);
      router.replace("/dashboard/admin");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.error ||
        "Invalid admin credentials. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh", background: bg, display: "flex",
        alignItems: "center", justifyContent: "center", padding: "1.5rem",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: "absolute", top: "20%", left: "50%",
          transform: "translate(-50%, -50%)", width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none", borderRadius: "50%",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          width: "100%", maxWidth: 440, background: cardBg,
          border: `1px solid ${cardBorder}`, borderRadius: 20,
          padding: "2.25rem 2rem", backdropFilter: "blur(20px)",
          boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.6)" : "0 20px 40px rgba(0,0,0,0.08)",
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
            <Link href="/admin-register" style={{ color: "#f59e0b", fontWeight: 600, textDecoration: "none" }}>
              Register Admin
            </Link>
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
  );
}
