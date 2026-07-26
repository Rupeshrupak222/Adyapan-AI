"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CodingAssessmentPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem("dashboard-active-view", "placement-coding-assessment");
    } catch {}
    router.replace("/dashboard/user");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-secondary)" }}>
      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Redirecting to AI Coding Assessment Platform...</span>
    </div>
  );
}
