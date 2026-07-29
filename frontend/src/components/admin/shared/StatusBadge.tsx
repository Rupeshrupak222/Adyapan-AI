"use client";

interface StatusBadgeProps {
  variant?: "success" | "warning" | "error" | "info" | "default";
  children: React.ReactNode;
  pulse?: boolean;
}

const variants = {
  success: { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)" },
  warning: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
  error: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.3)" },
  info: { bg: "rgba(99,102,241,0.12)", color: "#818cf8", border: "rgba(99,102,241,0.3)" },
  default: { bg: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "rgba(255,255,255,0.1)" },
};

export function StatusBadge({ variant = "default", children, pulse }: StatusBadgeProps) {
  const v = variants[variant];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full" style={{ background: v.color }} />}
      {children}
    </span>
  );
}
