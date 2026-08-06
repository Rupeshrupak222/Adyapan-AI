"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/services/api";
import { clearAuthSession } from "@/hooks/useAuth";
import { getDiceBearUrl } from "@/lib/avatar";
import {
  Search, Crown, Bell, ChevronDown, Menu,
  User, LogOut, Settings, CreditCard, TrendingUp, Award,
  BookOpen, Code2, FileText, Mic, Briefcase, UserCircle, Wand2,
  GraduationCap, LayoutDashboard, Sun, Moon, BookMarked, ClipboardList,
  Star, Zap, LineChart, Trophy, MessageCircle, Users, X,
} from "lucide-react";
import { cn } from "@/lib/cn";
export interface AdyapanUser {
  name: string;
  email: string;
  role?: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  submenu?: { label: string; href: string }[];
}



// ΓöÇΓöÇΓöÇ Search Index ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
interface SearchEntry { label: string; viewId: string; category: string; }
const SEARCH_INDEX: SearchEntry[] = [
  { label: "Dashboard", viewId: "dashboard", category: "General" },
  { label: "Career Dashboard", viewId: "career-dashboard", category: "General" },
  { label: "Profile", viewId: "profile", category: "General" },
  { label: "Community Profile", viewId: "community-profile", category: "General" },
  { label: "Settings", viewId: "settings", category: "General" },
  { label: "Billing", viewId: "billing", category: "General" },
  { label: "Ady Chat", viewId: "ady-chat", category: "General" },
  { label: "Notifications", viewId: "notifications", category: "General" },
  { label: "Progress Tracking", viewId: "progress-hub", category: "General" },
  { label: "Study Assistant", viewId: "study-assistant", category: "Learning Hub" },
  { label: "Notes Generator", viewId: "notes-generator", category: "Learning Hub" },
  { label: "Quiz Generator", viewId: "quiz-generator", category: "Learning Hub" },
  { label: "Assignment Generator", viewId: "assignment-generator", category: "Learning Hub" },
  { label: "PPT Generator", viewId: "ppt-generator", category: "Learning Hub" },
  { label: "Mind Maps", viewId: "mind-maps", category: "Learning Hub" },
  { label: "Flashcards", viewId: "flashcards", category: "Learning Hub" },
  { label: "Study Planner", viewId: "study-planner", category: "Learning Hub" },
  { label: "Learning Streak", viewId: "learning-streak", category: "Learning Hub" },
  { label: "DSA Practice", viewId: "dsa-practice", category: "Coding Hub" },
  { label: "Coding Dashboard", viewId: "coding-dashboard", category: "Coding Hub" },
  { label: "Coding Assistant", viewId: "coding-assistant", category: "Coding Hub" },
  { label: "Coding Challenges", viewId: "coding-challenges", category: "Coding Hub" },
  { label: "GitHub Portfolio", viewId: "github-portfolio", category: "Coding Hub" },
  { label: "Resume Builder", viewId: "resume-builder", category: "Resume Hub" },
  { label: "Resume Upload", viewId: "resume-upload", category: "Resume Hub" },
  { label: "ATS Score Checker", viewId: "ats-checker", category: "Resume Hub" },
  { label: "Cover Letter Generator", viewId: "cover-letter", category: "Resume Hub" },
  { label: "LinkedIn Optimizer", viewId: "linkedin-optimizer", category: "Resume Hub" },
  { label: "Career Roadmap", viewId: "career-roadmap", category: "Resume Hub" },
  { label: "AI HR Interview", viewId: "interview-hub", category: "Interview Hub" },
  { label: "AI Technical Interview", viewId: "interview-hub", category: "Interview Hub" },
  { label: "Interview Engine", viewId: "interview-engine", category: "Interview Hub" },
  { label: "Research Paper AI", viewId: "research-hub", category: "Research Hub" },
  { label: "Plagiarism Checker", viewId: "research-plagiarism", category: "Research Hub" },
  { label: "Job Discovery", viewId: "job-discovery", category: "Job Hub" },
  { label: "Discover Jobs", viewId: "job-discovery", category: "Job Hub" },
  { label: "Search All Jobs", viewId: "job-discovery", category: "Job Hub" },
  { label: "Saved Jobs", viewId: "job-discovery", category: "Job Hub" },
  { label: "Aptitude Practice", viewId: "placement-hub", category: "Placement Hub" },
  { label: "Technical MCQs", viewId: "placement-hub", category: "Placement Hub" },
  { label: "Placement Intelligence", viewId: "placement-intelligence", category: "Placement Hub" },
  { label: "Company Match Analysis", viewId: "placement-intelligence", category: "Placement Hub" },
  { label: "AI Placement Score", viewId: "placement-intelligence", category: "Placement Hub" },
  { label: "AI Aptitude Engine", viewId: "aptitude-engine", category: "Placement Hub" },
  { label: "Aptitude Analytics", viewId: "aptitude-engine-analytics", category: "Placement Hub" },
  { label: "Daily Challenge", viewId: "aptitude-engine", category: "Placement Hub" },
  { label: "Company Tests", viewId: "aptitude-engine", category: "Placement Hub" },
  { label: "Email Writer", viewId: "prod-email", category: "Productivity" },
  { label: "SOP Generator", viewId: "prod-sop", category: "Productivity" },
  { label: "LinkedIn Post Generator", viewId: "prod-linkedin", category: "Productivity" },
  { label: "Content Writer", viewId: "prod-content", category: "Productivity" },
  { label: "Progress Tracker", viewId: "analytics-hub", category: "Analytics" },
  { label: "Interview Progress", viewId: "analytics-hub", category: "Analytics" },
  { label: "Skill Growth", viewId: "analytics-hub", category: "Analytics" },
  { label: "Community", viewId: "community-browse", category: "Community" },
  { label: "Browse Profiles", viewId: "community-browse", category: "Community" },
  { label: "Messages", viewId: "community-messages", category: "Community" },
  { label: "Blog", viewId: "community-blog", category: "Community" },
  { label: "Write Blog", viewId: "community-blog", category: "Community" },
];

