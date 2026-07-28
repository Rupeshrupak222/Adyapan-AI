"use client";

import { SocketProvider, useSocket } from "@/context/SocketContext";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAuthSession } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/services/api";
import { cn } from "@/lib/cn";
import { getDiceBearUrl } from "@/lib/avatar";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ErrorBoundary as UiErrorBoundary } from "@/components/ui-error-boundary";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import {
  PremiumCard,
  PremiumButton,
  PremiumBadge,
  PremiumInput,
  PremiumDialog,
  PremiumTabs,
  PremiumProgressRing,
  PremiumProgressBar,
  AnimatedSkeleton,
  AIThinkingScreen,
  EmptyState,
  SuccessCelebration,
  ErrorState,
  FloatingOrbs
} from "@/components/ui/PremiumComponents";


// Define a premium skeleton widget loader
function DashboardWidgetSkeleton({ title }: { title?: string }) {
  return (
    <div className="w-full min-h-[400px] flex flex-col gap-4 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-md animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-6 w-48 bg-amber-500/20 rounded-md"></div>
        <div className="h-8 w-8 bg-amber-500/20 rounded-full"></div>
      </div>
      <div className="flex-1 flex flex-col gap-3 justify-center">
        <div className="h-4 w-full bg-amber-500/10 rounded-md"></div>
        <div className="h-4 w-5/6 bg-amber-500/10 rounded-md"></div>
        <div className="h-4 w-2/3 bg-amber-500/10 rounded-md"></div>
      </div>
    </div>
  );
}

const ResumeBuilderView = dynamic(() => import("@/components/resume-hub/ResumeBuilderView").then(m => m.ResumeBuilderView), {
  loading: () => <DashboardWidgetSkeleton title="Resume Builder" />
});
const AtsCheckerView = dynamic(() => import("@/components/resume-hub/AtsCheckerView").then(m => m.AtsCheckerView), {
  loading: () => <DashboardWidgetSkeleton title="ATS Checker" />
});
const CoverLetterView = dynamic(() => import("@/components/resume-hub/CoverLetterView").then(m => m.CoverLetterView), {
  loading: () => <DashboardWidgetSkeleton title="Cover Letter Builder" />
});
const LinkedInView = dynamic(() => import("@/components/resume-hub/LinkedInView").then(m => m.LinkedInView), {
  loading: () => <DashboardWidgetSkeleton title="LinkedIn Optimizer" />
});
const ResumeUploadView = dynamic(() => import("@/components/resume-hub/ResumeUploadView").then(m => m.ResumeUploadView), {
  loading: () => <DashboardWidgetSkeleton title="Resume Upload" />
});
const ResumeImprovementsView = dynamic(() => import("@/components/resume-hub/ResumeImprovementsView").then(m => m.ResumeImprovementsView), {
  loading: () => <DashboardWidgetSkeleton title="Resume Improvements" />
});
const CareerNavigationEngine = dynamic(() => import("@/components/resume-hub/CareerNavigationEngine").then(m => m.CareerNavigationEngine), {
  loading: () => <DashboardWidgetSkeleton title="Career Navigation" />
});
const AdyChatView = dynamic(() => import("@/components/ady-chat/AdyChatView").then(m => m.AdyChatView), {
  loading: () => <DashboardWidgetSkeleton title="Ady Chat" />
});
const StudyAssistantView = dynamic(() => import("@/components/learning-hub/StudyAssistantView").then(m => m.StudyAssistantView), {
  loading: () => <DashboardWidgetSkeleton title="Study Assistant" />
});
import type { UnifiedLesson } from "@/components/learning-hub/StudyAssistantView";
const StudyPlannerDashboard = dynamic(() => import("@/components/learning-hub/StudyPlannerDashboard").then(m => m.StudyPlannerDashboard), {
  loading: () => <DashboardWidgetSkeleton title="Study Planner" />
});
const LearningStreakDashboard = dynamic(() => import("@/components/learning-hub/LearningStreakDashboard").then(m => m.LearningStreakDashboard), {
  loading: () => <DashboardWidgetSkeleton title="Learning Streak" />
});
const NotesGeneratorView = dynamic(() => import("@/components/learning-hub/NotesGeneratorView").then(m => m.NotesGeneratorView), {
  loading: () => <DashboardWidgetSkeleton title="Notes Generator" />
});
const QuizGeneratorView = dynamic(() => import("@/components/learning-hub/QuizGeneratorView").then(m => m.QuizGeneratorView), {
  loading: () => <DashboardWidgetSkeleton title="Quiz Generator" />
});
const AssignmentGeneratorView = dynamic(() => import("@/components/learning-hub/AssignmentGeneratorView").then(m => m.AssignmentGeneratorView), {
  loading: () => <DashboardWidgetSkeleton title="Assignment Generator" />
});
const PptGeneratorView = dynamic(() => import("@/components/learning-hub/PptGeneratorView").then(m => m.PptGeneratorView), {
  loading: () => <DashboardWidgetSkeleton title="PPT Generator" />
});
const MindMapsView = dynamic(() => import("@/components/learning-hub/MindMapsView").then(m => m.MindMapsView), {
  loading: () => <DashboardWidgetSkeleton title="Mind Maps" />
});
const FlashcardsView = dynamic(() => import("@/components/learning-hub/FlashcardsView").then(m => m.FlashcardsView), {
  loading: () => <DashboardWidgetSkeleton title="Flashcards" />
});
const CodingAssistantView = dynamic(() => import("@/components/coding-hub/CodingAssistantView"), {
  loading: () => <DashboardWidgetSkeleton title="Coding Assistant" />
});
const DsaPracticeView = dynamic(() => import("@/components/coding-hub/DsaPracticeView").then(m => m.DsaPracticeView), {
  loading: () => <DashboardWidgetSkeleton title="DSA Practice" />
});
const CodingChallengesView = dynamic(() => import("@/components/coding-hub/CodingChallengesView").then(m => m.CodingChallengesView), {
  loading: () => <DashboardWidgetSkeleton title="Coding Challenges" />
});
const GithubPortfolioView = dynamic(() => import("@/components/coding-hub/GithubPortfolioView").then(m => m.GithubPortfolioView), {
  loading: () => <DashboardWidgetSkeleton title="Github Portfolio" />
});
const InterviewHubView = dynamic(() => import("@/components/interview-hub/InterviewHubView").then(m => m.InterviewHubView), {
  loading: () => <DashboardWidgetSkeleton title="Interview Hub" />
});
const EngineView = dynamic(() => import("@/components/interview-hub/engine/EngineView").then(m => m.default), {
  loading: () => <DashboardWidgetSkeleton title="Interview Engine" />
});
const TechnicalInterviewView = dynamic(() => import("@/components/interview-hub/technical-engine/TechnicalInterviewView").then(m => m.default), {
  loading: () => <DashboardWidgetSkeleton title="Technical Interview Engine" />
});
const InternshipHubView = dynamic(() => import("@/components/internship-hub/InternshipHubView").then(m => m.InternshipHubView), {
  loading: () => <DashboardWidgetSkeleton title="Internship Finder" />
});
const JobHubView = dynamic(() => import("@/components/job-hub/JobHubView").then(m => m.JobHubView), {
  loading: () => <DashboardWidgetSkeleton title="Job matching" />
});
const JobDiscoveryView = dynamic(() => import("@/components/job-hub/JobDiscoveryView").then(m => m.default), {
  loading: () => <DashboardWidgetSkeleton title="Job Discovery" />,
  ssr: false,
});
const PlacementHubView = dynamic(() => import("@/components/placement-hub/PlacementHubView").then(m => m.PlacementHubView), {
  loading: () => <DashboardWidgetSkeleton title="Placement Hub" />,
  ssr: false,
});
const PlacementIntelligenceView = dynamic(() => import("@/components/placement-hub/PlacementIntelligenceWidget").then(m => m.PlacementIntelligenceWidget), {
  loading: () => <DashboardWidgetSkeleton title="Placement Intelligence" />,
  ssr: false,
});
const AptitudeEngineView = dynamic(() => import("@/components/aptitude-hub/AptitudeEngineView").then(m => m.AptitudeEngineView), {
  loading: () => <DashboardWidgetSkeleton title="AI Aptitude Engine" />
});
const ProductivityHubView = dynamic(() => import("@/components/productivity-hub/ProductivityHubView").then(m => m.ProductivityHubView), {
  loading: () => <DashboardWidgetSkeleton title="Productivity Workspace" />
});
const AnalyticsHubView = dynamic(() => import("@/components/analytics-hub/AnalyticsHubView").then(m => m.AnalyticsHubView), {
  loading: () => <DashboardWidgetSkeleton title="Learning Analytics" />
});
const ProgressDashboard = dynamic(() => import("@/components/progress-hub/ProgressDashboard").then(m => m.ProgressDashboard), {
  loading: () => <DashboardWidgetSkeleton title="Progress Tracking" />
});
const CommunityProfileView = dynamic(() => import("@/components/account-hub/CommunityProfileView").then(m => m.CommunityProfileView), {
  loading: () => <DashboardWidgetSkeleton title="Community Profile" />
});
const CommunityProfilesView = dynamic(() => import("@/components/account-hub/CommunityProfilesView").then(m => m.CommunityProfilesView), {
  loading: () => <DashboardWidgetSkeleton title="Community" />
});
const UserProfileView = dynamic(() => import("@/components/account-hub/CommunityProfilesView").then(m => m.UserProfileView), {
  loading: () => <DashboardWidgetSkeleton title="Profile" />
});
const CommunityMessagesView = dynamic(() => import("@/components/account-hub/CommunityMessagesView").then(m => m.CommunityMessagesView), {
  loading: () => <DashboardWidgetSkeleton title="Messages" />
});
const BlogView = dynamic(() => import("@/components/account-hub/BlogView").then(m => m.BlogView), {
  loading: () => <DashboardWidgetSkeleton title="Blog" />
});
const ManageAccountView = dynamic(() => import("@/components/account-hub/ManageAccountView").then(m => m.ManageAccountView), {
  loading: () => <DashboardWidgetSkeleton title="Manage Account" />
});
const BillingView = dynamic(() => import("@/components/account-hub/BillingView").then(m => m.BillingView), {
  loading: () => <DashboardWidgetSkeleton title="Subscription Billing" />
});
const ProfileView = dynamic(() => import("@/components/account-hub/ProfileView").then(m => m.ProfileView), {
  loading: () => <DashboardWidgetSkeleton title="Profile" />
});
const ResearchHubView = dynamic(() => import("@/components/research-hub/ResearchHubView").then(m => m.ResearchHubView), {
  loading: () => <DashboardWidgetSkeleton title="Research Helper" />
});
const PlagiarismCheckerView = dynamic(() => import("@/components/research-hub/PlagiarismCheckerView").then(m => m.PlagiarismCheckerView), {
  loading: () => <DashboardWidgetSkeleton title="Plagiarism Checker" />
});
const CareerDashboardView = dynamic(() => import("@/components/career-hub/CareerDashboardView").then(m => m.CareerDashboardView), {
  loading: () => <DashboardWidgetSkeleton title="Career Dashboard" />
});
import type { ResumeHubViewType } from "@/types/resume";
import {
  Search, Crown, Bell, ChevronDown, Menu,
  User, LogOut, Settings, CreditCard, TrendingUp, Award,
  BookOpen, Code2, FileText, Mic,
  Briefcase, UserCircle, BarChart3, Wand2, GraduationCap,
  LayoutDashboard, Sun, Moon, TrendingDown, ArrowUpRight,
  BookMarked, ClipboardList,
  Star, Zap,
  LineChart, Trophy, MessageCircle, Users,
  Target, Globe, Edit3, Save, X,
  Upload, Download, Trash2, RefreshCw, ArrowLeft, Lock, Shield,
} from "lucide-react";

