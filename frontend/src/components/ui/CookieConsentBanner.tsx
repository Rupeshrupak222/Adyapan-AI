"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { api } from "@/services/api";

export function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("adyapan-cookie-preferences");
    if (!saved) {
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = async () => {
    const preferences = {
      essential: true,
      analytics: true,
      functional: true,
      marketing: true,
      status: "accepted",
    };
    localStorage.setItem("adyapan-cookie-preferences", JSON.stringify(preferences));
    setShow(false);

    try {
      await api.post("/legal/cookie-preferences", { action: "accept", preferences });
    } catch {
      // Non-blocking
    }
  };

  const handleDeclineAll = async () => {
    const preferences = {
      essential: true,
      analytics: false,
      functional: false,
      marketing: false,
      status: "declined",
    };
    localStorage.setItem("adyapan-cookie-preferences", JSON.stringify(preferences));
    setShow(false);

    try {
      await api.post("/legal/cookie-preferences", { action: "decline", preferences });
    } catch {
      // Non-blocking
    }
  };

  const handleDismiss = () => {
    handleDeclineAll();
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 sm:p-5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
      style={{
        background: "rgba(18, 18, 30, 0.96)",
        borderColor: "rgba(255, 255, 255, 0.18)",
        color: "#ffffff",
        boxShadow: "0 10px 35px rgba(0, 0, 0, 0.6)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b" }}
          >
            <Cookie size={18} />
          </div>
          <h4
            className="text-sm font-bold"
            style={{ color: "#ffffff", fontFamily: "var(--font-display), sans-serif" }}
          >
            We Value Your Privacy
          </h4>
        </div>
        <button
          onClick={handleDismiss}
          className="transition-colors p-1 rounded-lg cursor-pointer"
          style={{ color: "rgba(255, 255, 255, 0.7)" }}
          aria-label="Dismiss cookie notice"
        >
          <X size={16} />
        </button>
      </div>

      <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255, 255, 255, 0.85)" }}>
        Adyapan AI uses essential and functional cookies to personalize learning, maintain login sessions, and improve platform performance.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleAcceptAll}
          className="flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer shadow-md text-center"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000000" }}
        >
          Accept All
        </button>
        <button
          onClick={handleDeclineAll}
          className="py-2 px-3.5 rounded-xl font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer text-center"
          style={{
            borderColor: "rgba(239, 68, 68, 0.35)",
            background: "rgba(239, 68, 68, 0.15)",
            color: "#fca5a5",
            borderWidth: "1px",
          }}
        >
          Decline
        </button>
        <Link
          href="/cookies"
          onClick={() => setShow(false)}
          className="py-2 px-3 rounded-xl font-semibold text-xs transition-colors text-center cursor-pointer"
          style={{
            borderColor: "rgba(255, 255, 255, 0.25)",
            background: "rgba(255, 255, 255, 0.08)",
            color: "#ffffff",
            borderWidth: "1px",
          }}
        >
          Preferences
        </Link>
      </div>
    </div>
  );
}
