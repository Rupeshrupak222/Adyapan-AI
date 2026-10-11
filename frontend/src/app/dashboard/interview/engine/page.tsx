"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const EngineView = dynamic(
  () => import("@/components/interview-hub/engine/EngineView").then(m => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#080710] flex items-center justify-center" style={{ fontFamily: "var(--font-sans)" }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 animate-pulse">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-white text-lg font-bold">Loading Interview Engine...</h2>
          <p className="text-white/40 text-sm">Preparing your AI-powered interview experience</p>
        </div>
      </div>
    )
  }
);

export default function EnginePage() {
  useRequireAuth("USER");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    const obs = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme") || "dark";
      setTheme(t);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-x-hidden overflow-y-auto"
      style={{ background: "var(--bg-dark)", color: "var(--text-primary)" }}
    >
      <EngineView theme={theme} />
    </div>
  );
}
