"use client";

import { motion } from "framer-motion";
import {
  Server, Box, Container, Cloud, Database,
  Globe, Zap, HardDrive, Cpu, Layers,
  Wifi, Activity, Archive,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface InfrastructureComponent {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: "healthy" | "degraded" | "down";
  version: string;
  metrics: { label: string; value: string }[];
  cpu: number;
  ram: number;
  storage: number;
  traffic: number;
}

const COMPONENTS: InfrastructureComponent[] = [
  {
    id: "servers",
    name: "Servers",
    icon: <Server size={16} />,
    status: "healthy",
    version: "Ubuntu 22.04 LTS",
    metrics: [{ label: "Instances", value: "12" }, { label: "Uptime", value: "143d" }],
    cpu: 42, ram: 58, storage: 63, traffic: 71,
  },
  {
    id: "containers",
    name: "Containers",
    icon: <Box size={16} />,
    status: "healthy",
    version: "Docker 25.0",
    metrics: [{ label: "Running", value: "24" }, { label: "Stopped", value: "3" }],
    cpu: 38, ram: 45, storage: 32, traffic: 55,
  },
  {
    id: "docker",
    name: "Docker Compose",
    icon: <Container size={16} />,
    status: "healthy",
    version: "v2.24",
    metrics: [{ label: "Stacks", value: "6" }, { label: "Services", value: "18" }],
    cpu: 25, ram: 30, storage: 20, traffic: 40,
  },
  {
    id: "cloudinary",
    name: "Cloudinary",
    icon: <Cloud size={16} />,
    status: "healthy",
    version: "API v2",
    metrics: [{ label: "Assets", value: "14.2k" }, { label: "Bandwidth", value: "2.4 TB" }],
    cpu: 0, ram: 0, storage: 78, traffic: 85,
  },
  {
    id: "s3",
    name: "S3 Storage",
    icon: <Archive size={16} />,
    status: "healthy",
    version: "Standard",
    metrics: [{ label: "Objects", value: "89.1k" }, { label: "Size", value: "156 GB" }],
    cpu: 0, ram: 0, storage: 44, traffic: 62,
  },
  {
    id: "cdn",
    name: "CDN",
    icon: <Globe size={16} />,
    status: "healthy",
    version: "CloudFront",
    metrics: [{ label: "Edge Locations", value: "47" }, { label: "Cache Hit", value: "94%" }],
    cpu: 0, ram: 0, storage: 10, traffic: 92,
  },
  {
    id: "redis",
    name: "Redis",
    icon: <Zap size={16} />,
    status: "healthy",
    version: "7.2.4",
    metrics: [{ label: "Connected Clients", value: "156" }, { label: "Hit Rate", value: "98.7%" }],
    cpu: 18, ram: 22, storage: 15, traffic: 88,
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    icon: <Database size={16} />,
    status: "degraded",
    version: "16.2",
    metrics: [{ label: "Connections", value: "72/100" }, { label: "Query Time", value: "24ms" }],
    cpu: 55, ram: 68, storage: 71, traffic: 76,
  },
  {
    id: "prisma",
    name: "Prisma ORM",
    icon: <HardDrive size={16} />,
    status: "healthy",
    version: "5.12",
    metrics: [{ label: "Queries/min", value: "1.2k" }, { label: "Cache Hit", value: "91%" }],
    cpu: 12, ram: 15, storage: 5, traffic: 78,
  },
  {
    id: "queues",
    name: "Queues (Bull)",
    icon: <Layers size={16} />,
    status: "healthy",
    version: "4.12",
    metrics: [{ label: "Pending Jobs", value: "23" }, { label: "Failed Jobs", value: "2" }],
    cpu: 8, ram: 12, storage: 8, traffic: 45,
  },
];

function statusVariant(s: InfrastructureComponent["status"]) {
  switch (s) {
    case "healthy": return "success" as const;
    case "degraded": return "warning" as const;
    case "down": return "error" as const;
  }
}

function barColor(v: number): string {
  if (v < 50) return "#10b981";
  if (v < 75) return "#f59e0b";
  return "#ef4444";
}

export default function Infrastructure() {
  const healthyCount = COMPONENTS.filter((c) => c.status === "healthy").length;
  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Infrastructure"
        description="Monitor infrastructure components, resource usage, and system health"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" pulse>{healthyCount}/{COMPONENTS.length} Healthy</StatusBadge>
            <StatusBadge variant="info">v2.4.1</StatusBadge>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {COMPONENTS.map((comp, idx) => (
          <InfraCard key={comp.id} comp={comp} delay={idx * 0.03} />
        ))}
      </div>
    </div>
  );
}

function InfraCard({ comp, delay }: { comp: InfrastructureComponent; delay: number }) {
  const sv = statusVariant(comp.status);
  const bars = [
    { label: "CPU", value: comp.cpu },
    { label: "RAM", value: comp.ram },
    { label: "Storage", value: comp.storage },
    { label: "Traffic", value: comp.traffic },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] cursor-pointer"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <span style={{ color: "#f59e0b" }}>{comp.icon}</span>
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{comp.name}</p>
            <p className="text-[9px] font-mono font-medium" style={{ color: "var(--text-muted)" }}>{comp.version}</p>
          </div>
        </div>
        <StatusBadge variant={sv} pulse={comp.status === "healthy"}>{comp.status}</StatusBadge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {comp.metrics.map((m) => (
          <div key={m.label} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)" }}>
            <div className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>{m.label}</div>
            <div className="text-[11px] font-bold font-mono" style={{ color: "var(--text-primary)" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Resource bars */}
      <div className="space-y-2 pt-1">
        {bars.filter((b) => b.value > 0).map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{b.label}</span>
              <span className="text-[8px] font-mono font-bold" style={{ color: barColor(b.value) }}>{b.value}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${b.value}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: barColor(b.value) }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