export interface AdyapanUser {
  name: string;
  email: string;
  role?: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  submenu?: { label: string; href: string }[];
}

// ─── Search Index ─────────────────────────────────────────────────────────────
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
  { label: "Browse Internships", viewId: "internship-hub", category: "Internship Hub" },
  { label: "AI Internship Match", viewId: "internship-hub", category: "Internship Hub" },
  { label: "Internship Tracker", viewId: "internship-hub", category: "Internship Hub" },
  { label: "Saved Internships", viewId: "internship-hub", category: "Internship Hub" },
  { label: "Browse Jobs", viewId: "job-hub", category: "Job Hub" },
  { label: "AI Job Match", viewId: "job-hub", category: "Job Hub" },
  { label: "JD Compatibility", viewId: "job-hub", category: "Job Hub" },
  { label: "Job Referrals", viewId: "job-hub", category: "Job Hub" },
  { label: "Hiring Challenges", viewId: "job-hub", category: "Job Hub" },
  { label: "LinkedIn Jobs", viewId: "job-hub", category: "Job Hub" },
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

// ─── Sidebar Data ─────────────────────────────────────────────────────────────
export const sidebarItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, href: "/dashboard/user" },
  {
    id: "learning", label: "Learning Hub", icon: <GraduationCap size={18} />,
    submenu: [
      { label: "Study Assistant", href: "#" },
      { label: "Notes Generator", href: "#" },
      { label: "Quiz Generator", href: "#" },
      { label: "Assignment Generator", href: "#" },
      { label: "PPT Generator", href: "#" },
      { label: "Mind Maps", href: "#" },
      { label: "Flashcards", href: "#" },
      { label: "Study Planner", href: "#" },
      { label: "Learning Streak", href: "#" },
    ],
  },
  {
    id: "coding", label: "Coding Hub", icon: <Code2 size={18} />,
    submenu: [
      { label: "Coding Dashboard", href: "/dashboard/coding/dashboard" },
      { label: "Coding Roadmap", href: "/dashboard/coding/roadmap" },
      { label: "DSA Practice", href: "/dashboard/coding" },
      { label: "Coding Assistant", href: "#" },
      { label: "Coding Challenges", href: "#" },
      { label: "GitHub Portfolio Builder", href: "#" },
    ],
  },
  {
    id: "resume", label: "Resume Hub", icon: <FileText size={18} />,
    submenu: [
      { label: "Career Dashboard", href: "/dashboard/career" },
      { label: "Upload Resume", href: "#" }, { label: "Resume Builder", href: "#" },
      { label: "ATS Score Checker", href: "#" }, { label: "Resume Improvements", href: "#" },
      { label: "Cover Letter Generator", href: "#" },
      { label: "LinkedIn Optimizer", href: "#" },
      { label: "Career Roadmap", href: "/dashboard/resume/career-roadmap" },
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
      { label: "Research Paper AI", href: "#" },
      { label: "Plagiarism Checker", href: "#" },
    ],
  },
  {
    id: "internship", label: "Internship Hub", icon: <Briefcase size={18} />,
    submenu: [
      { label: "Browse Internships", href: "#" },
      { label: "AI Match", href: "#" },
      { label: "Application Tracker", href: "#" },
      { label: "Saved Internships", href: "#" },
    ],
  },
  {
    id: "job", label: "Job Hub", icon: <UserCircle size={18} />,
    submenu: [
      { label: "Job Discovery", href: "#" },
      { label: "Browse Jobs", href: "#" },
      { label: "AI Job Match", href: "#" },
      { label: "JD Analyzer", href: "#" },
      { label: "Job Referrals", href: "#" },
      { label: "Hiring Challenges", href: "#" },
      { label: "LinkedIn Jobs", href: "#" },
    ],
  },
  {
    id: "placement", label: "Placement Hub", icon: <Trophy size={18} />,
    submenu: [
      { label: "AI Aptitude Engine", href: "#" },
      { label: "Technical MCQs", href: "#" },
    ],
  },
  {
    id: "productivity", label: "AI Productivity", icon: <Wand2 size={18} />,
    submenu: [
      { label: "AI Chat Assistant", href: "#" }, { label: "Email Writer", href: "#" },
      { label: "SOP Generator", href: "#" }, { label: "LinkedIn Post Gen", href: "#" },
      { label: "Content Writer", href: "#" },
    ],
  },
  {
    id: "analytics", label: "Analytics", icon: <LineChart size={18} />,
    submenu: [
      { label: "Progress Tracker", href: "#" },
      { label: "Interview Progress", href: "#" },
      { label: "Resume Score", href: "#" }, { label: "Skill Growth", href: "#" },
    ],
  },
  {
    id: "community", label: "Community", icon: <Users size={18} />,
    submenu: [
      { label: "Browse Profiles", href: "#" },
      { label: "Messages", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────
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
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
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
      <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
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
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
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
                      else if (sub.label === "Browse Internships") onViewTool("internship-finder");
                      else if (sub.label === "AI Match" && sub.href === "#") onViewTool("internship-recommendations");
                      else if (sub.label === "Application Tracker") onViewTool("internship-tracker");
                      else if (sub.label === "Saved Internships") onViewTool("internship-saved");
                      else if (sub.label === "Browse Jobs") onViewTool("job-matching");
                      else if (sub.label === "AI Job Match") onViewTool("job-jd-match");
                      else if (sub.label === "JD Analyzer") onViewTool("job-jd-match");
                       else if (sub.label === "Job Referrals") onViewTool("job-referrals");
                       else if (sub.label === "Hiring Challenges") onViewTool("job-challenges");
                       else if (sub.label === "LinkedIn Jobs") onViewTool("job-matching");
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

// ─── TopNav Component ─────────────────────────────────────────────────────────
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
  notifications: Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>;
  onPremium?: () => void;
  onViewSettings?: () => void;
  setNotifications: React.Dispatch<React.SetStateAction<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>>;
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}) {
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

  const isDarkTheme = theme === "dark";
  const navBg = isDarkTheme ? "rgba(6,11,14,0.92)" : "rgba(255,255,255,0.92)";
  const navBtnBg = isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";
  const navBtnColor = isDarkTheme ? "#f1f5f9" : "#1e293b";
  const navInputBg = isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.035)";
  const navInputColor = isDarkTheme ? "#f1f5f9" : "#0f172a";
  const navBorder = isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(203,213,225,0.8)";
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
        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} transition={{duration:0.12}}
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
          animate={{width: searchFocused ? 300 : 230}}
          transition={{duration: 0.2, ease: "easeOut"}}
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
            transition={{duration: 0.15}}
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
                      <motion.button key={entry.label} whileHover={{scale:1.01, x: 2}} whileTap={{scale:0.98}} transition={{duration:0.08}}
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
        <motion.button
          whileHover={{ scale: 1.03, borderColor: "rgba(99,102,241,0.6)", boxShadow: "0 3px 12px rgba(99,102,241,0.18)", background: isDarkTheme ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)" }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.12 }}
          onClick={() => onViewTool("internship-hub")}
          style={{ ...navBtnBase, padding: "0.45rem 0.8rem" }}
        >
          <GraduationCap size={13} style={{ color: "#6366f1" }} /> Internships
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
                  <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
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
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", padding: "0.45rem", borderRadius: 8, background: n.read ? "transparent" : "rgba(245,158,11,0.05)", border: `1px solid ${n.read ? "transparent" : "rgba(245,158,11,0.15)"}` }}>
                      {!n.read && (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", marginTop: 6, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: n.read ? 500 : 600, lineHeight: 1.3 }}>{n.title || n.message}</p>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          {n.createdAt ? new Date(n.createdAt).toLocaleDateString() + " " + new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ borderTop: `1px solid ${navBorder}`, paddingTop: "0.5rem", marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {notifications.length > 0 ? (
                  <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
                    onClick={onClearAll}
                    style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Clear all
                  </motion.button>
                ) : (
                  <div />
                )}
                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
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

// ─── Profile Dropdown ─────────────────────────────────────────────────────────
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
  ] as Array<{ icon: React.ReactNode; label: string; href: string; onClickFn?: () => void } | null>;

  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  return (
    <div ref={ref} style={{ position: "relative" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.button
        whileHover={{scale:1.08, boxShadow: "0 0 16px rgba(245,158,11,0.35)"}}
        whileTap={{scale:0.92}}
        transition={{duration:0.12}}
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
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}} key={label} onClick={() => { setOpen(false); if (label === "View Community Profile") onViewTool("community-profile"); else onViewSettings?.(); }} style={{
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

// ─── Stat Widget Card ─────────────────────────────────────────────────────────
function StatCard({
  icon, iconBg, iconColor, value, label, trend, trendUp,
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  value: string; label: string; trend: string; trendUp?: boolean;
}) {
  return (
    <PremiumCard tilt={true} glow={true} className="p-4 flex flex-col justify-between h-full">
      <div className="flex justify-between items-center mb-3">
        <div 
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <span className={cn(
          "text-[10px] font-bold flex items-center gap-0.5",
          trendUp === false ? "text-rose-500" : trendUp ? "text-emerald-500" : "text-slate-400 dark:text-gray-500"
        )}>
          {trendUp === true && <ArrowUpRight size={11} />}
          {trendUp === false && <TrendingDown size={11} />}
          {trend}
        </span>
      </div>
      <div className="text-xl font-extrabold text-slate-800 dark:text-gray-200 leading-none mb-1">
        {value}
      </div>
      <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </div>
    </PremiumCard>
  );
}

// ─── Panel Card ───────────────────────────────────────────────────────────────
function PanelCard({ title, children, flagStyle }: { title: string; children: React.ReactNode; flagStyle?: boolean }) {
  return (
    <PremiumCard glow={true} variant={flagStyle ? "bordered" : "glass"} className="p-5 h-full">
      <h3 className="text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </PremiumCard>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color = "var(--primary)", height = 5 }: { value: number; color?: string; height?: number }) {
  return <PremiumProgressBar value={value} color="amber" height={height} />;
}

// ─── Compact List Item ────────────────────────────────────────────────────────
function CompactItem({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs py-2 border-b border-black/5 dark:border-white/5 last:border-0 last:pb-0">
      <span className="text-slate-500 dark:text-gray-400">{label}</span>
      <strong className={cn("font-semibold", highlight ? "text-amber-500" : "text-slate-800 dark:text-gray-100")}>{value}</strong>
    </div>
  );
}

// ─── Welcome Banner ───────────────────────────────────────────────────────────
function WelcomeBanner({
  user,
  targetRole,
  profileCompletion,
  onStartStudy,
  onBuildResume,
  onPracticeDsa
}: {
  user: AdyapanUser | null;
  targetRole: string;
  profileCompletion: number;
  onStartStudy: () => void;
  onBuildResume: () => void;
  onPracticeDsa: () => void;
}) {
  const [greeting, setGreeting] = useState("Good Morning");
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting("Good Morning");
    else if (hr < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 dark:border-white/5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-purple-500/10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 shadow-sm">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[90px] rounded-full pointer-events-none animate-pulse" />
      
      <div className="space-y-4 max-w-xl">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {greeting}, {user?.name ?? "Student"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
            {targetRole ? (
              <>Continue your learning journey as a <span className="text-amber-500 font-bold">{targetRole}</span>.</>
            ) : (
              "Continue your learning journey and build your professional profile."
            )}
          </p>
        </div>
        <div className="w-64 space-y-1.5">
          <div className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest pl-0.5">
            Profile Completion: {profileCompletion}%
          </div>
          <PremiumProgressBar value={profileCompletion} color="amber" height={5} />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto">
        <PremiumButton variant="primary" onClick={onStartStudy} className="flex-1 md:flex-none">
          Start Study Session
        </PremiumButton>
        <PremiumButton variant="secondary" onClick={onBuildResume} className="flex-1 md:flex-none">
          Build Resume
        </PremiumButton>
        <PremiumButton variant="secondary" onClick={onPracticeDsa} className="flex-1 md:flex-none">
          Practice DSA
        </PremiumButton>
      </div>
    </div>
  );
}


// ─── Stat Cards Grid ──────────────────────────────────────────────────────────
function StatCardsGrid({ stats }: { stats: { avgAtsScore: number; resumesCount: number; avgLinkedinScore: number; dsaSolved: number; dsaStreak: number; studySessionsCount: number; notesCount: number; quizzesCount: number; dsaAccuracy: number; assignmentsCount: number; pptsCount: number; mindmapsCount: number } }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "0.85rem", marginBottom: "1.2rem",
    }}
      className="stat-grid-responsive"
    >
      <StatCard icon={<FileText size={17} />} iconBg="rgba(59,130,246,0.1)" iconColor="#3b82f6" value={`${stats.avgAtsScore}%`} label="Avg Resume ATS" trend={stats.resumesCount > 0 ? `${stats.resumesCount} Resumes` : "No resumes"} />
      <StatCard icon={<BarChart3 size={17} />} iconBg="rgba(236,72,153,0.1)" iconColor="#ec4899" value={`${stats.avgLinkedinScore}%`} label="Avg LinkedIn Score" trend={stats.avgLinkedinScore > 0 ? "Optimized" : "Not optimized"} />
      <StatCard icon={<Code2 size={17} />} iconBg="rgba(245,158,11,0.1)" iconColor="var(--primary)" value={String(stats.dsaSolved)} label="DSA Problems Solved" trend={stats.dsaStreak > 0 ? `${stats.dsaStreak} Day Streak` : "No active streak"} trendUp={stats.dsaStreak > 0} />
      <StatCard icon={<GraduationCap size={17} />} iconBg="rgba(139,92,246,0.1)" iconColor="#8b5cf6" value={String(stats.studySessionsCount)} label="Study Sessions" trend={`${stats.notesCount + stats.quizzesCount} Assets Gen`} />
    </div>
  );
}
// ─── 3-Column Panel Grid ──────────────────────────────────────────────────────
function PanelGrid({ stats, onViewTool }: { stats: { avgAtsScore: number; resumesCount: number; avgLinkedinScore: number; dsaSolved: number; dsaStreak: number; studySessionsCount: number; notesCount: number; quizzesCount: number; coverLettersCount: number; codingSessionsCount: number; challengesCount: number; profileCompletion: number; targetRole: string; dsaAccuracy: number; assignmentsCount: number; pptsCount: number; mindmapsCount: number }; onViewTool: (v: string) => void }) {
  const router = useRouter();
  const quickActions = [
    { label: "Study Assistant", icon: <GraduationCap size={16} />, color: "#8b5cf6", target: "study-assistant", href: null },
    { label: "DSA Practice", icon: <Code2 size={16} />, color: "var(--primary)", target: "dsa-practice", href: null },
    { label: "Resume Builder", icon: <FileText size={16} />, color: "#3b82f6", target: "resume-hub", href: null },
    { label: "ATS Checker", icon: <BarChart3 size={16} />, color: "#10b981", target: "ats-checker", href: null },
    { label: "Progress Tracker", icon: <TrendingUp size={16} />, color: "#f59e0b", target: "progress-hub", href: null },
    { label: "AI Analytics", icon: <LineChart size={16} />, color: "#ec4899", target: "progress-hub", href: null },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.2rem", alignItems: "start" }}
      className="panel-grid-responsive"
    >
      {/* Column 1: Learning Hub */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <PanelCard title="Learning Hub Performance">
          <div style={{ marginBottom: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-secondary)", marginBottom: 4 }}>
              <span>Learning Progress</span>
              <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                {stats.studySessionsCount > 0 ? "Active" : "Not Started"}
              </span>
            </div>
            <ProgressBar value={stats.studySessionsCount > 0 ? 100 : 0} color="#8b5cf6" />
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <CompactItem label="Study Sessions" value={stats.studySessionsCount} />
            <CompactItem label="Notes Generated" value={stats.notesCount} />
            <CompactItem label="Quizzes Created" value={stats.quizzesCount} />
            <CompactItem label="Assignments Created" value={stats.assignmentsCount} />
            <CompactItem label="PPTs Generated" value={stats.pptsCount} />
            <CompactItem label="Mind Maps Built" value={stats.mindmapsCount} />
          </div>
        </PanelCard>
      </div>

      {/* Column 2: Coding Hub */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <PanelCard title="Coding Hub Performance">
          <div style={{ marginBottom: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-secondary)", marginBottom: 4 }}>
              <span>DSA Accuracy</span>
              <span style={{ color: "var(--primary)", fontWeight: 700 }}>{Math.round(stats.dsaAccuracy * 100)}%</span>
            </div>
            <ProgressBar value={Math.round(stats.dsaAccuracy * 100)} color="var(--primary)" />
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <CompactItem label="DSA Problems Solved" value={stats.dsaSolved} highlight />
            <CompactItem label="Current Streak" value={`${stats.dsaStreak} days`} />
            <CompactItem label="AI Coding Chats" value={stats.codingSessionsCount} />
            <CompactItem label="Coding Challenges" value={stats.challengesCount} />
          </div>
        </PanelCard>
      </div>

      {/* Column 3: Resume Hub & Quick Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <PanelCard title="Resume Hub Performance">
          <div style={{ marginTop: "0.4rem" }}>
            <CompactItem label="Resumes Created" value={stats.resumesCount} />
            <CompactItem label="Cover Letters" value={stats.coverLettersCount} />
            <CompactItem label="Average ATS Score" value={`${stats.avgAtsScore}%`} highlight />
            <CompactItem label="Average LinkedIn Score" value={`${stats.avgLinkedinScore}%`} highlight />
          </div>
        </PanelCard>

        <PanelCard title="Quick Actions">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {quickActions.map((action) => (
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
                key={action.label}
                onClick={() => {
                  if (action.href) router.push(action.href);
                  else onViewTool(action.target);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.6rem", border: "1px solid var(--border-color)",
                  borderRadius: 8, background: "transparent", color: "var(--text-secondary)",
                  fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = action.color;
                  (e.currentTarget as HTMLElement).style.color = action.color;
                  (e.currentTarget as HTMLElement).style.background = `${action.color}0d`;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.transform = "none";
                }}
              >
                <span style={{ color: action.color }}>{action.icon}</span>
                {action.label}
              </motion.button>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
// ─── Profile Types & Helpers ──────────────────────────────────────────────────
interface ProfileData {
  user: { id: string; name: string; email: string; role: string; };
  username?: string; phone?: string; location?: string; aboutMe?: string;
  college?: string; branch?: string; degree?: string; year?: string;
  graduationYear?: string; skills: string[]; interestedDomains: string[];
  targetRole?: string; careerGoal?: string; careerObjective?: string;
  linkedin?: string; github?: string; portfolio?: string;
  resumeUrl?: string; resumeName?: string;
}
function calcCompletion(p: ProfileData | null): number {
  if (!p) return 0;
  const fields = [p.user?.name,p.user?.email,p.username,p.phone,p.location,p.aboutMe,p.college,p.branch,p.degree,p.graduationYear,p.skills?.length>0?"y":"",p.interestedDomains?.length>0?"y":"",p.targetRole,p.careerObjective,p.linkedin,p.github,p.resumeUrl];
  return Math.round((fields.filter(Boolean).length/fields.length)*100);
}

// ─── Notifications View ───────────────────────────────────────────────────────
function NotificationsView({
  notifications,
  setNotifications,
  onViewDashboard,
  onMarkAllRead,
  onClearAll,
}: {
  notifications: Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>;
  setNotifications: React.Dispatch<React.SetStateAction<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>>;
  onViewDashboard: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}) {
  const handleToggleRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const handleClearAll = async () => {
    try {
      await api.delete("/notifications/clear");
      setNotifications([]);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <p style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 600, marginBottom: 2 }}>NOTIFICATIONS</p>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>All Notifications</h1>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
            onClick={onViewDashboard}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.5rem 1rem", borderRadius: 8, fontSize: "0.82rem",
              fontWeight: 600, cursor: "pointer", background: "transparent",
              border: "1px solid var(--border-color)", color: "var(--text-secondary)"
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </motion.button>
          {notifications.length > 0 && (
            <>
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
                onClick={handleMarkAllRead}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "0.5rem 1rem", borderRadius: 8, fontSize: "0.82rem",
                  fontWeight: 600, cursor: "pointer", background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.25)", color: "var(--primary)"
                }}
              >
                Mark All as Read
              </motion.button>
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
                onClick={handleClearAll}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "0.5rem 1rem", borderRadius: 8, fontSize: "0.82rem",
                  fontWeight: 600, cursor: "pointer", background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444"
                }}
              >
                <Trash2 size={14} /> Clear All
              </motion.button>
            </>
          )}
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, padding: "1.5rem" }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-muted)" }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: "1rem", margin: "0 auto" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>All caught up!</h3>
            <p style={{ fontSize: "0.82rem", margin: 0 }}>You have no new notifications.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "1rem", borderRadius: 12,
                  background: n.read ? "rgba(255,255,255,0.01)" : "rgba(245,158,11,0.03)",
                  border: `1px solid ${n.read ? "var(--border-color)" : "rgba(245,158,11,0.2)"}`,
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flex: 1, marginRight: "1rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.read ? "transparent" : "var(--primary)", marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: n.read ? 600 : 700, color: "var(--text-primary)" }}>{n.title || n.message}</h4>
                    {n.message !== n.title && <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{n.message}</p>}
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "inline-block", marginTop: 4 }}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() + " " + new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {!n.read && (
                    <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
                      onClick={() => handleToggleRead(n.id)}
                      style={{
                        padding: "0.35rem 0.75rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600,
                        cursor: "pointer", background: "transparent", border: "1px solid var(--border-color)",
                        color: "var(--text-secondary)"
                      }}
                    >
                      Mark Read
                    </motion.button>
                  )}
                  <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} transition={{duration:0.12}}
                    onClick={() => handleDelete(n.id)}
                    style={{
                      padding: "0.35rem 0.75rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600,
                      cursor: "pointer", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)",
                      color: "#ef4444"
                    }}
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────
function SettingsView({ user, onViewDashboard }: { user: AdyapanUser | null; onViewDashboard: () => void }) {
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, browser: false, marketing: false });
  const [privacy, setPrivacy] = useState({ profilePublic: true, showEmail: false });
  const [deleting, setDeleting] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)", border: "1px solid var(--border-color)",
    borderRadius: 16, padding: "1.4rem", marginBottom: "1.2rem",
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "1.1rem",
    display: "flex", alignItems: "center", gap: 8,
  };
  const row: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0.65rem 0", borderBottom: "1px solid var(--border-color)",
  };
  const toggle = (on: boolean, onToggle: () => void) => (
    <button onClick={onToggle} style={{
      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
      background: on ? "var(--primary)" : "rgba(255,255,255,0.12)",
      position: "relative", transition: "background 0.2s",
    }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 22 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", display: "block",
      }} />
    </button>
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 600, marginBottom: 2 }}>SETTINGS</p>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Account Settings</h1>
      </div>

      {/* Account Info */}
      <div style={cardStyle}>
        <div style={sectionTitle}><Settings size={16} style={{ color: "var(--primary)" }} /> Account Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem" }}>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" as const }}>Full Name</label>
            <input defaultValue={user?.name ?? ""} style={{ width: "100%", padding: "0.55rem 0.85rem", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)", fontSize: "0.84rem", outline: "none", boxSizing: "border-box" as const }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")} />
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" as const }}>Email Address</label>
            <input defaultValue={user?.email ?? ""} disabled style={{ width: "100%", padding: "0.55rem 0.85rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-muted)", fontSize: "0.84rem", outline: "none", boxSizing: "border-box" as const, cursor: "not-allowed" }} />
          </div>
        </div>
        <button onClick={handleSave} style={{ padding: "0.52rem 1.2rem", background: saved ? "#10b981" : "var(--primary)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", transition: "background 0.3s" }}>
          {saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      {/* Password */}
      <div style={cardStyle}>
        <div style={sectionTitle}><Lock size={16} style={{ color: "var(--primary)" }} /> Change Password</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 1rem", marginBottom: "0.9rem" }}>
          {["Current Password", "New Password", "Confirm Password"].map(label => (
            <div key={label}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" as const }}>{label}</label>
              <input type="password" placeholder="••••••••" style={{ width: "100%", padding: "0.55rem 0.85rem", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)", fontSize: "0.84rem", outline: "none", boxSizing: "border-box" as const }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--primary)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")} />
            </div>
          ))}
        </div>
        <button onClick={handleSave} style={{ padding: "0.52rem 1.2rem", background: "var(--primary)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
          Update Password
        </button>
      </div>

      {/* Notifications */}
      <div style={cardStyle}>
        <div style={sectionTitle}><Bell size={16} style={{ color: "var(--primary)" }} /> Notification Preferences</div>
        <div style={row}>
          <div><div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Email Notifications</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Receive updates about your learning progress</div></div>
          {toggle(notifications.email, () => setNotifications(p => ({ ...p, email: !p.email })))}
        </div>
        <div style={row}>
          <div><div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Browser Notifications</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Get notified in your browser</div></div>
          {toggle(notifications.browser, () => setNotifications(p => ({ ...p, browser: !p.browser })))}
        </div>
        <div style={{ ...row, borderBottom: "none" }}>
          <div><div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Marketing Emails</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Tips, features, and promotional content</div></div>
          {toggle(notifications.marketing, () => setNotifications(p => ({ ...p, marketing: !p.marketing })))}
        </div>
      </div>

      {/* Privacy */}
      <div style={cardStyle}>
        <div style={sectionTitle}><Shield size={16} style={{ color: "var(--primary)" }} /> Privacy Settings</div>
        <div style={row}>
          <div><div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Public Profile</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Allow others to view your profile</div></div>
          {toggle(privacy.profilePublic, () => setPrivacy(p => ({ ...p, profilePublic: !p.profilePublic })))}
        </div>
        <div style={{ ...row, borderBottom: "none" }}>
          <div><div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Show Email</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Display email on your public profile</div></div>
          {toggle(privacy.showEmail, () => setPrivacy(p => ({ ...p, showEmail: !p.showEmail })))}
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ ...cardStyle, border: "1px solid rgba(239,68,68,0.25)" }}>
        <div style={{ ...sectionTitle, color: "#ef4444" }}><Trash2 size={16} style={{ color: "#ef4444" }} /> Danger Zone</div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Once you delete your account, all your data will be permanently removed. This action cannot be undone.</p>
        {!deleting ? (
          <button onClick={() => setDeleting(true)} style={{ padding: "0.52rem 1.2rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#ef4444", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            Delete Account
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "#ef4444", fontWeight: 600 }}>Are you sure? This cannot be undone.</span>
            <button style={{ padding: "0.45rem 1rem", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>Yes, Delete</button>
            <button onClick={() => setDeleting(false)} style={{ padding: "0.45rem 1rem", background: "transparent", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Recommendation Components ──────────────────────────────────────────────

function RecommendationLoadingProgress() {
  const steps = [
    "Analyzing Learning Behavior",
    "Detecting Weak Areas",
    "Evaluating Retention",
    "Generating Recommendations",
    "Prioritizing Actions",
    "Building Study Plan",
    "Complete"
  ];
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const intervals = [800, 1000, 900, 1100, 900, 800, 600];
    let step = 0;
    const run = () => {
      if (step < steps.length - 1) {
        const timer = setTimeout(() => {
          step++;
          setCurrentStep(step);
          run();
        }, intervals[step]);
        return () => clearTimeout(timer);
      }
    };
    run();
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto my-8">
      <AIThinkingScreen
        steps={steps}
        currentStep={currentStep}
        title="Personalizing Your Dashboard Recommendations..."
        subtitle="AI recommendation engine is calculating learning statistics"
      />
    </div>
  );
}

function AIDailyBriefing({ brief }: { brief: { text?: string; metrics?: { scoreChange?: string; strongestArea?: string; urgentRevision?: string } } | null }) {
  const [typedText, setTypedText] = useState("");
  const fullText = (brief?.text || "").replace(/go[od]d?\s+(morning|afternoon|evening|day)/gi, (match, p1) => "Good " + p1.toLowerCase());


  useEffect(() => {
    let index = 0;
    setTypedText("");
    const timer = setInterval(() => {
      setTypedText((prev) => prev + (fullText[index] || ""));
      index++;
      if (index >= fullText.length) {
        clearInterval(timer);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [fullText]);

  if (!brief) return null;

  return (
    <PremiumCard glow={true} className="p-5 mb-6 border-amber-500/20 dark:border-amber-500/10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-[280px]">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
            <Zap size={14} className="animate-pulse" />
            AI Daily Briefing
          </h4>
          <p className="text-xs text-slate-800 dark:text-gray-200 leading-relaxed font-medium">
            {typedText}
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-2.5 text-center min-w-[90px]">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-bold mb-0.5">Score Change</div>
            <div className="text-xs font-extrabold text-emerald-500">{brief.metrics?.scoreChange}</div>
          </div>
          <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 rounded-xl p-2.5 text-center min-w-[90px]">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-bold mb-0.5">Strongest Area</div>
            <div className="text-xs font-extrabold text-blue-500">{brief.metrics?.strongestArea}</div>
          </div>
          <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 rounded-xl p-2.5 text-center min-w-[90px]">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-gray-400 font-bold mb-0.5">Urgent Revise</div>
            <div className="text-xs font-extrabold text-rose-500">{brief.metrics?.urgentRevision}</div>
          </div>
        </div>
      </div>
    </PremiumCard>
  );
}

function RecommendedToday({ recommendations, onSelectAction, onRegenerate }: { recommendations: Array<{ id?: string; priority: string; recommendationType: string; topicName?: string; reason?: string; impactScore?: number; urgencyScore?: number }>; onSelectAction: (type: string) => void; onRegenerate: () => void }) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white tracking-wider uppercase flex items-center gap-2">
          <Award size={16} className="text-amber-500" />
          Recommended Today
        </h3>
        <PremiumButton variant="secondary" onClick={onRegenerate} icon={<RefreshCw size={11} />} className="py-1.5 px-3">
          Refresh Recommendations
        </PremiumButton>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec, idx) => {
          const priorityColors = {
            Critical: "rose" as const,
            High: "amber" as const,
            Medium: "purple" as const,
            Low: "green" as const,
          };
          const badgeColor = priorityColors[rec.priority as keyof typeof priorityColors] || "purple";
          
          const typeLabels = {
            study_next: "Study Next",
            revision: "Revise",
            practice: "Practice",
            weak_recovery: "Weak Topic",
            textbook: "Reference",
            exam_prep: "Exam Prep",
            interview_prep: "Interview",
            retention_recovery: "Retention Recovery",
            productivity: "Habit",
            habit: "Consistency"
          };
          const label = typeLabels[rec.recommendationType as keyof typeof typeLabels] || "Recommendation";
          
          return (
            <PremiumCard
              key={rec.id || idx}
              tilt={true}
              glow={true}
              variant="interactive"
              className="p-4 flex flex-col justify-between h-full gap-4 group"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest">
                    {label}
                  </span>
                  <PremiumBadge variant={badgeColor} pulse={rec.priority === "Critical" || rec.priority === "High"}>
                    {rec.priority}
                  </PremiumBadge>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200 mb-1 group-hover:text-amber-500 transition-colors">
                  {rec.topicName}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-normal">
                  {rec.reason}
                </p>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-black/5 dark:border-white/5 mt-auto">
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500">
                    Impact: <span className="text-slate-700 dark:text-gray-300 font-extrabold">{rec.impactScore}%</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500">
                    Urgency: <span className="text-slate-700 dark:text-gray-300 font-extrabold">{rec.urgencyScore}%</span>
                  </span>
                </div>
                <PremiumButton variant="primary" onClick={() => onSelectAction(rec.recommendationType)} className="py-1 px-3.5">
                  Start
                </PremiumButton>
              </div>
            </PremiumCard>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserDashboardPage() {
  return (
    <SocketProvider>
      <Suspense fallback={<DashboardWidgetSkeleton title="Loading Dashboard..." />}>
        <UserDashboardContent />
      </Suspense>
    </SocketProvider>
  );
}

function HubErrorBoundary({ children }: { children: React.ReactNode }) {
  const [retryKey, setRetryKey] = useState(0);
  return (
    <UiErrorBoundary key={retryKey} onRetry={() => setRetryKey(k => k + 1)}>
      <div key={retryKey}>{children}</div>
    </UiErrorBoundary>
  );
}

function UserDashboardContent() {
  useRequireAuth("USER");
  const [user, setUser] = useState<AdyapanUser | null>(null);
  const [theme, setTheme] = useState("dark");
  // ── Start with a stable SSR-safe default to avoid hydration mismatches.
  // The saved view is restored client-side in the first useEffect below.
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [communityProfileUserId, setCommunityProfileUserId] = useState<string | null>(null);
  const [openChatWith, setOpenChatWith] = useState<string | null>(null);
  const [lessonResult, setLessonResult] = useState<{ topic: string; lesson: UnifiedLesson; duration: string; level: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("ATS Modern");
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [recommendations, setRecommendations] = useState<Array<{ id?: string; priority: string; recommendationType: string; topicName?: string; reason?: string; impactScore?: number; urgencyScore?: number }>>([]);
  const [dailyBrief, setDailyBrief] = useState<{ text?: string } | null>(null);
  const [coachInsight, setCoachInsight] = useState<Record<string, any> | null>(null);
  const [learningPaths, setLearningPaths] = useState<Record<string, any>[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  const fetchRecommendations = useCallback(async (forceGenerate = false) => {
    setRecommendationsLoading(true);
    try {
      const url = forceGenerate ? "/recommendations/generate" : "/recommendations/dashboard";
      const method = forceGenerate ? "POST" : "GET";
      const res = await api({ method, url });
      if (res.data.success) {
        setRecommendations(res.data.recommendations || []);
        setDailyBrief(res.data.dailyBrief || null);
        setCoachInsight(res.data.coachInsight || null);
        setLearningPaths(res.data.learningPaths || []);
      }
    } catch (err) {
      console.error("Error loading recommendations:", err);
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dashboard-active-view", activeView);
    } catch { /* localStorage unavailable (e.g. privacy mode) */ }
  }, [activeView]);

  // ─── Fetch notifications from API ──────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications?limit=50");
      setNotifications(res.data.notifications);
    } catch { /* ignore */ }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications().finally(() => setNotifLoading(false));
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // ─── Keep unread count in sync with local state ────────────────
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // ─── Socket.io: join user room & listen for new notifications ──
  useEffect(() => {
    if (!socket || !isConnected) return;

    let userId: string | null = null;
    try {
      const raw = localStorage.getItem("adyapan-user");
      if (raw) userId = (JSON.parse(raw) as { id?: string })?.id ?? null;
    } catch { /* ignore */ }

    if (userId) {
      socket.emit("join_user", userId);
    }

    const handler = (notification: { id: string; title: string; message: string; read: boolean; createdAt: string }) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(c => c + 1);
    };

    socket.on("notification:new", handler);

    return () => {
      if (userId) socket.emit("leave_user", userId);
      socket.off("notification:new", handler);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  const [dashboardStats, setDashboardStats] = useState({
    resumesCount: 0,
    avgAtsScore: 0,
    avgLinkedinScore: 0,
    coverLettersCount: 0,
    notesCount: 0,
    quizzesCount: 0,
    assignmentsCount: 0,
    pptsCount: 0,
    mindmapsCount: 0,
    studySessionsCount: 0,
    codingSessionsCount: 0,
    dsaSolved: 0,
    dsaAccuracy: 0,
    dsaStreak: 0,
    challengesCount: 0,
    profileCompletion: 0,
    targetRole: ""
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const searchParams = useSearchParams();

  // Sync activeView with URL search params on mount & popstate
  useEffect(() => {
    const urlView = searchParams.get("view");
    if (urlView) {
      setActiveView(urlView);
    } else {
      try {
        const savedView = localStorage.getItem("dashboard-active-view");
        if (savedView && savedView !== "dashboard") {
          setActiveView(savedView);
          const url = new URL(window.location.href);
          url.searchParams.set("view", savedView);
          window.history.replaceState({}, "", url.toString());
        }
      } catch { /* localStorage unavailable */ }
    }
  }, [searchParams]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view") || "dashboard";
      setActiveView(viewParam);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    // Load theme immediately
    const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Check if onboarding is needed
    const onboarded = localStorage.getItem("adyapan-onboarded");
    if (!onboarded) setShowOnboarding(true);

    // Seed from localStorage/sessionStorage first (instant display), then refresh from API
    try {
      const raw = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
      if (raw) setUser(JSON.parse(raw) as AdyapanUser);
    } catch { /* ignore */ }

    // Fetch fresh user data from server
    api.get("/auth/me").then(res => {
      const fresh = (res.data as { user: AdyapanUser }).user;
      setUser(fresh);
      // Persist in whichever storage already has the token
      if (localStorage.getItem("adyapan-token")) {
        localStorage.setItem("adyapan-user", JSON.stringify(fresh));
      } else {
        sessionStorage.setItem("adyapan-user", JSON.stringify(fresh));
      }
    }).catch(() => { /* token invalid — interceptor will redirect */ });

    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme") ?? "dark";
      setTheme(t);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const fetchDashboardStats = useCallback(async (silent = false) => {
    if (!silent) setStatsLoading(true);
    try {
      const [
        profileRes,
        resumesRes,
        atsRes,
        linkedinRes,
        lettersRes,
        notesRes,
        quizRes,
        assignRes,
        pptRes,
        mindmapRes,
        studyRes,
        codingRes,
        dsaRes,
        challengesRes
      ] = await Promise.allSettled([
        api.get("/profile/me"),
        api.get("/resume/list"),
        api.get("/ats/history"),
        api.get("/linkedin/history"),
        api.get("/cover-letter/history"),
        api.get("/notes/history"),
        api.get("/quiz/history"),
        api.get("/assignment/history"),
        api.get("/ppt/history"),
        api.get("/mindmap/history"),
        api.get("/study/history"),
        api.get("/coding/history"),
        api.get("/dsa/progress"),
        api.get("/challenges/")
      ]);

      const profileData = profileRes.status === "fulfilled" ? profileRes.value.data.profile : null;
      const completion = profileData ? calcCompletion(profileData) : 0;
      const targetRole = profileData?.targetRole || "";

      const resumes = resumesRes.status === "fulfilled" ? (resumesRes.value.data.resumes || []) : [];
      const atsReports = atsRes.status === "fulfilled" ? (atsRes.value.data.reports || []) : [];
      const linkedinReports = linkedinRes.status === "fulfilled" ? (linkedinRes.value.data.reports || []) : [];
      const coverLetters = lettersRes.status === "fulfilled" ? (lettersRes.value.data.coverLetters || []) : [];

      const notes = notesRes.status === "fulfilled" ? (notesRes.value.data.notes || []) : [];
      const quizzes = quizRes.status === "fulfilled" ? (quizRes.value.data.quizzes || []) : [];
      const assignments = assignRes.status === "fulfilled" ? (assignRes.value.data.assignments || []) : [];
      const ppts = pptRes.status === "fulfilled" ? (pptRes.value.data.presentations || []) : [];
      const mindmaps = mindmapRes.status === "fulfilled" ? (mindmapRes.value.data.mindmaps || []) : [];
      const studySessions = studyRes.status === "fulfilled" ? (studyRes.value.data.sessions || []) : [];

      const codingSessions = codingRes.status === "fulfilled" ? (codingRes.value.data.sessions || []) : [];
      const dsaProgress = dsaRes.status === "fulfilled" ? (dsaRes.value.data.progress || null) : null;
      const challenges = challengesRes.status === "fulfilled" ? (challengesRes.value.data || []) : [];

      const avgAtsScore = atsReports.length
        ? Math.round(atsReports.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / atsReports.length)
        : 0;

      const avgLinkedinScore = linkedinReports.length
        ? Math.round(linkedinReports.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / linkedinReports.length)
        : 0;

      setDashboardStats({
        resumesCount: resumes.length,
        avgAtsScore,
        avgLinkedinScore,
        coverLettersCount: coverLetters.length,
        notesCount: notes.length,
        quizzesCount: quizzes.length,
        assignmentsCount: assignments.length,
        pptsCount: ppts.length,
        mindmapsCount: mindmaps.length,
        studySessionsCount: studySessions.length,
        codingSessionsCount: codingSessions.length,
        dsaSolved: dsaProgress?.solved || 0,
        dsaAccuracy: dsaProgress?.accuracy || 0,
        dsaStreak: dsaProgress?.streak || 0,
        challengesCount: challenges.length,
        profileCompletion: completion,
        targetRole
      });
    } catch (err) {
      console.error("Error fetching dashboard statistics:", err);
    } finally {
      if (!silent) setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Persist view selection so it survives page refreshes
    try {
      localStorage.setItem("dashboard-active-view", activeView);
    } catch { /* localStorage unavailable */ }

    if (activeView !== "dashboard") return;

    fetchDashboardStats(false);
    fetchRecommendations();

    // 10-second periodic background polling for realtime sync across all hubs
    const interval = setInterval(() => {
      fetchDashboardStats(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [activeView, fetchDashboardStats, fetchRecommendations]);

  // Realtime Socket listeners for all hubs
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeSync = () => {
      fetchDashboardStats(true);
    };

    socket.on("dashboard:update", handleRealtimeSync);
    socket.on("generate:complete", handleRealtimeSync);
    socket.on("lesson:complete", handleRealtimeSync);
    socket.on("study:complete", handleRealtimeSync);
    socket.on("interview:complete", handleRealtimeSync);
    socket.on("interview:started", handleRealtimeSync);
    socket.on("proctor:update", handleRealtimeSync);

    return () => {
      socket.off("dashboard:update", handleRealtimeSync);
      socket.off("generate:complete", handleRealtimeSync);
      socket.off("lesson:complete", handleRealtimeSync);
      socket.off("study:complete", handleRealtimeSync);
      socket.off("interview:complete", handleRealtimeSync);
      socket.off("interview:started", handleRealtimeSync);
      socket.off("proctor:update", handleRealtimeSync);
    };
  }, [socket, fetchDashboardStats]);

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const router = useRouter();
  const navigateTo = useCallback((view: string) => {
    if (view !== "community-messages") setOpenChatWith(null);
    if (view !== "community-browse") setCommunityProfileUserId(null);
    setActiveView(view);
    try {
      localStorage.setItem("dashboard-active-view", view);
      const url = new URL(window.location.href);
      if (view && view !== "dashboard") {
        url.searchParams.set("view", view);
      } else {
        url.searchParams.delete("view");
      }
      window.history.replaceState({}, "", url.toString());
    } catch { /* ignore */ }
  }, []);
  const handleViewProfile = () => navigateTo("profile");
  const handlePremium = () => router.push("/premium");
  const handleViewDashboard = () => navigateTo("dashboard");
  const handleAdyChat = () => navigateTo("ady-chat");

  return (
    <div className="relative overflow-hidden" style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      {showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
      <FloatingOrbs />
      <DashboardTopNav user={user} theme={theme} onThemeToggle={handleThemeToggle} onViewProfile={handleViewProfile} onAdyChat={handleAdyChat} onViewTool={navigateTo} onMenuToggle={() => setSidebarOpen(prev => !prev)} notifications={notifications} setNotifications={setNotifications} unreadCount={unreadCount} onMarkAllRead={async () => { try { await api.put("/notifications/read-all"); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); setUnreadCount(0); } catch {} }} onClearAll={async () => { try { await api.delete("/notifications/clear"); setNotifications([]); setUnreadCount(0); } catch {} }} onPremium={handlePremium} onViewSettings={() => navigateTo("settings")} />
      <DashboardSidebar activeView={activeView} onViewDashboard={handleViewDashboard} onViewTool={navigateTo} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="dash-main relative z-10 resume-hub-theme">

        <HubErrorBoundary>
        {activeView === "profile" ? (
          <HubErrorBoundary><ProfileView /></HubErrorBoundary>
        ) : activeView === "career-dashboard" ? (
          <HubErrorBoundary><CareerDashboardView setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "community-profile" && communityProfileUserId ? (
          <HubErrorBoundary>
            <CommunityProfileView
              userId={communityProfileUserId}
              onViewUser={(id) => setCommunityProfileUserId(id)}
              onBack={() => setCommunityProfileUserId(null)}
            />
          </HubErrorBoundary>
        ) : activeView === "community-profile" ? (
          <HubErrorBoundary>
            <CommunityProfileView onViewUser={(id) => setCommunityProfileUserId(id)} />
          </HubErrorBoundary>
        ) : activeView === "community-browse" && communityProfileUserId ? (
          <HubErrorBoundary>
            <CommunityProfileView
              userId={communityProfileUserId}
              onViewUser={(id) => setCommunityProfileUserId(id)}
              onBack={() => setCommunityProfileUserId(null)}
            />
          </HubErrorBoundary>
        ) : activeView === "community-browse" ? (
          <HubErrorBoundary>
            <CommunityProfilesView
              onViewProfile={(userId) => setCommunityProfileUserId(userId)}
              onMessage={(userId) => { setOpenChatWith(userId); setActiveView("community-messages"); }}
            />
          </HubErrorBoundary>
        ) : activeView === "community-messages" ? (
          <HubErrorBoundary><CommunityMessagesView openChatWith={openChatWith} /></HubErrorBoundary>
        ) : activeView === "community-blog" ? (
          <HubErrorBoundary><BlogView /></HubErrorBoundary>
        ) : activeView === "settings" ? (
          <HubErrorBoundary><ManageAccountView /></HubErrorBoundary>
        ) : activeView === "billing" ? (
          <HubErrorBoundary><BillingView /></HubErrorBoundary>
        ) : activeView === "resume-hub" || activeView === "resume-builder" ? (
          <HubErrorBoundary><ResumeBuilderView setView={setActiveView} selectedTemplate={selectedTemplate || "ATS Modern"} /></HubErrorBoundary>
        ) : activeView === "resume-upload" ? (
          <HubErrorBoundary><ResumeUploadView setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "ats-checker" ? (
          <HubErrorBoundary><AtsCheckerView setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "resume-improvements" ? (
          <HubErrorBoundary><ResumeImprovementsView setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "cover-letter" ? (
          <HubErrorBoundary><CoverLetterView setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "linkedin-optimizer" ? (
          <HubErrorBoundary><LinkedInView setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "career-roadmap" ? (
          <HubErrorBoundary><CareerNavigationEngine setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "study-assistant" ? (
          <HubErrorBoundary><StudyAssistantView onViewLesson={(data) => { setLessonResult(data); setActiveView("lesson-view"); }} /></HubErrorBoundary>
        ) : activeView === "lesson-view" && lessonResult ? (
          <HubErrorBoundary><StudyAssistantView lessonToView={lessonResult} onViewLesson={() => setActiveView("study-assistant")} /></HubErrorBoundary>
        ) : activeView === "study-planner" ? (
          <HubErrorBoundary><StudyPlannerDashboard /></HubErrorBoundary>
        ) : activeView === "learning-streak" ? (
          <HubErrorBoundary><LearningStreakDashboard /></HubErrorBoundary>
        ) : activeView === "notes-generator" ? (
          <HubErrorBoundary><NotesGeneratorView /></HubErrorBoundary>
        ) : activeView === "quiz-generator" ? (
          <HubErrorBoundary><QuizGeneratorView onViewTool={navigateTo} /></HubErrorBoundary>
        ) : activeView === "assignment-generator" ? (
          <HubErrorBoundary><AssignmentGeneratorView /></HubErrorBoundary>
        ) : activeView === "ppt-generator" ? (
          <HubErrorBoundary><PptGeneratorView /></HubErrorBoundary>
        ) : activeView === "mind-maps" ? (
          <HubErrorBoundary><MindMapsView /></HubErrorBoundary>
        ) : activeView === "flashcards" ? (
          <HubErrorBoundary><FlashcardsView /></HubErrorBoundary>
        ) : activeView === "coding-assistant" ? (
          <HubErrorBoundary><CodingAssistantView /></HubErrorBoundary>
        ) : activeView === "dsa-practice" ? (
          <HubErrorBoundary><DsaPracticeView /></HubErrorBoundary>
        ) : activeView === "coding-challenges" ? (
          <HubErrorBoundary><CodingChallengesView /></HubErrorBoundary>
        ) : activeView === "ady-chat" ? (
          <HubErrorBoundary><AdyChatView setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "interview-engine" ? (
          <HubErrorBoundary><EngineView theme={theme} /></HubErrorBoundary>
        ) : activeView === "interview-technical" || activeView === "technical-interview" ? (
          <HubErrorBoundary><TechnicalInterviewView theme={theme} /></HubErrorBoundary>
        ) : activeView === "interview-hub" || activeView === "interview-hr" || activeView === "interview-mock" ? (
          <HubErrorBoundary><InterviewHubView setView={setActiveView} activeModule={activeView} theme={theme} /></HubErrorBoundary>
        ) : activeView === "internship-hub" || activeView === "internship-finder" || activeView === "internship-recommendations" || activeView === "internship-tracker" || activeView === "internship-saved" ? (
          <HubErrorBoundary><InternshipHubView setView={setActiveView} activeModule={activeView} theme={theme} /></HubErrorBoundary>
        ) : activeView === "job-hub" || activeView === "job-matching" || activeView === "job-jd-match" || activeView === "job-referrals" || activeView === "job-challenges" || activeView === "job-saved" || activeView === "linkedin-job-scraper" ? (
          <HubErrorBoundary><JobHubView setView={setActiveView} activeModule={activeView} theme={theme} /></HubErrorBoundary>
        ) : activeView === "job-discovery" ? (
          <HubErrorBoundary><JobDiscoveryView /></HubErrorBoundary>
        ) : activeView === "aptitude-engine" || activeView === "aptitude-engine-analytics" ? (
          <HubErrorBoundary><AptitudeEngineView setView={setActiveView} activeModule={activeView} theme={theme} /></HubErrorBoundary>
        ) : activeView === "placement-hub" || activeView === "placement-aptitude" || activeView === "placement-reasoning" || activeView === "placement-mcqs" || activeView === "placement-mocks" || activeView === "placement-readiness" ? (
          <HubErrorBoundary><PlacementHubView setView={setActiveView} activeModule={activeView} theme={theme} /></HubErrorBoundary>
        ) : activeView === "placement-intelligence" ? (
          <HubErrorBoundary><PlacementIntelligenceView onViewChange={setActiveView} /></HubErrorBoundary>
        ) : activeView === "productivity-hub" || activeView === "prod-email" || activeView === "prod-sop" || activeView === "prod-linkedin" || activeView === "prod-content" ? (
          <HubErrorBoundary><ProductivityHubView setView={setActiveView} activeModule={activeView} theme={theme} /></HubErrorBoundary>
        ) : activeView === "analytics-hub" || activeView === "analytics-learning" || activeView === "analytics-interview" || activeView === "analytics-resume" || activeView === "analytics-skills" ? (
          <HubErrorBoundary><AnalyticsHubView setView={setActiveView} activeModule={activeView} theme={theme} /></HubErrorBoundary>
        ) : activeView === "progress-hub" ? (
          <HubErrorBoundary><ProgressDashboard /></HubErrorBoundary>
        ) : activeView === "research-hub" || activeView === "research-paper-ai" ? (
          <HubErrorBoundary><ResearchHubView setView={setActiveView} activeModule={activeView} theme={theme} /></HubErrorBoundary>
        ) : activeView === "research-plagiarism" ? (
          <HubErrorBoundary><PlagiarismCheckerView setView={setActiveView} /></HubErrorBoundary>
        ) : activeView === "github-portfolio" ? (
          <HubErrorBoundary><GithubPortfolioView /></HubErrorBoundary>
        ) : activeView === "notifications" ? (
          <NotificationsView
            notifications={notifications}
            setNotifications={setNotifications}
            onViewDashboard={handleViewDashboard}
            onMarkAllRead={async () => {
              try { await api.put("/notifications/read-all"); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch {}
            }}
            onClearAll={async () => {
              try { await api.delete("/notifications/clear"); setNotifications([]); } catch {}
            }}
          />
        ) : (
          statsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", color: "var(--text-secondary)", gap: "0.75rem" }}>
              <RefreshCw className="animate-spin text-amber-500" size={24} />
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Loading your dashboard statistics...</span>
            </div>
          ) : (
            <>
              <WelcomeBanner
                user={user}
                targetRole={dashboardStats.targetRole}
                profileCompletion={dashboardStats.profileCompletion}
                onStartStudy={() => setActiveView("study-assistant")}
                onBuildResume={() => setActiveView("resume-hub")}
                onPracticeDsa={() => setActiveView("dsa-practice")}
              />
              <StatCardsGrid stats={dashboardStats} />
              {recommendationsLoading ? (
                <RecommendationLoadingProgress />
              ) : (
                <>
                  <AIDailyBriefing brief={dailyBrief} />
                  <RecommendedToday
                    recommendations={recommendations}
                    onRegenerate={() => fetchRecommendations(true)}
                    onSelectAction={(type) => {
                      if (type === "study_next" || type === "retention_recovery") setActiveView("study-assistant");
                      else if (type === "revision") setActiveView("progress-hub");
                      else if (type === "practice") setActiveView("dsa-practice");
                      else if (type === "weak_recovery") setActiveView("weak-topics");
                      else if (type === "exam_prep") setActiveView("study-planner");
                      else if (type === "interview_prep") setActiveView("interview-hub");
                      else setActiveView("study-assistant");
                    }}
                  />
                </>
              )}
              <PanelGrid stats={dashboardStats} onViewTool={setActiveView} />
            </>
          )
        )}
        </HubErrorBoundary>
      </main>

      {/* Inline responsive styles */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-grid-responsive {
          grid-template-columns: repeat(4, 1fr);
        }
        .panel-grid-responsive {
          grid-template-columns: 1fr 1fr 1fr;
        }
        @media (max-width: 1200px) {
          .stat-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; }
          .panel-grid-responsive { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 768px) {
          .stat-grid-responsive { grid-template-columns: 1fr !important; }
          .panel-grid-responsive { grid-template-columns: 1fr !important; }
          .dash-main { margin-left: 0 !important; }
        }
        .dash-sidebar input:focus {
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}

