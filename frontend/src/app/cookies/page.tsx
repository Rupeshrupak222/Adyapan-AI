"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Cookie, Shield, Check, ToggleLeft, ToggleRight, Info, Lock } from "lucide-react";
import { toast } from "sonner";

export default function CookiePreferencesPage() {
  const [preferences, setPreferences] = useState({
    essential: true, // Always true & disabled
    analytics: true,
    functional: true,
    marketing: false,
  });

  const handleToggle = (key: "analytics" | "functional" | "marketing") => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    localStorage.setItem("adyapan-cookie-preferences", JSON.stringify(preferences));
    toast.success("Cookie preferences saved successfully!");
  };

  const cookieCategories = [
    {
      key: "essential",
      title: "Essential Cookies",
      badge: "Required",
      badgeColor: "#ef4444",
      desc: "Necessary for core platform operations, authentication tokens, security verification, and session state. These cannot be disabled.",
      enabled: true,
      locked: true,
    },
    {
      key: "functional",
      title: "Functional & Preference Cookies",
      badge: "Recommended",
      badgeColor: "#10b981",
      desc: "Remember your dark/light theme preference, code editor configurations, study planner progress, and auto-saved drafts.",
      enabled: preferences.functional,
      locked: false,
      onToggle: () => handleToggle("functional"),
    },
    {
      key: "analytics",
      title: "Analytics & Performance Cookies",
      badge: "Optional",
      badgeColor: "#3b82f6",
      desc: "Help us aggregate anonymous insights on feature usage, page loading speeds, and ATS check errors so we can improve platform speed.",
      enabled: preferences.analytics,
      locked: false,
      onToggle: () => handleToggle("analytics"),
    },
    {
      key: "marketing",
      title: "Marketing & Communication Cookies",
      badge: "Optional",
      badgeColor: "#f59e0b",
      desc: "Allow customized announcements regarding new AI feature releases, scholarship drives, and tailored career webinars.",
      enabled: preferences.marketing,
      locked: false,
      onToggle: () => handleToggle("marketing"),
    },
  ];

  return (
    <div style={{ background: "var(--bg-dark)", minHeight: "100vh" }}>
      <Navbar />

      <div className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border text-xs font-semibold"
            style={{ background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
          >
            <Cookie size={14} />
            <span>Privacy & Cookie Center</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display), sans-serif" }}
          >
            Cookie <span className="text-gradient">Preferences</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base max-w-2xl mx-auto mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage how Adyapan AI uses cookies and local storage to enhance your learning experience.
          </motion.p>
        </div>
      </div>

      <div className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {cookieCategories.map((cat, index) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08 }}
              className="p-6 rounded-2xl border"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-color)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {cat.title}
                    </h2>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: `${cat.badgeColor}15`, color: cat.badgeColor }}
                    >
                      {cat.badge}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {cat.desc}
                  </p>
                </div>

                <div className="shrink-0 pt-1">
                  {cat.locked ? (
                    <div className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white/5" style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
                      <Lock size={12} />
                      <span>Always Active</span>
                    </div>
                  ) : (
                    <button
                      onClick={cat.onToggle}
                      className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                      aria-label={`Toggle ${cat.title}`}
                    >
                      {cat.enabled ? (
                        <ToggleRight size={36} className="text-amber-500" />
                      ) : (
                        <ToggleLeft size={36} className="text-gray-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Action Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <Info size={16} className="text-amber-500 shrink-0" />
              <span>You can update your cookie preferences at any time from the site footer.</span>
            </div>

            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 cursor-pointer shrink-0"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
            >
              Save Preferences
            </button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
