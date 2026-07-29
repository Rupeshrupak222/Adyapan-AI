"use client";

import { motion } from "framer-motion";
import {
  FileText, Megaphone, Layout, Images, MessageSquare,
  HelpCircle, Briefcase, FileCheck, Clock, Eye,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface ContentSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  itemCount: number;
  lastUpdated: string;
  status: "Published" | "Draft";
  description: string;
}

const CONTENT_SECTIONS: ContentSection[] = [
  { id: "blogs", title: "Blogs", icon: <FileText size={16} />, itemCount: 47, lastUpdated: "2 hours ago", status: "Published", description: "Platform blog posts and articles" },
  { id: "announcements", title: "Announcements", icon: <Megaphone size={16} />, itemCount: 12, lastUpdated: "1 day ago", status: "Published", description: "System-wide announcements and alerts" },
  { id: "landing-pages", title: "Landing Pages", icon: <Layout size={16} />, itemCount: 8, lastUpdated: "3 days ago", status: "Published", description: "Marketing and feature landing pages" },
  { id: "banners", title: "Banners", icon: <Images size={16} />, itemCount: 6, lastUpdated: "5 days ago", status: "Draft", description: "Hero banners and promotional images" },
  { id: "testimonials", title: "Testimonials", icon: <MessageSquare size={16} />, itemCount: 24, lastUpdated: "1 week ago", status: "Published", description: "User testimonials and success stories" },
  { id: "faq", title: "FAQ", icon: <HelpCircle size={16} />, itemCount: 36, lastUpdated: "2 weeks ago", status: "Published", description: "Frequently asked questions and answers" },
  { id: "career-pages", title: "Career Pages", icon: <Briefcase size={16} />, itemCount: 4, lastUpdated: "1 month ago", status: "Draft", description: "Careers and job listing pages" },
  { id: "legal-pages", title: "Legal Pages", icon: <FileCheck size={16} />, itemCount: 5, lastUpdated: "3 weeks ago", status: "Published", description: "Privacy policy, terms, and legal docs" },
];

function formatRelativeTime(dateStr: string): string {
  return dateStr;
}

export default function ContentManagement() {
  const totalItems = CONTENT_SECTIONS.reduce((sum, s) => sum + s.itemCount, 0);
  const publishedCount = CONTENT_SECTIONS.filter((s) => s.status === "Published").length;

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Content Management"
        description="Manage all platform content, pages, and media"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" pulse>{publishedCount}/{CONTENT_SECTIONS.length} Live</StatusBadge>
            <StatusBadge variant="info">{totalItems} Items</StatusBadge>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CONTENT_SECTIONS.map((section, idx) => (
          <ContentCard key={section.id} section={section} delay={idx * 0.035} />
        ))}
      </div>
    </div>
  );
}

function ContentCard({ section, delay }: { section: ContentSection; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] cursor-pointer"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <span style={{ color: "#f59e0b" }}>{section.icon}</span>
        </div>
        <StatusBadge variant={section.status === "Published" ? "success" : "warning"}>
          {section.status === "Published" ? <Eye size={10} /> : <Clock size={10} />}
          {section.status}
        </StatusBadge>
      </div>

      <div>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{section.title}</h3>
        <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{section.description}</p>
      </div>

      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--border-color)" }}>
        <div>
          <span className="text-lg font-black font-mono" style={{ color: "#f59e0b" }}>{section.itemCount}</span>
          <span className="text-[10px] font-medium ml-1" style={{ color: "var(--text-muted)" }}>items</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} style={{ color: "var(--text-muted)" }} />
          <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>{formatRelativeTime(section.lastUpdated)}</span>
        </div>
      </div>
    </motion.div>
  );
}