// ΓöÇΓöÇΓöÇ Sidebar Data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const sidebarItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, href: "/dashboard/user" },
  {
    id: "learning", label: "Learning Hub", icon: <GraduationCap size={18} />,
    submenu: [
      { label: "Study Assistant", href: "/dashboard/user?view=study-assistant" },
      { label: "Notes Generator", href: "/dashboard/user?view=notes-generator" },
      { label: "Quiz Generator", href: "/dashboard/user?view=quiz-generator" },
      { label: "Assignment Generator", href: "/dashboard/user?view=assignment-generator" },
      { label: "PPT Generator", href: "/dashboard/user?view=ppt-generator" },
      { label: "Mind Maps", href: "/dashboard/user?view=mind-maps" },
      { label: "Flashcards", href: "/dashboard/user?view=flashcards" },
      { label: "Study Planner", href: "/dashboard/user?view=study-planner" },
      { label: "Learning Streak", href: "/dashboard/user?view=learning-streak" },
    ],
  },
  {
    id: "coding", label: "Coding Hub", icon: <Code2 size={18} />,
    submenu: [
      { label: "Coding Dashboard", href: "/dashboard/coding?tab=dashboard" },
      { label: "Coding Roadmap", href: "/dashboard/coding?tab=roadmap" },
      { label: "DSA Practice", href: "/dashboard/coding?tab=dsa" },
      { label: "Coding Assistant", href: "/dashboard/user?view=coding-assistant" },
      { label: "Coding Challenges", href: "/dashboard/user?view=coding-challenges" },
      { label: "GitHub Portfolio Builder", href: "/dashboard/user?view=github-portfolio" },
    ],
  },
  {
    id: "resume", label: "Resume Hub", icon: <FileText size={18} />,
    submenu: [
      { label: "Career Dashboard", href: "/dashboard/career?tab=dashboard" },
      { label: "Upload Resume", href: "/dashboard/user?view=resume-upload" },
      { label: "Resume Builder", href: "/dashboard/user?view=resume-hub" },
      { label: "ATS Score Checker", href: "/dashboard/user?view=ats-checker" },
      { label: "Resume Improvements", href: "/dashboard/user?view=resume-improvements" },
      { label: "Cover Letter Generator", href: "/dashboard/user?view=cover-letter" },
      { label: "LinkedIn Optimizer", href: "/dashboard/user?view=linkedin-optimizer" },
      { label: "Career Roadmap", href: "/dashboard/career?tab=roadmap" },
    ],
  },
  {
    id: "interview", label: "Interview Hub", icon: <Mic size={18} />,
    submenu: [
      { label: "Interview Engine", href: "/dashboard/interview/engine" },
      { label: "AI HR Interview", href: "/dashboard/interview/hr" },
      { label: "AI Technical Interview", href: "/dashboard/interview/technical" },
    ],
  },
  {
    id: "research", label: "Research Hub", icon: <BookOpen size={18} />,
    submenu: [
      { label: "Research Paper AI", href: "/dashboard/user?view=research-paper-ai" },
      { label: "Plagiarism Checker", href: "/dashboard/user?view=research-plagiarism" },
    ],
  },
  {
    id: "job", label: "Job Hub", icon: <UserCircle size={18} />,
    submenu: [
      { label: "Job Discovery", href: "/dashboard/user?view=job-discovery" },
    ],
  },
  {
    id: "placement", label: "Placement Hub", icon: <Trophy size={18} />,
    submenu: [
      { label: "AI Aptitude Engine", href: "/dashboard/user?view=placement-aptitude" },
      { label: "Technical MCQs", href: "/dashboard/user?view=placement-mcqs" },
    ],
  },
  {
    id: "productivity", label: "AI Productivity", icon: <Wand2 size={18} />,
    submenu: [
      { label: "AI Chat Assistant", href: "/dashboard/user?view=ady-chat" },
      { label: "Email Writer", href: "/dashboard/user?view=prod-email" },
      { label: "SOP Generator", href: "/dashboard/user?view=prod-sop" },
      { label: "LinkedIn Post Gen", href: "/dashboard/user?view=prod-linkedin" },
      { label: "Content Writer", href: "/dashboard/user?view=prod-content" },
    ],
  },
  {
    id: "analytics", label: "Analytics", icon: <LineChart size={18} />,
    submenu: [
      { label: "Progress Tracker", href: "/dashboard/user?view=progress-hub" },
      { label: "Interview Progress", href: "/dashboard/user?view=analytics-interview" },
      { label: "Resume Score", href: "/dashboard/user?view=analytics-resume" },
      { label: "Skill Growth", href: "/dashboard/user?view=analytics-skills" },
    ],
  },
  {
    id: "community", label: "Community", icon: <Users size={18} />,
    submenu: [
      { label: "Browse Profiles", href: "/dashboard/user?view=community-browse" },
      { label: "Messages", href: "/dashboard/user?view=community-messages" },
      { label: "Blog", href: "/dashboard/user?view=community-blog" },
    ],
  },
];

