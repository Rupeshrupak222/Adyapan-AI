"use client";

import { ShieldCheck, XCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export function EligibilityChip({
  verdict,
  score,
  className,
  size = "md",
}: {
  verdict: "eligible" | "not_eligible" | "insufficient_data" | string;
  score?: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const isEligible = verdict === "eligible";
  const isNoData = verdict === "insufficient_data";
  const Icon = isEligible ? ShieldCheck : isNoData ? ShieldAlert : XCircle;
  const label = isEligible ? "Eligible" : isNoData ? "No Data" : "Not Eligible";
  const color = isEligible ? "#10b981" : isNoData ? "#94a3b8" : "#ef4444";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-extrabold uppercase tracking-wider border",
        size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        className
      )}
      style={{ background: `${color}18`, color, borderColor: `${color}45` }}
      title={label}
    >
      <Icon size={size === "sm" ? 10 : 11} />
      {label}
      {typeof score === "number" && score > 0 && (
        <span className="opacity-70 tabular-nums">&middot; {score}%</span>
      )}
    </span>
  );
}