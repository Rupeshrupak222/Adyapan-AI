"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { saveAuthSession } from "@/hooks/useAuth";
import {
  ShieldCheck, User, Mail, Lock, Eye, EyeOff, KeyRound,
} from "lucide-react";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [form, setForm] = useState({
    adminSecret: "",
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    width: "100%", padding: "0.6rem 0.75rem 0.6rem 2.4rem",
    background: inputBg, border: `1px solid ${inputBdr}`,
    borderRadius: 10, color: cardText, fontSize: "0.85rem",
    outline: "none", transition: "border-color 0.2s",
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register-admin", {
        adminSecret: form.adminSecret,
        name: form.name,
        email: form.email,
        password: form.password,
      });
      saveAuthSession(data.token, data.user);
      router.replace("/dashboard/admin");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Registration failed. Check your admin secret.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fields: {
    key: keyof typeof form;
    label: string;
    type: string;
    placeholder: string;
    icon: React.ReactNode;
    toggle?: { show: boolean; set: () => void };
  }[] = [
    {
      key: "adminSecret",
      label: "Admin Secret Key",
      type: showSecret ? "text" : "password",
      placeholder: "Enter the admin secret key",
      icon: <KeyRound size={14} />,
      toggle: { show: showSecret, set: () => setShowSecret((s) => !s) },
    },
    {
      key: "name",
      label: "Full Name",
      type: "text",
      placeholder: "Admin Name",
      icon: <User size={14} />,
    },
    {
      key: "email",
      label: "Email Address",
      type: "email",
      placeholder: "admin@adyapan.com",
      icon: <Mail size={14} />,
    },
    {
      key: "password",
      label: "Password",
      type: showPass ? "text" : "password",
      placeholder: "••••••••",
      icon: <Lock size={14} />,
      toggle: { show: showPass, set: () => setShowPass((s) => !s) },
    },
    {
      key: "confirm",
      label: "Confirm Password",
      type: showConfirm ? "text" : "password",
      placeholder: "••••••••",
      icon: <Lock size={14} />,
      toggle: { show: showConfirm, set: () => setShowConfirm((s) => !s) },
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "'Inter', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: "100%", maxWidth: 440,
          background: cardBg, border: `1px solid ${cardBorder}`,
          borderRadius: 20, padding: "2rem",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          color: cardText, margin: "auto",
        }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 0.75rem", color: "#f59e0b",
          }}>
            <ShieldCheck size={24} />
          </div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>Admin Registration</h1>
          <p style={{ fontSize: "0.78rem", color: labelClr, marginTop: 4 }}>
            Create an administrator account for Adyapan AI
          </p>
        </div>

        {/* Notice Banner */}
        <div style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 10, padding: "0.65rem 0.85rem",
          fontSize: "0.75rem", color: "#f59e0b",
          marginBottom: "1.25rem", display: "flex", gap: "0.6rem", alignItems: "flex-start",
        }}>
          <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>This page is for authorized administrators only. You need the <strong>admin secret key</strong> to register.</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {fields.map((f) => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: labelClr, marginBottom: "0.35rem" }}>
                {f.label}
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
                  color: iconClr, display: "flex", pointerEvents: "none", zIndex: 10,
                }}>
                  {f.icon}
                </span>
                <input
                  type={f.type}
                  required
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  style={inpStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = inputBdr)}
                />
                {f.toggle && (
                  <button
                    type="button"
                    onClick={f.toggle.set}
                    style={{
                      position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: mutedClr, display: "flex",
                    }}
                  >
                    {f.toggle.show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {error && (
            <p style={{ fontSize: "0.78rem", color: "#f87171", fontWeight: 500 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.7rem",
              background: "linear-gradient(135deg,#f59e0b,#d97706)",
              color: "#000", border: "none", borderRadius: 12,
              fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
              opacity: loading ? 0.65 : 1, transition: "opacity 0.2s",
              marginTop: "0.25rem",
            }}
          >
            {loading ? "Creating admin account…" : "Create Admin Account →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.78rem", color: labelClr, marginTop: "1.25rem" }}>
          Already an admin?{" "}
          <Link href="/admin-login" style={{ color: "#f59e0b", fontWeight: 700, textDecoration: "none" }}>
            Sign in to Admin Dashboard
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

