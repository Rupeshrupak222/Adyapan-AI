"use client";

import { motion } from "framer-motion";
import {
  Building2, GraduationCap, Inbox,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

export default function OrganizationManagement() {
  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Organization Management"
        description="Manage universities, companies, and their subscriptions"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="default">No Data</StatusBadge>
            <StatusBadge variant="info">0 Universities</StatusBadge>
            <StatusBadge variant="info">0 Companies</StatusBadge>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="rounded-2xl border p-10"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex flex-col items-center justify-center text-center py-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Inbox size={30} style={{ color: "rgba(255,255,255,0.18)" }} />
          </div>
          <h3 className="text-base font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
            No Organization Data
          </h3>
          <p className="text-xs max-w-md leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Organization accounts (universities and company partnerships) are not implemented yet.
            Once the platform supports organization sign-up and billing, their data will appear here.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <GraduationCap size={14} style={{ color: "#f59e0b" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#f59e0b" }}>Universities</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)" }}>
              <Building2 size={14} style={{ color: "#818cf8" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#818cf8" }}>Companies</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
