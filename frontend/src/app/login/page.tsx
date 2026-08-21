"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import { saveAuthSession } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { AnimatedCheckCircle } from "@/components/ui/AnimatedIcons";
import type { PlatformUser } from "@/types/user";

type Tab = "login" | "register" | "forgot";
type ForgotStep = "email" | "otp" | "done";

// Resolve where to send the user after a successful login.
// Honors the `?from=` query added by the auth guard (useRequireAuth) and only
// trusts same-origin, internal paths (never external or protocol-relative URLs).
function getPostLoginTarget(role?: string): string {
  if (typeof window !== "undefined") {
    try {
      const from = new URLSearchParams(window.location.search).get("from");
      if (from && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\") && !from.startsWith("/dashboard/admin") && !from.startsWith("/admin")) {
        return from;
      }
    } catch { /* ignore malformed query */ }
  }
  return "/dashboard/user";
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const GitHubIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("login");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [reg, setReg] = useState({ name: "", email: "", phone: "", college: "", branch: "", year: "", password: "", confirm: "" });
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regEmailError, setRegEmailError] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNew, setForgotNew] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Listen to searchParams tab change dynamically (Login vs Get Started)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "register") {
      setTab("register");
    } else if (tabParam === "login" || !tabParam) {
      setTab("login");
    }
  }, [searchParams]);

  useEffect(() => {
    document.body.classList.add("landing");
    const saved = (localStorage.getItem("adyapan-theme") as "dark" | "light") || "dark";
    setTheme(saved);

    // Handle GitHub OAuth callback
    const params = new URLSearchParams(window.location.search);

    const githubStatus = params.get("github");
    if (githubStatus === "success") {
      const token = params.get("token");
      const userStr = params.get("user");
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr) as PlatformUser;
          if (user.role === "ADMIN") {
            setLoginError("Admin accounts cannot log in here. Please use the Admin Login page.");
            return;
          }
          saveAuthSession(token, user, true);
          router.replace(getPostLoginTarget(user.role));
          return;
        } catch { return; }
      }
    } else if (githubStatus === "error") {
      setLoginError(params.get("message") || "GitHub login failed. Please try again.");
    }

    // Strip GitHub params from URL without reload
    if (githubStatus) {
      const url = new URL(window.location.href);
      url.searchParams.delete("github");
      url.searchParams.delete("token");
      url.searchParams.delete("user");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }

    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme");
      setTheme(t === "light" ? "light" : "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Clear session if logout query parameter is present
    if (params.get("logout") === "true") {
      localStorage.removeItem("adyapan-token");
      localStorage.removeItem("adyapan-user");
      sessionStorage.removeItem("adyapan-token");
      sessionStorage.removeItem("adyapan-user");
      document.cookie = "adyapan-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
      document.cookie = "adyapan-user=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
    }

    // Auto-redirect if already logged in (and not explicitly logging out)
    const existingToken = localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token");
    const existingUser = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
    if (existingToken && existingUser && params.get("logout") !== "true") {
      try {
        const u = JSON.parse(existingUser) as { role?: string };
        router.replace(getPostLoginTarget(u.role));
      } catch { /* ignore */ }
    }

    return () => { document.body.classList.remove("landing"); observer.disconnect(); };
  }, [router]);

  const isDark = theme === "dark";
  const cardBg    = "rgba(18,18,30,0.15)";
  const cardBorder= "rgba(255,255,255,0.15)";
  const cardText  = "#ffffff";
  const labelClr  = "rgba(255,255,255,0.75)";
  const mutedClr  = "rgba(255,255,255,0.6)";
  const iconClr   = "rgba(255,255,255,0.85)";
  const inputBg   = "rgba(255,255,255,0.1)";
  const inputBdr  = "rgba(255,255,255,0.2)";
  const socialBg  = "rgba(255,255,255,0.12)";

  const inp = (extra = "") =>
    `w-full rounded-lg border bg-transparent px-3 py-2 pl-9 text-sm outline-none transition placeholder:text-[${mutedClr}] focus:border-indigo-500 ${extra}`;

  const inpReg = (extra = "") =>
    `w-full rounded-md border bg-transparent px-3 py-2 pl-8 text-xs outline-none transition focus:border-indigo-500 ${extra}`;

  const inpStyle = { background: inputBg, borderColor: inputBdr, color: cardText };
  const socialStyle = { background: socialBg, border: `1px solid ${inputBdr}`, color: cardText };
  const submitStyle = { background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000" };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(""); setLoginLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email: loginEmail.trim(), password: loginPassword, rememberMe, portal: "user" });
      if (data.user?.role === "ADMIN") {
        setLoginError("Admin accounts cannot log in here. Please use the Admin Login page.");
        return;
      }
      saveAuthSession(data.token, data.user, rememberMe);
      router.replace(getPostLoginTarget(data.user.role));
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      const serverMsg = data?.message || data?.error;
      setLoginError(serverMsg || "Invalid user credentials. Please try again.");
    } finally { setLoginLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setRegError(""); setRegEmailError(false);
    if (reg.password !== reg.confirm) { setRegError("Passwords do not match."); return; }
    setRegLoading(true);
    try {
      const { data } = await api.post("/auth/register", { 
        name: reg.name.trim(), 
        email: reg.email.trim(), 
        password: reg.password, 
        role: "USER",
        phone: reg.phone.trim() || undefined,
        college: reg.college.trim() || undefined,
        branch: reg.branch.trim() || undefined,
        year: reg.year.trim() || undefined,
      });
      sessionStorage.setItem("adyapan-just-registered", "true");
      localStorage.setItem("adyapan-just-registered", "true");
      if (data?.token && data?.user) {
        saveAuthSession(data.token, data.user, true);
        toast.success("Account created successfully! Welcome to Adyapan AI.");
        router.replace(getPostLoginTarget(data.user.role));
      } else {
        setTab("login");
        setLoginEmail(reg.email.trim());
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { code?: string; message?: string; error?: string } } })?.response?.data;
      if (data?.code === "EMAIL_ALREADY_EXISTS") {
        setRegEmailError(true);
      } else {
        const serverMsg = data?.message || data?.error;
        setRegError(serverMsg || "Registration failed.");
      }
    } finally { setRegLoading(false); }
  };

  const useAnotherEmail = () => {
    setRegEmailError(false);
    setRegError("");
    setReg(r => ({ ...r, email: "" }));
    setTimeout(() => emailRef.current?.focus(), 0);
  };

  const signInFromRegister = () => {
    if (reg.email.trim()) setLoginEmail(reg.email.trim());
    switchTab("login");
  };


  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setForgotError(""); setForgotMsg("");
    if (forgotStep === "email") {
      setForgotLoading(true);
      try {
        const { data } = await api.post("/auth/forgot-password", { email: forgotEmail });
        setForgotMsg(data.devOtp ? `OTP sent. Development OTP: ${data.devOtp}` : "OTP sent. Check your email for the 6-digit code.");
        setForgotStep("otp");
      }
      catch (err: unknown) { setForgotError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not send OTP."); }
      finally { setForgotLoading(false); }
    } else if (forgotStep === "otp") {
      if (forgotNew !== forgotConfirm) { setForgotError("Passwords do not match."); return; }
      setForgotLoading(true);
      try { await api.post("/auth/reset-password", { email: forgotEmail, otp: forgotOtp, newPassword: forgotNew }); setForgotMsg("Password reset!"); setForgotStep("done"); }
      catch (err: unknown) { setForgotError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Invalid OTP."); }
      finally { setForgotLoading(false); }
    }
  };

  const switchTab = (t: Tab) => { setTab(t); setLoginError(""); setRegError(""); setRegEmailError(false); setForgotError(""); setForgotMsg(""); };

  const tabVariants = {
    enter: { opacity: 0, y: 20, scale: 0.97 },
    center: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" as const } },
    exit: { opacity: 0, y: -15, scale: 0.97, transition: { duration: 0.2 } },
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.05, duration: 0.35 } }),
  };

  return (
    <div className="min-h-screen transition-colors relative overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        className="fixed inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay for better readability */}
      <div
        className="fixed inset-0"
        style={{
          background: "rgba(0, 0, 0, 0.35)",
          zIndex: 1,
        }}
      />

      <Navbar forceWhiteText />

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`w-full rounded-2xl border shadow-2xl transition-shadow duration-300 ${tab === "register" ? "max-w-md" : "max-w-sm"}`}
          style={{ background: cardBg, borderColor: cardBorder, backdropFilter: "blur(24px)", color: cardText }}
        >
          <div className={tab === "register" ? "p-4" : "p-6"}>

            <AnimatePresence mode="wait">
              {tab === "login" && (
                <motion.div key="login" variants={tabVariants} initial="enter" animate="center" exit="exit">
                  <div className="mb-5 text-center">
                    <motion.h1
                      className="text-xl font-bold"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >Welcome Back</motion.h1>
                    <motion.p
                      className="mt-1 text-xs"
                      style={{ color: labelClr }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >Login to resume your Adyapan journey</motion.p>
                  </div>
                  <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    {[
                      { label: "Email Address", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>, ph: "Email", val: loginEmail, set: (v: string) => setLoginEmail(v), type: "email" },
                      { label: "Password", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, ph: "••••••••", val: loginPassword, set: (v: string) => setLoginPassword(v), type: "password" },
                    ].map((f, i) => (
                      <motion.div key={f.label} custom={i} variants={staggerItem} initial="hidden" animate="visible">
                        <label className="mb-1 block text-xs font-semibold" style={{ color: labelClr }}>{f.label}</label>
                        <div className="relative">
                          <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: iconClr, display: "flex", pointerEvents: "none", zIndex: 10 }}>{f.icon}</span>
                          <input type={f.type} required placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} className={inp()} style={inpStyle} />
                        </div>
                      </motion.div>
                    ))}
                    <motion.div className="flex items-center justify-between text-xs" style={{ color: labelClr }} custom={2} variants={staggerItem} initial="hidden" animate="visible">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" className="accent-amber-500" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember me
                      </label>
                      <button type="button" onClick={() => switchTab("forgot")} className="font-semibold text-amber-400">Forgot password?</button>
                    </motion.div>
                    {loginError && <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-red-400">{loginError}</motion.p>}
                    <motion.button type="submit" disabled={loginLoading} className="w-full rounded-full py-2.5 text-sm font-bold disabled:opacity-60" style={submitStyle} custom={3} variants={staggerItem} initial="hidden" animate="visible" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {loginLoading ? "Logging in…" : "Login →"}
                    </motion.button>
                    <motion.div className="relative text-center" custom={4} variants={staggerItem} initial="hidden" animate="visible">
                      <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: `1px solid ${inputBdr}` }} /></div>
                      <span className="relative px-3 text-xs" style={{ background: cardBg, color: mutedClr }}>OR LOGIN WITH</span>
                    </motion.div>
                    <motion.div className="flex gap-2" custom={5} variants={staggerItem} initial="hidden" animate="visible">
                      <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold hover:opacity-80" style={socialStyle}><GoogleIcon /> Google</button>
                      <button type="button" onClick={() => window.location.href = `${api.defaults.baseURL}/auth/github`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold hover:opacity-80" style={socialStyle}><GitHubIcon color={cardText} /> GitHub</button>
                    </motion.div>
                    <motion.p className="text-center text-xs" style={{ color: labelClr }} custom={6} variants={staggerItem} initial="hidden" animate="visible">
                      Don&apos;t have an account? <button type="button" onClick={() => switchTab("register")} className="font-bold text-amber-400">Register here</button>
                    </motion.p>
                  </form>
                </motion.div>
              )}

              {tab === "register" && (
                <motion.div key="register" variants={tabVariants} initial="enter" animate="center" exit="exit">
                  <div className="mb-3 text-center">
                    <motion.h1 className="text-lg font-bold" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>Create an Account</motion.h1>
                    <motion.p className="mt-0.5 text-xs" style={{ color: labelClr }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>Sign up now to start learning with AI</motion.p>
                  </div>
                  <form onSubmit={handleRegister} className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Full Name",     key: "name",    type: "text",  ph: "John Doe",         icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, full: false },
                      { label: "Email Address", key: "email",   type: "email", ph: "Email", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>, full: false },
                      { label: "Phone Number",  key: "phone",   type: "tel",   ph: "9876543210",        icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.6 4.4 2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.11 6.11l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, full: false },
                      { label: "College/University", key: "college", type: "text", ph: "State University", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>, full: false },
                      { label: "Branch/Specialization", key: "branch", type: "text", ph: "Computer Science", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>, full: false },
                    ].map(({ label, key, type, ph, icon, full }, fi) => {
                      const isEmail = key === "email";
                      return (
                        <motion.div key={key} className={isEmail && regEmailError ? "col-span-2" : full ? "col-span-2" : "col-span-1"} custom={fi} variants={staggerItem} initial="hidden" animate="visible">
                          <label className="mb-0.5 block text-xs font-semibold" style={{ color: labelClr }}>{label}</label>
                          <div className="relative">
                            <span style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: iconClr, display: "flex", pointerEvents: "none", zIndex: 10 }}>{icon}</span>
                            <input type={type} required placeholder={ph} value={reg[key as keyof typeof reg]}
                              ref={isEmail ? emailRef : undefined}
                              onChange={e => {
                                if (isEmail && regEmailError) setRegEmailError(false);
                                setReg(r => ({ ...r, [key]: e.target.value }));
                              }}
                              className={inpReg()}
                              style={isEmail && regEmailError ? { ...inpStyle, borderColor: "#ef4444" } : inpStyle}
                              aria-invalid={isEmail && regEmailError} />
                          </div>
                          {isEmail && regEmailError && (
                            <div className="mt-1.5">
                              <p className="text-[11px] font-semibold text-red-400">This email is already registered.</p>
                              <p className="text-[11px]" style={{ color: mutedClr }}>Please log in or use a different email address.</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <button type="button" onClick={signInFromRegister}
                                  className="rounded-md px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:opacity-80"
                                  style={{ background: "rgba(245,158,11,0.12)" }}>Sign In</button>
                                <button type="button" onClick={() => switchTab("forgot")}
                                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold hover:opacity-80"
                                  style={{ color: labelClr }}>Forgot Password</button>
                                <button type="button" onClick={useAnotherEmail}
                                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold hover:opacity-80"
                                  style={{ color: labelClr }}>Use Another Email</button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                    <motion.div className="col-span-1" custom={5} variants={staggerItem} initial="hidden" animate="visible">
                      <label className="mb-0.5 block text-xs font-semibold" style={{ color: labelClr }}>Academic Year</label>
                      <div className="relative">
                        <span style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: iconClr, display: "flex", pointerEvents: "none", zIndex: 10 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
                        <select required value={reg.year} onChange={e => setReg(r => ({ ...r, year: e.target.value }))}
                          className={inpReg()} style={{ ...inpStyle, appearance: "none" as const, backgroundColor: isDark ? "#1a1a2e" : "#ffffff", color: cardText }}>
                          <option value="" disabled style={{ background: isDark ? "#1a1a2e" : "#ffffff", color: cardText }}>Select Year</option>
                          <option value="1"         style={{ background: isDark ? "#1a1a2e" : "#ffffff", color: cardText }}>1st Year</option>
                          <option value="2"         style={{ background: isDark ? "#1a1a2e" : "#ffffff", color: cardText }}>2nd Year</option>
                          <option value="3"         style={{ background: isDark ? "#1a1a2e" : "#ffffff", color: cardText }}>3rd Year</option>
                          <option value="4"         style={{ background: isDark ? "#1a1a2e" : "#ffffff", color: cardText }}>4th Year</option>
                          <option value="Graduated" style={{ background: isDark ? "#1a1a2e" : "#ffffff", color: cardText }}>Graduated</option>
                        </select>
                      </div>
                    </motion.div>
                    {[{ label: "Password", key: "password" }, { label: "Confirm Password", key: "confirm" }].map(({ label, key }, fi) => (
                      <motion.div key={key} className="col-span-1" custom={6 + fi} variants={staggerItem} initial="hidden" animate="visible">
                        <label className="mb-0.5 block text-xs font-semibold" style={{ color: labelClr }}>{label}</label>
                        <div className="relative">
                          <span style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: iconClr, display: "flex", pointerEvents: "none", zIndex: 10 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                          <input type="password" required placeholder="••••••••" value={reg[key as keyof typeof reg]}
                            onChange={e => setReg(r => ({ ...r, [key]: e.target.value }))} className={inpReg()} style={inpStyle} />
                        </div>
                      </motion.div>
                    ))}
                    {regError && <motion.p className="col-span-2 text-xs text-red-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{regError}</motion.p>}
                    <motion.button type="submit" disabled={regLoading}
                      className="col-span-2 w-full rounded-full py-2 text-sm font-bold disabled:opacity-60"
                      style={submitStyle} custom={8} variants={staggerItem} initial="hidden" animate="visible" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {regLoading ? "Creating…" : "Create Account →"}
                    </motion.button>
                    <motion.div className="col-span-2 relative text-center" custom={9} variants={staggerItem} initial="hidden" animate="visible">
                      <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: `1px solid ${inputBdr}` }} /></div>
                      <span className="relative px-3 text-xs font-semibold tracking-widest uppercase" style={{ background: cardBg, color: mutedClr }}>OR SIGN UP WITH</span>
                    </motion.div>
                    <motion.div className="col-span-2 flex gap-2" custom={10} variants={staggerItem} initial="hidden" animate="visible">
                      <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold hover:opacity-80" style={socialStyle}><GoogleIcon /> Google</button>
                      <button type="button" onClick={() => window.location.href = `${api.defaults.baseURL}/auth/github`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold hover:opacity-80" style={socialStyle}><GitHubIcon color={cardText} /> GitHub</button>
                    </motion.div>
                    <motion.p className="col-span-2 text-center text-xs" style={{ color: labelClr }} custom={11} variants={staggerItem} initial="hidden" animate="visible">
                      Already have an account? <button type="button" onClick={() => switchTab("login")} className="font-bold text-amber-400">Sign in</button>
                    </motion.p>
                  </form>
                </motion.div>
              )}

              {tab === "forgot" && (
                <motion.div key="forgot" variants={tabVariants} initial="enter" animate="center" exit="exit">
                  <div className="mb-5 text-center">
                    <motion.h1 className="text-xl font-bold" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>Reset Password</motion.h1>
                    <motion.p className="mt-1 text-xs" style={{ color: labelClr }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                      {forgotStep === "email" ? "Enter your email to receive an OTP" : forgotStep === "otp" ? "Enter the OTP and your new password" : "Password reset successfully"}
                    </motion.p>
                  </div>
                  {forgotStep === "done" ? (
                    <motion.div className="flex flex-col items-center gap-4 py-2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <AnimatedCheckCircle size={36} />
                      <p className="text-center text-sm font-semibold text-green-400">{forgotMsg}</p>
                      <motion.button onClick={() => { switchTab("login"); setForgotStep("email"); setForgotMsg(""); }}
                        className="rounded-full px-8 py-2.5 text-sm font-bold" style={submitStyle} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Back to Login</motion.button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleForgot} className="flex flex-col gap-3">
                      {[
                        { label: "Email Address", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>, ph: "Email", type: "email", val: forgotEmail, set: (v: string) => setForgotEmail(v) },
                        ...(forgotStep === "otp" ? [
                          { label: "Email OTP", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, ph: "6-digit OTP", type: "text", val: forgotOtp, set: (v: string) => setForgotOtp(v) },
                          { label: "New Password", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, ph: "New password", type: "password", val: forgotNew, set: (v: string) => setForgotNew(v) },
                          { label: "Confirm Password", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, ph: "Confirm password", type: "password", val: forgotConfirm, set: (v: string) => setForgotConfirm(v) },
                        ] : []),
                      ].map((f, i) => (
                        <motion.div key={f.label} custom={i} variants={staggerItem} initial="hidden" animate="visible">
                          <label className="mb-1 block text-xs font-semibold" style={{ color: labelClr }}>{f.label}</label>
                          <div className="relative">
                            <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: iconClr, display: "flex", pointerEvents: "none", zIndex: 10 }}>{f.icon}</span>
                            <input type={f.type} required placeholder={f.ph} value={f.val}
                              onChange={e => f.set(e.target.value)} disabled={f.label === "Email Address" && forgotStep === "otp"}
                              className={inp()} style={{ ...inpStyle, opacity: f.label === "Email Address" && forgotStep === "otp" ? 0.6 : 1 }} />
                          </div>
                        </motion.div>
                      ))}
                      {forgotMsg   && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold text-green-400">{forgotMsg}</motion.p>}
                      {forgotError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold text-red-400">{forgotError}</motion.p>}
                      <motion.button type="submit" disabled={forgotLoading} className="w-full rounded-full py-2.5 text-sm font-bold disabled:opacity-60" style={submitStyle} custom={3} variants={staggerItem} initial="hidden" animate="visible" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        {forgotLoading ? "Please wait…" : forgotStep === "email" ? "Send OTP →" : "Reset Password →"}
                      </motion.button>
                      <motion.p className="text-center text-xs" style={{ color: labelClr }} custom={4} variants={staggerItem} initial="hidden" animate="visible">
                        Remember your password? <button type="button" onClick={() => { switchTab("login"); setForgotStep("email"); }} className="font-bold text-amber-400">Sign in</button>
                      </motion.p>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080710] text-indigo-500 font-bold text-sm">
        Loading Login...
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