// ΓöÇΓöÇΓöÇ Sidebar Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export function DashboardSidebar({ activeView, onViewDashboard, onViewTool, sidebarOpen, setSidebarOpen }: {
  activeView: string;
  onViewDashboard: () => void;
  onViewTool: (tool: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const router = useRouter();

  const toggleItem = (id: string) => {
    setOpenItem((prev) => (prev === id ? null : id));
  };

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [sidebarOpen]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, top: 70, zIndex: 119,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            transition: "opacity 0.3s ease",
          }}
        />
      )}
      <aside className={`dash-sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Mobile close button */}
        <div className="mobile-close-btn" style={{ display: "none", justifyContent: "flex-end", padding: "0.5rem 0.5rem 0" }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 4, color: "var(--text-secondary)",
            }}
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Dashboard */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
          onClick={() => {
            onViewDashboard();
            setSidebarOpen(false);
          }}
          style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.55rem 0.5rem", borderRadius: 12, marginBottom: 2,
            color: activeView === "dashboard" ? "var(--primary)" : "var(--text-secondary)",
            background: activeView === "dashboard" ? "rgba(245,158,11,0.1)" : "transparent",
            border: activeView === "dashboard" ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
            fontWeight: 500, fontSize: "0.82rem", cursor: "pointer", width: "100%",
            textAlign: "left", whiteSpace: "nowrap",
          }}
        >
          <span style={{ flexShrink: 0 }}><LayoutDashboard size={18} /></span>
          <span className="sb-label">Dashboard</span>
        </motion.button>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border-color)", margin: "0.5rem 0.3rem 0.7rem" }} />

        {/* Hub items (skip dashboard since it's a top button) */}
        {sidebarItems.filter(item => item.id !== "dashboard").map((item) => {
          const isOpen = openItem === item.id;
          return (
            <div key={item.id} className={isOpen ? "sb-item open" : "sb-item"}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
                onClick={() => {
                  if (item.submenu && item.submenu.length > 0) {
                    toggleItem(item.id);
                  } else if (item.href && item.href !== "#") {
                    router.push(item.href);
                    setSidebarOpen(false);
                  } else {
                    onViewTool(item.id);
                    setSidebarOpen(false);
                  }
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.55rem 0.5rem", borderRadius: 12, marginBottom: 2,
                  color: activeView === item.id ? "var(--primary)" : "var(--text-secondary)",
                  background: activeView === item.id ? "rgba(245,158,11,0.1)" : "transparent",
                  border: activeView === item.id ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
                  fontWeight: 500, fontSize: "0.82rem", cursor: "pointer", width: "100%",
                  transition: "all 0.2s ease", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (activeView !== item.id) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeView !== item.id) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }
                }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span className="sb-label" style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                {item.submenu && item.submenu.length > 0 && (
                  <span className="sb-arrow" style={{ marginLeft: "auto", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <ChevronDown size={13} />
                  </span>
                )}
              </motion.button>
              {/* Submenu: visible when open AND sidebar is hovered */}
              {isOpen && (
                <div className="sb-submenu" style={{ paddingLeft: "1.2rem" }}>
                  {item.submenu?.map((sub) => (
                    <a
                      key={sub.label}
                      href={sub.href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (sub.href && sub.href !== "#") {
                          router.push(sub.href);
                          setSidebarOpen(false);
                          return;
                        }

                        else if (sub.label === "Resume Builder") onViewTool("resume-hub");
                        else if (sub.label === "Upload Resume") onViewTool("resume-upload");
                        else if (sub.label === "ATS Score Checker") onViewTool("ats-checker");
                        else if (sub.label === "Resume Improvements") onViewTool("resume-improvements");
                        else if (sub.label === "Cover Letter Generator") onViewTool("cover-letter");
                        else if (sub.label === "LinkedIn Optimizer") onViewTool("linkedin-optimizer");
                        else if (sub.label === "Career Roadmap") onViewTool("career-roadmap");
                        else if (sub.label === "Study Assistant") onViewTool("study-assistant");
                        else if (sub.label === "Notes Generator") onViewTool("notes-generator");
                        else if (sub.label === "Quiz Generator") onViewTool("quiz-generator");
                        else if (sub.label === "Assignment Generator") onViewTool("assignment-generator");
                        else if (sub.label === "PPT Generator") onViewTool("ppt-generator");
                        else if (sub.label === "Mind Maps") onViewTool("mind-maps");
                        else if (sub.label === "Flashcards") onViewTool("flashcards");
                        else if (sub.label === "Coding Assistant") onViewTool("coding-assistant");
                        else if (sub.label === "DSA Practice") onViewTool("dsa-practice");
                        else if (sub.label === "Coding Dashboard") router.push("/dashboard/coding/dashboard");
                        else if (sub.label === "Coding Challenges") onViewTool("coding-challenges");
                        else if (sub.label === "GitHub Portfolio Builder") onViewTool("github-portfolio");
                        else if (sub.label === "AI Chat Assistant") onViewTool("ady-chat");
                        else if (sub.label === "Interview Engine") onViewTool("interview-engine");
                        else if (sub.label === "AI HR Interview") onViewTool("interview-hr");
                        else if (sub.label === "AI Technical Interview") onViewTool("interview-technical");
                        else if (sub.label === "Research Paper AI") onViewTool("research-paper-ai");
                        else if (sub.label === "Plagiarism Checker") onViewTool("research-plagiarism");
                        else if (sub.label === "Job Discovery") onViewTool("job-discovery");
                        else if (sub.label === "AI Aptitude Engine") onViewTool("placement-aptitude");
                        else if (sub.label === "Technical MCQs") onViewTool("placement-mcqs");
                        else if (sub.label === "Email Writer") onViewTool("prod-email");
                        else if (sub.label === "SOP Generator") onViewTool("prod-sop");
                        else if (sub.label === "LinkedIn Post Gen") onViewTool("prod-linkedin");
                        else if (sub.label === "Content Writer") onViewTool("prod-content");
                        else if (sub.label === "Progress Tracker") onViewTool("progress-hub");
                        else if (sub.label === "Study Planner") onViewTool("study-planner");
                        else if (sub.label === "Learning Streak") onViewTool("learning-streak");
                        else if (sub.label === "Interview Progress") onViewTool("analytics-interview");
                        else if (sub.label === "Resume Score") onViewTool("analytics-resume");
                        else if (sub.label === "Skill Growth") onViewTool("analytics-skills");
                        setSidebarOpen(false);
                      }}
                      style={{
                        display: "block", padding: "0.28rem 0.5rem", fontSize: "0.76rem",
                        color: "var(--text-secondary)", borderRadius: 8, marginBottom: 1,
                        textDecoration: "none", transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                        (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.05)";
                        if (sub.href && sub.href !== "#") router.prefetch(sub.href);
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      {sub.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </aside>
    </>
  );
}

// ΓöÇΓöÇΓöÇ TopNav Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export function DashboardTopNav({
  user, theme, onThemeToggle, onViewProfile, onAdyChat, onViewTool, onMenuToggle,
  notifications, setNotifications, unreadCount, onMarkAllRead, onClearAll, onPremium, onViewSettings,
}: {
  user: AdyapanUser | null;
  theme: string;
  onThemeToggle: () => void;
  onViewProfile: () => void;
  onAdyChat: () => void;
  onViewTool: (tool: string) => void;
  onMenuToggle: () => void;
  notifications: Array<{ id: string; title: string; message: string; read: boolean; link?: string; targetAudience?: string; priority?: string; isSystem?: boolean; createdAt: string }>;
  onPremium?: () => void;
  onViewSettings?: () => void;
  setNotifications: React.Dispatch<React.SetStateAction<Array<{ id: string; title: string; message: string; read: boolean; link?: string; targetAudience?: string; priority?: string; isSystem?: boolean; createdAt: string }>>>;
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}) {
  const router = useRouter();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [evaluateOpen, setEvaluateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [dbSearchResults, setDbSearchResults] = useState<SearchEntry[]>([]);
  const [dbSearching, setDbSearching] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotificationClick = async (n: { id: string; link?: string; read: boolean }) => {
    if (!n.read) {
      try {
        await api.put(`/notifications/${n.id}/read`);
        setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
      } catch { }
    }
    if (n.link) {
      setNotificationsOpen(false);
      if (n.link.startsWith("/")) {
        router.push(n.link);
      } else {
        window.location.href = n.link;
      }
    }
  };

  const navResults = searchQuery.trim().length >= 2
    ? SEARCH_INDEX.filter((entry) =>
      entry.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8)
    : [];

  const searchResults = [...navResults, ...dbSearchResults].slice(0, 15);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setDbSearchResults([]);
      setDbSearching(false);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      return;
    }
    setDbSearching(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(q)}`)
        .then((res) => {
          const items: SearchEntry[] = res.data?.data || [];
          setDbSearchResults(items);
        })
        .catch(() => setDbSearchResults([]))
        .finally(() => setDbSearching(false));
    }, 350);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        searchInputRef.current?.blur();
        setSearchQuery("");
        setSearchFocused(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const liveTheme = useTheme();
  const activeTheme = liveTheme || theme || "dark";
  const isDarkTheme = activeTheme === "dark";
  const navBg = isDarkTheme ? "rgba(6,11,14,0.92)" : "rgba(255,255,255,0.95)";
  const navBtnBg = isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)";
  const navBtnColor = isDarkTheme ? "#f1f5f9" : "#0f172a";
  const navInputBg = isDarkTheme ? "rgba(255,255,255,0.05)" : "#f8fafc";
  const navInputColor = isDarkTheme ? "#f1f5f9" : "#0f172a";
  const navBorder = isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(203,213,225,0.85)";
  const dropdownBg = isDarkTheme ? "#0c131a" : "#ffffff";

  const navBtnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "0.45rem 0.85rem", borderRadius: 10, fontWeight: 600,
    fontSize: "0.8rem", cursor: "pointer", border: `1px solid ${navBorder}`,
    background: navBtnBg, color: navBtnColor, backdropFilter: "blur(12px)",
    boxShadow: isDarkTheme ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.04)",
    transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
  };
  const genItems = ["Notes", "Assignment", "PPT", "Quiz", "Research Paper", "Resume"];
  const evalItems = ["ATS Score", "Skill Assessment"];
  return (
    <header style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: 70,
      background: navBg, borderBottom: `1px solid ${navBorder}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 1rem", zIndex: 105, boxSizing: "border-box",
      backdropFilter: "blur(16px)",
      transition: "background 0.3s ease",
    }}>
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Mobile menu trigger */}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.12 }}
          onClick={onMenuToggle}
          className="mobile-menu-btn"
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            display: "none", alignItems: "center", justifyContent: "center",
            padding: 4, color: navBtnColor, marginRight: 2,
          }}
        >
          <Menu size={20} />
        </motion.button>

        <Link href="/dashboard/user" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image src="/assets/logo.png" alt="Adyapan AI" width={30} height={30} style={{ borderRadius: "50%" }} />
          <span style={{ fontWeight: 700, fontSize: "1.15rem", color: navBtnColor }}>Adyapan AI</span>
        </Link>
        <motion.div ref={searchRef} className="desktop-search" style={{ position: "relative" }}
          animate={{ width: searchFocused ? 300 : 230 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", display: "flex", color: searchFocused ? "#f59e0b" : "var(--text-muted)", transition: "color 0.15s ease", zIndex: 1 }}>
            <Search size={14} />
          </span>
          <motion.input
            ref={searchInputRef}
            type="text" placeholder="Search tools, notes, jobs..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => { setSearchFocused(true); if (searchQuery.trim().length >= 2) setSearchOpen(true); }}
            onBlur={() => setSearchFocused(false)}
            initial={false}
            animate={{
              borderColor: searchFocused ? "rgba(245,158,11,0.6)" : navBorder,
              boxShadow: searchFocused ? "0 0 0 3px rgba(245,158,11,0.12)" : isDarkTheme ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.04)",
            }}
            transition={{ duration: 0.15 }}
            style={{
              width: "100%", padding: "0.45rem 2.5rem 0.45rem 2rem",
              background: navInputBg, border: `1px solid ${navBorder}`,
              borderRadius: 10, color: navInputColor, fontSize: "0.82rem", outline: "none",
              boxSizing: "border-box", backdropFilter: "blur(8px)",
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 6, width: "100%", minWidth: 260,
              background: dropdownBg, border: `1px solid ${isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              borderRadius: 12, padding: "0.4rem", zIndex: 200,
              boxShadow: isDarkTheme ? "0 12px 32px rgba(0,0,0,0.5)" : "0 12px 32px rgba(15,23,42,0.12)",
              backdropFilter: "blur(16px)",
            }}>
              {(() => {
                const grouped = searchResults.reduce<Record<string, SearchEntry[]>>((acc, entry) => {
                  (acc[entry.category] ??= []).push(entry);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([cat, entries]) => (
                  <div key={cat}>
                    <div style={{ padding: "0.3rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{cat}</div>
                    {entries.map((entry) => (
                      <motion.button key={entry.label} whileHover={{ scale: 1.01, x: 2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.08 }}
                        onMouseDown={(e) => { e.preventDefault(); onViewTool(entry.viewId); setSearchQuery(""); setSearchOpen(false); }}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "0.45rem 0.6rem", fontSize: "0.8rem", color: "var(--text-secondary)",
                          background: "transparent", border: "none", cursor: "pointer", borderRadius: 8,
                        }}
                      >
                        {entry.label}
                      </motion.button>
                    ))}
                  </div>
                ));
              })()}
            </div>
          )}
          {searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && !dbSearching && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 6, width: "100%",
              background: dropdownBg, border: `1px solid ${navBorder}`,
              borderRadius: 12, padding: "1rem", zIndex: 200,
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)", textAlign: "center",
              fontSize: "0.8rem", color: "var(--text-muted)",
            }}>
              No results found
            </div>
          )}
          {searchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && dbSearching && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 6, width: "100%",
              background: dropdownBg, border: `1px solid ${navBorder}`,
              borderRadius: 12, padding: "1rem", zIndex: 200,
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)", textAlign: "center",
              fontSize: "0.8rem", color: "var(--text-muted)",
            }}>
              Searching your data...
            </div>
          )}
        </motion.div>
      </div>

      {/* Center */}
      <div className="desktop-nav-center" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Generate dropdown */}
        <div style={{ position: "relative" }}
          onMouseEnter={() => setGenerateOpen(true)}
          onMouseLeave={() => setGenerateOpen(false)}
        >
          <motion.button
            whileHover={{ scale: 1.03, borderColor: "rgba(245,158,11,0.6)", boxShadow: "0 3px 12px rgba(245,158,11,0.18)", background: isDarkTheme ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={navBtnBase}
          >
            <Zap size={13} style={{ color: "#f59e0b" }} /> Generate <ChevronDown size={12} style={{ opacity: 0.7 }} />
          </motion.button>
          {generateOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 6, minWidth: 180,
              background: dropdownBg, border: `1px solid ${isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              borderRadius: 12, padding: "0.4rem", zIndex: 200,
              boxShadow: isDarkTheme ? "0 12px 32px rgba(0,0,0,0.5)" : "0 12px 32px rgba(15,23,42,0.12)",
              backdropFilter: "blur(16px)",
            }}>
              {genItems.map((item) => (
                <motion.button whileHover={{ scale: 1.02, x: 2, background: isDarkTheme ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)" }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }} key={item} onClick={() => {
                  if (item === "Resume") onViewTool("resume-builder");
                  else if (item === "Notes") onViewTool("notes-generator");
                  else if (item === "Assignment") onViewTool("assignment-generator");
                  else if (item === "PPT") onViewTool("ppt-generator");
                  else if (item === "Quiz") onViewTool("quiz-generator");
                  else if (item === "Research Paper") onViewTool("research-paper-ai");
                }} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                  padding: "0.5rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)",
                  background: "transparent", border: "none", cursor: "pointer", borderRadius: 8,
                }}>
                  {item === "Notes" && <FileText size={13} style={{ color: "#f59e0b" }} />}
                  {item === "Assignment" && <ClipboardList size={13} style={{ color: "#3b82f6" }} />}
                  {item === "PPT" && <BookOpen size={13} style={{ color: "#ec4899" }} />}
                  {item === "Quiz" && <Star size={13} style={{ color: "#8b5cf6" }} />}
                  {item === "Research Paper" && <BookMarked size={13} style={{ color: "#06b6d4" }} />}
                  {item === "Resume" && <FileText size={13} style={{ color: "#10b981" }} />}
                  {item}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.03, borderColor: "rgba(6,182,212,0.6)", boxShadow: "0 3px 12px rgba(6,182,212,0.18)", background: isDarkTheme ? "rgba(6,182,212,0.12)" : "rgba(6,182,212,0.08)" }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.12 }}
          onClick={() => onViewTool("interview-hub")}
          style={navBtnBase}
        >
          <Mic size={13} style={{ color: "#06b6d4" }} /> AI Interview
        </motion.button>

        {/* Evaluate dropdown */}
        <div style={{ position: "relative" }}
          onMouseEnter={() => setEvaluateOpen(true)}
          onMouseLeave={() => setEvaluateOpen(false)}
        >
          <motion.button
            whileHover={{ scale: 1.03, borderColor: "rgba(234,179,8,0.6)", boxShadow: "0 3px 12px rgba(234,179,8,0.18)", background: isDarkTheme ? "rgba(234,179,8,0.12)" : "rgba(234,179,8,0.08)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={navBtnBase}
          >
            <Star size={13} style={{ color: "#eab308" }} /> Evaluate <ChevronDown size={12} style={{ opacity: 0.7 }} />
          </motion.button>
          {evaluateOpen && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: 6, minWidth: 185,
              background: dropdownBg, border: `1px solid ${isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              borderRadius: 12, padding: "0.4rem", zIndex: 200,
              boxShadow: isDarkTheme ? "0 12px 32px rgba(0,0,0,0.5)" : "0 12px 32px rgba(15,23,42,0.12)",
              backdropFilter: "blur(16px)",
            }}>
              {evalItems.map((item) => (
                <motion.button whileHover={{ scale: 1.02, x: 2, background: isDarkTheme ? "rgba(234,179,8,0.1)" : "rgba(234,179,8,0.08)" }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }} key={item} onClick={() => {
                  if (item === "ATS Score") onViewTool("ats-checker");
                  else if (item === "Skill Assessment") onViewTool("analytics-skills");
                }} style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                  padding: "0.5rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)",
                  background: "transparent", border: "none", cursor: "pointer", borderRadius: 8,
                }}>
                  {item === "ATS Score" && <TrendingUp size={13} style={{ color: "#10b981" }} />}
                  {item === "Skill Assessment" && <Award size={13} style={{ color: "#f59e0b" }} />}
                  {item}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <span style={{ width: 1, height: 20, background: isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", margin: "0 4px" }} />
        <motion.button
          whileHover={{ scale: 1.03, borderColor: "rgba(16,185,129,0.6)", boxShadow: "0 3px 12px rgba(16,185,129,0.18)", background: isDarkTheme ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)" }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.12 }}
          onClick={() => onViewTool("job-discovery")}
          style={{ ...navBtnBase, padding: "0.45rem 0.8rem" }}
        >
          <Briefcase size={13} style={{ color: "#10b981" }} /> Jobs
        </motion.button>
        <span style={{ width: 1, height: 20, background: isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)", margin: "0 4px" }} />
        <motion.button
          whileHover={{ scale: 1.04, borderColor: "rgba(168,85,247,0.7)", boxShadow: isDarkTheme ? "0 4px 20px rgba(168,85,247,0.35)" : "0 4px 16px rgba(168,85,247,0.25)" }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.12 }}
          onClick={onAdyChat}
          style={{
            ...navBtnBase,
            padding: "0.45rem 0.95rem",
            background: isDarkTheme
              ? "linear-gradient(135deg, rgba(147,51,234,0.28), rgba(236,72,153,0.2))"
              : "linear-gradient(135deg, rgba(147,51,234,0.14), rgba(236,72,153,0.12))",
            border: `1px solid ${isDarkTheme ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.4)"}`,
            color: isDarkTheme ? "#f3e8ff" : "#581c87",
            fontWeight: 700,
          }}
        >
          <MessageCircle size={13} style={{ color: isDarkTheme ? "#c084fc" : "#7e22ce" }} /> Ady Chat
        </motion.button>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <motion.button
          whileHover={{ scale: 1.04, borderColor: "rgba(245,158,11,0.8)", boxShadow: isDarkTheme ? "0 4px 20px rgba(245,158,11,0.4)" : "0 4px 16px rgba(245,158,11,0.28)" }}
          whileTap={{ scale: 0.95 }}
          animate={{ borderColor: ["rgba(245,158,11,0.4)", "rgba(245,158,11,0.8)", "rgba(245,158,11,0.4)"] }}
          transition={{ duration: 0.12, borderColor: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
          className="desktop-premium" onClick={onPremium}
          style={{
            ...navBtnBase,
            padding: "0.45rem 0.95rem",
            background: isDarkTheme
              ? "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(234,88,12,0.18))"
              : "linear-gradient(135deg, #fffbeb, #fef3c7)",
            border: `1px solid ${isDarkTheme ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.5)"}`,
            color: isDarkTheme ? "#fef08a" : "#92400e",
            fontWeight: 700,
            boxShadow: isDarkTheme ? "0 2px 12px rgba(245,158,11,0.2)" : "0 2px 10px rgba(245,158,11,0.15)",
          }}
        >
          <Crown size={13} style={{ color: isDarkTheme ? "#f59e0b" : "#d97706" }} /> Premium
        </motion.button>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.06, borderColor: "rgba(245,158,11,0.5)", boxShadow: "0 2px 10px rgba(245,158,11,0.18)" }}
          whileTap={{ scale: 0.9 }} transition={{ duration: 0.12 }}
          onClick={onThemeToggle} aria-label="Toggle theme"
          style={{
            background: navBtnBg, border: `1px solid ${navBorder}`, borderRadius: 10,
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: navBtnColor, boxShadow: isDarkTheme ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.04)",
          }}>
          <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
            {theme === "dark" ? <Sun size={15} style={{ color: "#f59e0b" }} /> : <Moon size={15} style={{ color: "#6366f1" }} />}
          </motion.span>
        </motion.button>
        {/* Notification bell */}
        <div ref={notificationsRef} style={{ position: "relative" }}>
          <motion.button
            whileHover={{ scale: 1.06, borderColor: "rgba(245,158,11,0.5)", boxShadow: "0 2px 10px rgba(245,158,11,0.18)" }}
            whileTap={{ scale: 0.9 }} transition={{ duration: 0.12 }}
            onClick={() => setNotificationsOpen(prev => !prev)}
            aria-label="Notifications"
            style={{
              background: navBtnBg, border: `1px solid ${navBorder}`, borderRadius: 10,
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative", color: navBtnColor,
              boxShadow: isDarkTheme ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: 2, right: 2, background: "#ef4444",
                color: "#fff", fontSize: "0.6rem", fontWeight: 800, width: 14, height: 14,
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 8px rgba(239,68,68,0.7)",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </motion.button>

          {notificationsOpen && (
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: 10, minWidth: 280,
              background: dropdownBg, border: `1px solid ${navBorder}`,
              borderRadius: 12, padding: "0.8rem", zIndex: 200,
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", borderBottom: `1px solid ${navBorder}`, paddingBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: navBtnColor }}>Notifications</span>
                {unreadCount > 0 && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
                    onClick={onMarkAllRead}
                    style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Mark all read
                  </motion.button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "240px", overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 6).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "flex-start",
                        padding: "0.55rem",
                        borderRadius: 10,
                        background: n.read ? "transparent" : "rgba(245,158,11,0.06)",
                        border: `1px solid ${n.read ? "transparent" : "rgba(245,158,11,0.2)"}`,
                        cursor: n.link ? "pointer" : "default",
                      }}
                    >
                      {!n.read && (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginTop: 6, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: n.read ? 600 : 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {n.title || n.message}
                          </p>
                          {n.targetAudience === "PREMIUM" && (
                            <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#c084fc", background: "rgba(168,85,247,0.15)", padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>
                              PRO
                            </span>
                          )}
                          {n.targetAudience === "FREE" && (
                            <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>
                              FREE
                            </span>
                          )}
                        </div>
                        {n.title && n.message && (
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {n.message}
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                            {n.createdAt ? new Date(n.createdAt).toLocaleDateString() + " " + new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                          {n.link && (
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#f59e0b" }}>
                              View &rarr;
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ borderTop: `1px solid ${navBorder}`, paddingTop: "0.5rem", marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {notifications.length > 0 ? (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
                    onClick={onClearAll}
                    style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Clear all
                  </motion.button>
                ) : (
                  <div />
                )}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
                  onClick={() => {
                    onViewTool("notifications");
                    setNotificationsOpen(false);
                  }}
                  style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                >
                  See all notifications
                </motion.button>
              </div>
            </div>
          )}
        </div>
        {/* Profile dropdown */}
        <ProfileDropdown user={user} theme={theme} onViewProfile={onViewProfile} onViewSettings={onViewSettings} onViewTool={onViewTool} />
      </div>
    </header>
  );
}

// ΓöÇΓöÇΓöÇ Profile Dropdown ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export function ProfileDropdown({ user, theme, onViewProfile, onViewSettings, onViewTool }: { user: AdyapanUser | null; theme: string; onViewProfile: () => void; onViewSettings?: () => void; onViewTool: (tool: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDarkTheme = theme === "dark";
  const dropdownBg = isDarkTheme ? "#0f0f19" : "#ffffff";
  const dropdownBorder = isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const menuItems = [
    { icon: <User size={15} />, label: "My Profile", href: "#", onClickFn: onViewProfile },
    { icon: <TrendingUp size={15} />, label: "Learning Progress", href: "#", onClickFn: () => onViewTool("progress-hub") },
    { icon: <Award size={15} />, label: "Learning Streak", href: "#", onClickFn: () => onViewTool("learning-streak") },
    null,
    { icon: <Settings size={15} />, label: "Settings", href: "#", onClickFn: onViewSettings },
    { icon: <CreditCard size={15} />, label: "Billing", href: "#", onClickFn: () => onViewTool("billing") },
    null,
    { icon: <LogOut size={15} />, label: "Logout", href: "/login", onClickFn: () => { clearAuthSession(); window.location.href = "/login"; } },
  ] as Array<{ icon: ReactNode; label: string; href: string; onClickFn?: () => void } | null>;

  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  return (
    <div ref={ref} style={{ position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.button
        whileHover={{ scale: 1.08, boxShadow: "0 0 16px rgba(245,158,11,0.35)" }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.12 }}
        style={{
          width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--primary)",
          background: "rgba(245,158,11,0.1)", cursor: "pointer", padding: 0,
          overflow: "hidden",
        }}>
        <img src={getDiceBearUrl(user?.name || "User")} alt="avatar" width={36} height={36} style={{ borderRadius: "50%", display: "block" }} />
      </motion.button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, width: 280,
          borderRadius: 18, paddingTop: "0.4rem", zIndex: 300,
        }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{
            borderRadius: 18, padding: "1.1rem 0.7rem",
            background: dropdownBg,
            backdropFilter: "blur(40px) saturate(180%)",
            border: `1px solid ${dropdownBorder}`,
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}>
            {/* User header */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "0 0.4rem", marginBottom: "0.9rem" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", border: "2px solid var(--primary)",
                background: "rgba(245,158,11,0.1)", flexShrink: 0, overflow: "hidden",
              }}>
                <img src={getDiceBearUrl(user?.name || "User")} alt="avatar" width={44} height={44} style={{ borderRadius: "50%", display: "block" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", color: isDarkTheme ? "#fff" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.name ?? "User"}
                </div>
                <div style={{ fontSize: "0.73rem", color: isDarkTheme ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.email ?? "user@email.com"}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: "0.9rem" }}>
              {["View Community Profile", "Manage Account"].map((label) => (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }} key={label} onClick={() => { setOpen(false); if (label === "View Community Profile") onViewTool("community-profile"); else onViewSettings?.(); }} style={{
                  background: isDarkTheme ? "#0d151c" : "#f1f5f9",
                  color: isDarkTheme ? "#fff" : "#0f172a",
                  border: `1px solid ${isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  padding: "0.5rem", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.2s",
                }}>
                  {label}
                </motion.button>
              ))}
            </div>

            <div style={{ height: 1, background: isDarkTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", marginBottom: "0.7rem" }} />

            {/* Menu items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {menuItems.map((item, i) =>
                item === null ? (
                  <div key={i} style={{ height: 1, background: isDarkTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", margin: "4px 0" }} />
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={item.onClickFn ? (e) => { e.preventDefault(); setOpen(false); item.onClickFn!(); } : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "0.5rem 0.6rem", borderRadius: 8,
                      color: isDarkTheme ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)",
                      fontSize: "0.84rem", fontWeight: 500, textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isDarkTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
                      (e.currentTarget as HTMLElement).style.color = isDarkTheme ? "#fff" : "#0f172a";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = isDarkTheme ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)";
                    }}
                  >
                    <span style={{ color: "var(--primary)" }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
