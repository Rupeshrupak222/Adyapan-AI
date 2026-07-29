"use client";

import { motion } from "framer-motion";
import {
  Building2, GraduationCap, Users, CreditCard,
  MapPin, Globe,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface Organization {
  id: string;
  name: string;
  type: "University" | "Company";
  location: string;
  members: number;
  activeSubscriptions: number;
  status: "Active" | "Suspended" | "Pending" | "Trial";
  logo: string;
}

const ORGANIZATIONS: Organization[] = [
  { id: "org-1", name: "LPU", type: "University", location: "Phagwara, Punjab", members: 12450, activeSubscriptions: 8900, status: "Active", logo: "L" },
  { id: "org-2", name: "SRM", type: "University", location: "Chennai, Tamil Nadu", members: 9800, activeSubscriptions: 7200, status: "Active", logo: "S" },
  { id: "org-3", name: "VIT", type: "University", location: "Vellore, Tamil Nadu", members: 11200, activeSubscriptions: 8100, status: "Active", logo: "V" },
  { id: "org-4", name: "IIT", type: "University", location: "Multiple Campuses", members: 6700, activeSubscriptions: 5400, status: "Active", logo: "I" },
  { id: "org-5", name: "Microsoft", type: "Company", location: "Hyderabad, Telangana", members: 3400, activeSubscriptions: 2800, status: "Active", logo: "M" },
  { id: "org-6", name: "Infosys", type: "Company", location: "Bangalore, Karnataka", members: 5100, activeSubscriptions: 3900, status: "Active", logo: "I" },
  { id: "org-7", name: "Google", type: "Company", location: "Bangalore, Karnataka", members: 2900, activeSubscriptions: 2100, status: "Trial", logo: "G" },
  { id: "org-8", name: "Amazon", type: "Company", location: "Hyderabad, Telangana", members: 4800, activeSubscriptions: 3500, status: "Active", logo: "A" },
];

function statusVariant(s: Organization["status"]) {
  switch (s) {
    case "Active": return "success" as const;
    case "Suspended": return "error" as const;
    case "Pending": return "warning" as const;
    case "Trial": return "info" as const;
  }
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function OrganizationManagement() {
  const universities = ORGANIZATIONS.filter((o) => o.type === "University");
  const companies = ORGANIZATIONS.filter((o) => o.type === "Company");

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Organization Management"
        description="Manage universities, companies, and their subscriptions"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" pulse>{ORGANIZATIONS.length} Organizations</StatusBadge>
            <StatusBadge variant="info">{universities.length} Universities</StatusBadge>
            <StatusBadge variant="info">{companies.length} Companies</StatusBadge>
          </div>
        }
      />

      {/* Universities */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap size={18} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Universities</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {universities.map((org, idx) => (
            <OrgCard key={org.id} org={org} delay={idx * 0.04} />
          ))}
        </div>
      </div>

      {/* Companies */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} style={{ color: "#818cf8" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Companies</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {companies.map((org, idx) => (
            <OrgCard key={org.id} org={org} delay={idx * 0.04} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrgCard({ org, delay }: { org: Organization; delay: number }) {
  const sv = statusVariant(org.status);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] cursor-pointer"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black shrink-0"
          style={{
            background: org.type === "University"
              ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))"
              : "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(129,140,248,0.05))",
            border: `1px solid ${org.type === "University" ? "rgba(245,158,11,0.3)" : "rgba(129,140,248,0.3)"}`,
            color: org.type === "University" ? "#f59e0b" : "#818cf8",
          }}
        >
          {org.logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{org.name}</p>
            <StatusBadge variant={sv} pulse={org.status === "Active"}>{org.status}</StatusBadge>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={10} style={{ color: "var(--text-muted)" }} />
            <span className="text-[10px] font-medium truncate" style={{ color: "var(--text-muted)" }}>{org.location}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)" }}>
          <Users size={13} style={{ color: "#f59e0b" }} />
          <div>
            <div className="text-xs font-bold font-mono" style={{ color: "var(--text-primary)" }}>{formatNumber(org.members)}</div>
            <div className="text-[8px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Members</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)" }}>
          <CreditCard size={13} style={{ color: "#10b981" }} />
          <div>
            <div className="text-xs font-bold font-mono" style={{ color: "var(--text-primary)" }}>{formatNumber(org.activeSubscriptions)}</div>
            <div className="text-[8px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Subscriptions</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Globe size={10} style={{ color: "var(--text-muted)" }} />
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{org.type}</span>
      </div>
    </motion.div>
  );
}
