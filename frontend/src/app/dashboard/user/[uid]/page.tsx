"use client";

import { SocketProvider, useSocket } from "@/context/SocketContext";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAuthSession } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTheme } from "@/hooks/useTheme";
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
const MindMapsView = dynamic(() => import("@/components/learning-hub/MindMapsView").then(m => m.MindMapsView), {
  loading: () => <DashboardWidgetSkeleton title="Mind Maps" />
});
const FlashcardsView = dynamic(() => import("@/components/learning-hub/FlashcardsView").then(m => m.FlashcardsView), {
  loading: () => <DashboardWidgetSkeleton title="Flashcards" />
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
const HRView = dynamic(() => import("@/components/interview-hub/hr-engine/HRView").then(m => m.default), {
  loading: () => <DashboardWidgetSkeleton title="HR Interview Engine" />
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
const InterviewAnalyticsView = dynamic(() => import("@/components/interview-hub/InterviewAnalyticsView").then(m => m.InterviewAnalyticsView), {
  loading: () => <DashboardWidgetSkeleton title="Interview Analytics" />
});
const ProgressDashboard = dynamic(() => import("@/components/progress-hub/ProgressDashboard").then(m => m.ProgressDashboard), {
  loading: () => <DashboardWidgetSkeleton title="Progress Tracking" />
});
const CommunityComingSoonView = dynamic(() => import("@/components/account-hub/CommunityComingSoonView").then(m => m.CommunityComingSoonView), {
  loading: () => <DashboardWidgetSkeleton title="Community Hub" />
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
  Flame, AlertCircle, AlertTriangle, CheckCircle2, Clock, Brain, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from "recharts";


import { DashboardSidebar, DashboardTopNav, ProfileDropdown, sidebarItems } from "@/components/dashboard-shell";
import type { AdyapanUser, SidebarItem } from "@/components/dashboard-shell";
export { DashboardSidebar, DashboardTopNav, ProfileDropdown, sidebarItems };
export type { AdyapanUser, SidebarItem };

// ΓöÇΓöÇΓöÇ Stat Widget Card ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Panel Card ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓöÇΓöÇΓöÇ Progress Bar ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function ProgressBar({ value, color = "var(--primary)", height = 5 }: { value: number; color?: string; height?: number }) {
  return <PremiumProgressBar value={value} color="amber" height={height} />;
}

// ΓöÇΓöÇΓöÇ Compact List Item ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function CompactItem({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs py-2 border-b border-black/5 dark:border-white/5 last:border-0 last:pb-0">
      <span className="text-slate-500 dark:text-gray-400">{label}</span>
      <strong className={cn("font-semibold", highlight ? "text-amber-500" : "text-slate-800 dark:text-gray-100")}>{value}</strong>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Welcome Banner ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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


// ΓöÇΓöÇΓöÇ Stat Cards Grid ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function StatCardsGrid({ stats }: { stats: { avgAtsScore: number; resumesCount: number; avgLinkedinScore: number; dsaSolved: number; dsaStreak: number; studySessionsCount: number; notesCount: number; quizzesCount: number; dsaAccuracy: number; assignmentsCount: number; mindmapsCount: number } }) {
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
// ΓöÇΓöÇΓöÇ 3-Column Panel Grid ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function PanelGrid({ stats, onViewTool }: { stats: { avgAtsScore: number; resumesCount: number; avgLinkedinScore: number; dsaSolved: number; dsaStreak: number; studySessionsCount: number; notesCount: number; quizzesCount: number; coverLettersCount: number; codingSessionsCount: number; challengesCount: number; profileCompletion: number; targetRole: string; dsaAccuracy: number; assignmentsCount: number; mindmapsCount: number }; onViewTool: (v: string) => void }) {
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
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
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
function CrossModuleAnalytics(_props: {
  aptitude?: any; interview?: any; streak?: any; placement?: any; weakTopics?: any;
  onViewTool?: (v: string) => void;
}) {
  return null;
}
// ΓöÇΓöÇΓöÇ Profile Types & Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
  const fields = [p.user?.name, p.user?.email, p.username, p.phone, p.location, p.aboutMe, p.college, p.branch, p.degree, p.graduationYear, p.skills?.length > 0 ? "y" : "", p.interestedDomains?.length > 0 ? "y" : "", p.targetRole, p.careerObjective, p.linkedin, p.github, p.resumeUrl];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

// ΓöÇΓöÇΓöÇ Notifications View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
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
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
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
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
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
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
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
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
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

// ΓöÇΓöÇΓöÇ Settings View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
              <input type="password" placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" style={{ width: "100%", padding: "0.55rem 0.85rem", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)", fontSize: "0.84rem", outline: "none", boxSizing: "border-box" as const }}
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

// ΓöÇΓöÇΓöÇ AI Recommendation Components ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

// ΓöÇΓöÇΓöÇ Main Page (Security Redirect) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// All named exports (DashboardSidebar, DashboardTopNav, AdyapanUser, etc.)
// remain in this file so other dashboard pages can import them.
// The default export renders the dashboard content directly. Auth is
// enforced by useRequireAuth("USER") inside UserDashboardContent.

export default function UserDashboardPage() {
  return (
    <SocketProvider>
      <HubErrorBoundary>
        <Suspense fallback={<DashboardWidgetSkeleton title="Loading Dashboard..." />}>
          <UserDashboardContent />
        </Suspense>
      </HubErrorBoundary>
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
  // ΓöÇΓöÇ Start with a stable SSR-safe default to avoid hydration mismatches.
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

  // ΓöÇΓöÇΓöÇ Fetch notifications from API ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

  // ΓöÇΓöÇΓöÇ Keep unread count in sync with local state ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // ΓöÇΓöÇΓöÇ Socket.io: join user room & listen for new notifications ΓöÇΓöÇ
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

  // ΓöÇΓöÇ Extended cross-module analytics (fetched in parallel) ΓöÇΓöÇ
  const [aptitudeAnalytics, setAptitudeAnalytics] = useState<any>(null);
  const [interviewAnalytics, setInterviewAnalytics] = useState<any>(null);
  const [streakData, setStreakData] = useState<any>(null);
  const [placementScore, setPlacementScore] = useState<any>(null);
  const [weakTopicsData, setWeakTopicsData] = useState<any>(null);

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

    // Check if onboarding is needed (Only show for first time register)
    const isJustRegistered = sessionStorage.getItem("adyapan-just-registered") === "true" || localStorage.getItem("adyapan-just-registered") === "true";
    const onboardedGlobal = localStorage.getItem("adyapan-onboarded") === "true";

    if (isJustRegistered && !onboardedGlobal) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
      localStorage.setItem("adyapan-onboarded", "true");
    }

    // Seed from localStorage/sessionStorage first (instant display), then refresh from API
    try {
      const raw = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
      if (raw) {
        const parsed = JSON.parse(raw) as AdyapanUser;
        setUser(parsed);
        if (parsed.id && localStorage.getItem(`adyapan-onboarded-${parsed.id}`) === "true") {
          setShowOnboarding(false);
        }
      }
    } catch { /* ignore */ }

    // Fetch fresh user data from server
    api.get("/auth/me").then(res => {
      const fresh = (res.data as { user: AdyapanUser }).user;
      setUser(fresh);

      const userOnboardedKey = `adyapan-onboarded-${fresh.id}`;
      const isUserOnboarded = localStorage.getItem(userOnboardedKey) === "true";
      if (!isJustRegistered || isUserOnboarded || onboardedGlobal) {
        setShowOnboarding(false);
        localStorage.setItem(userOnboardedKey, "true");
        localStorage.setItem("adyapan-onboarded", "true");
      }

      // Persist in whichever storage already has the token
      if (localStorage.getItem("adyapan-token")) {
        localStorage.setItem("adyapan-user", JSON.stringify(fresh));
      } else {
        sessionStorage.setItem("adyapan-user", JSON.stringify(fresh));
      }
    }).catch(() => { /* token invalid */ });

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
      const mindmaps = mindmapRes.status === "fulfilled" ? (mindmapRes.value.data.mindmaps || []) : [];
      const studySessions = studyRes.status === "fulfilled" ? (studyRes.value.data.sessions || []) : [];

      const codingSessions = codingRes.status === "fulfilled" ? (codingRes.value.data.sessions || []) : [];
      const dsaProgress = dsaRes.status === "fulfilled" ? (dsaRes.value.data.progress || null) : null;
      const challenges = challengesRes.status === "fulfilled" ? (challengesRes.value.data?.challenges || challengesRes.value.data || []) : [];

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

  const [systemConfig, setSystemConfig] = useState<{
    announcementBanner?: string;
    maintenanceMode?: boolean;
  } | null>(null);

  useEffect(() => {
    api.get("/config").then(res => {
      if (res.data?.success && res.data.config) {
        setSystemConfig(res.data.config);
      }
    }).catch(() => { });
  }, []);

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const router = useRouter();
  const navigateTo = useCallback((view: string) => {
    if (view === "settings") {
      router.push("/dashboard/user/settings/account");
      return;
    }
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
  }, [router]);
  const handleViewProfile = () => navigateTo("profile");
  const handlePremium = () => router.push("/premium");
  const handleViewDashboard = () => navigateTo("dashboard");
  const handleAdyChat = () => navigateTo("ady-chat");

  return (
    <div className="relative overflow-hidden" style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      {showOnboarding && <OnboardingFlow userId={user?.id} onComplete={() => setShowOnboarding(false)} />}
      <FloatingOrbs />

      <DashboardTopNav user={user} theme={theme} onThemeToggle={handleThemeToggle} onViewProfile={handleViewProfile} onAdyChat={handleAdyChat} onViewTool={navigateTo} onMenuToggle={() => setSidebarOpen(prev => !prev)} notifications={notifications} setNotifications={setNotifications} unreadCount={unreadCount} onMarkAllRead={async () => { try { await api.put("/notifications/read-all"); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); setUnreadCount(0); } catch { } }} onClearAll={async () => { try { await api.delete("/notifications/clear"); setNotifications([]); setUnreadCount(0); } catch { } }} onPremium={handlePremium} onViewSettings={() => navigateTo("settings")} />
      <DashboardSidebar activeView={activeView} onViewDashboard={handleViewDashboard} onViewTool={navigateTo} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="dash-main relative z-10 resume-hub-theme">
        {systemConfig?.maintenanceMode && user?.role !== "ADMIN" && (
          <div className="mb-6 p-4 rounded-xl border flex items-center gap-3"
            style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}>
            <AlertTriangle size={18} />
            <div>
              <div className="font-extrabold text-xs uppercase tracking-wider">Scheduled System Maintenance</div>
              <div className="text-xs">The platform is currently undergoing system updates. AI features and background processing may experience brief delays.</div>
            </div>
          </div>
        )}

        <HubErrorBoundary>
          {activeView === "profile" ? (
            <HubErrorBoundary><ProfileView /></HubErrorBoundary>
          ) : activeView === "career-dashboard" ? (
            <HubErrorBoundary><CareerDashboardView setView={navigateTo} /></HubErrorBoundary>
          ) : activeView.startsWith("community") ? (
            <HubErrorBoundary><CommunityComingSoonView /></HubErrorBoundary>
          ) : activeView === "settings" ? (
            <HubErrorBoundary><ManageAccountView /></HubErrorBoundary>
          ) : activeView === "billing" ? (
            <HubErrorBoundary><BillingView /></HubErrorBoundary>
          ) : activeView === "resume-hub" || activeView === "resume-builder" ? (
            <HubErrorBoundary><ResumeBuilderView setView={navigateTo} selectedTemplate={selectedTemplate || "ATS Modern"} /></HubErrorBoundary>
          ) : activeView === "resume-upload" ? (
            <HubErrorBoundary><ResumeUploadView setView={navigateTo} /></HubErrorBoundary>
          ) : activeView === "ats-checker" ? (
            <HubErrorBoundary><AtsCheckerView setView={navigateTo} /></HubErrorBoundary>
          ) : activeView === "cover-letter" ? (
            <HubErrorBoundary><CoverLetterView setView={navigateTo} /></HubErrorBoundary>
          ) : activeView === "linkedin-optimizer" ? (
            <HubErrorBoundary><LinkedInView setView={navigateTo} /></HubErrorBoundary>
          ) : activeView === "study-assistant" ? (
            <HubErrorBoundary><StudyAssistantView onViewLesson={(data) => { setLessonResult(data); navigateTo("lesson-view"); }} /></HubErrorBoundary>
          ) : activeView === "lesson-view" && lessonResult ? (
            <HubErrorBoundary><StudyAssistantView lessonToView={lessonResult} onViewLesson={() => navigateTo("study-assistant")} /></HubErrorBoundary>
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
          ) : activeView === "mind-maps" ? (
            <HubErrorBoundary><MindMapsView /></HubErrorBoundary>
          ) : activeView === "flashcards" ? (
            <HubErrorBoundary><FlashcardsView /></HubErrorBoundary>
          ) : activeView === "dsa-practice" ? (
            <HubErrorBoundary><DsaPracticeView /></HubErrorBoundary>
          ) : activeView === "coding-challenges" ? (
            <HubErrorBoundary><CodingChallengesView /></HubErrorBoundary>
          ) : activeView === "ady-chat" ? (
            <HubErrorBoundary><AdyChatView setView={navigateTo} /></HubErrorBoundary>
          ) : activeView === "interview-engine" ? (
            <HubErrorBoundary><EngineView theme={theme} /></HubErrorBoundary>
          ) : activeView === "interview-technical" || activeView === "technical-interview" ? (
            <HubErrorBoundary><TechnicalInterviewView theme={theme} /></HubErrorBoundary>
          ) : activeView === "interview-hr" || activeView === "hr-interview" ? (
            <HubErrorBoundary><HRView theme={theme} /></HubErrorBoundary>
          ) : activeView === "interview-hub" || activeView === "interview-mock" ? (
            <HubErrorBoundary><InterviewHubView setView={navigateTo} activeModule={activeView} theme={theme} /></HubErrorBoundary>
          ) : activeView === "job-discovery" ? (
            <HubErrorBoundary><JobDiscoveryView /></HubErrorBoundary>
          ) : activeView === "aptitude-engine" || activeView === "aptitude-engine-analytics" ? (
            <HubErrorBoundary><AptitudeEngineView setView={navigateTo} activeModule={activeView} theme={theme} /></HubErrorBoundary>
          ) : activeView === "placement-hub" || activeView === "placement-aptitude" || activeView === "placement-reasoning" || activeView === "placement-mcqs" || activeView === "placement-mocks" || activeView === "placement-readiness" ? (
            <HubErrorBoundary><PlacementHubView setView={navigateTo} activeModule={activeView} theme={theme} /></HubErrorBoundary>
          ) : activeView === "placement-intelligence" ? (
            <HubErrorBoundary><PlacementIntelligenceView onViewChange={navigateTo} /></HubErrorBoundary>
          ) : activeView === "productivity-hub" || activeView === "prod-email" || activeView === "prod-sop" || activeView === "prod-linkedin" || activeView === "prod-content" ? (
            <HubErrorBoundary><ProductivityHubView setView={navigateTo} activeModule={activeView} theme={theme} /></HubErrorBoundary>
          ) : activeView === "analytics-hub" || activeView === "analytics-learning" || activeView === "analytics-interview" || activeView === "analytics-resume" || activeView === "analytics-skills" ? (
            <HubErrorBoundary><AnalyticsHubView setView={navigateTo} activeModule={activeView} theme={theme} /></HubErrorBoundary>
          ) : activeView === "progress-hub" ? (
            <HubErrorBoundary><ProgressDashboard /></HubErrorBoundary>
          ) : activeView === "research-hub" || activeView === "research-paper-ai" ? (
            <HubErrorBoundary><ResearchHubView setView={navigateTo} activeModule={activeView} theme={theme} /></HubErrorBoundary>
          ) : activeView === "research-plagiarism" ? (
            <HubErrorBoundary><PlagiarismCheckerView setView={navigateTo} /></HubErrorBoundary>
          ) : activeView === "github-portfolio" ? (
            <HubErrorBoundary><GithubPortfolioView /></HubErrorBoundary>
          ) : activeView === "notifications" ? (
            <NotificationsView
              notifications={notifications}
              setNotifications={setNotifications}
              onViewDashboard={handleViewDashboard}
              onMarkAllRead={async () => {
                try { await api.put("/notifications/read-all"); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch { }
              }}
              onClearAll={async () => {
                try { await api.delete("/notifications/clear"); setNotifications([]); } catch { }
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
                  onStartStudy={() => navigateTo("study-assistant")}
                  onBuildResume={() => navigateTo("resume-hub")}
                  onPracticeDsa={() => navigateTo("dsa-practice")}
                />
                <StatCardsGrid stats={dashboardStats} />

                <PanelGrid stats={dashboardStats} onViewTool={navigateTo} />

                {/* ΓòÉΓòÉΓòÉ CROSS-MODULE ANALYTICS ΓòÉΓòÉΓòÉ */}
                <CrossModuleAnalytics
                  aptitude={aptitudeAnalytics}
                  interview={interviewAnalytics}
                  streak={streakData}
                  placement={placementScore}
                  weakTopics={weakTopicsData}
                  onViewTool={navigateTo}
                />
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

