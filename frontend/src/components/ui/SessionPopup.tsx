"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Shared popup styled like the user-login session popup — a frosted glass card
 * over a blurred dark overlay, with Cancel + amber primary buttons. Renders a
 * proper glass card in BOTH light and dark themes (it does not fall back to the
 * theme's solid --bg-card, which would show as a plain white box in light mode).
 */

export interface SessionPopupAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
}

interface SessionPopupProps {
  open: boolean;
  message: ReactNode;
  actions: SessionPopupAction[];
  onOverlayClick?: () => void;
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const read = () => {
      const t =
        document.documentElement.getAttribute("data-theme") ||
        localStorage.getItem("adyapan-theme") ||
        "dark";
      setIsDark(t !== "light");
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export function SessionPopup({ open, message, actions, onOverlayClick }: SessionPopupProps) {
  const isDark = useIsDark();
  if (!open) return null;

  // Frosted glass card — translucent so the blurred backdrop shows through, in
  // both themes.
  const card = isDark
    ? {
        background: "rgba(20,22,34,0.72)",
        borderColor: "rgba(255,255,255,0.14)",
        color: "#ffffff",
        boxShadow: "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
      }
    : {
        background: "rgba(255,255,255,0.72)",
        borderColor: "rgba(255,255,255,0.9)",
        color: "#0f172a",
        boxShadow: "0 24px 60px rgba(31,38,135,0.22), inset 0 1px 0 rgba(255,255,255,0.6)",
      };

  const secondary = isDark
    ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.12)" }
    : { background: "rgba(0,0,0,0.04)", color: "#475569", border: "1px solid rgba(0,0,0,0.10)" };

  const actionStyle = (variant: SessionPopupAction["variant"]) => {
    if (variant === "secondary") return secondary;
    if (variant === "danger") return { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" };
    return { background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.30)" };
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={onOverlayClick}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm border"
        style={{
          background: card.background,
          borderColor: card.borderColor,
          color: card.color,
          boxShadow: card.boxShadow,
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm leading-relaxed mb-5" style={{ color: card.color }}>
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              style={actionStyle(a.variant)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
