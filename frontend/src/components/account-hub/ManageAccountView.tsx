"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User, Settings, Palette, Bell, Sparkles, BookOpen, Shield, Lock,
  CreditCard, Globe, Zap, HardDrive, Activity, HelpCircle, Search,
  Save, RotateCcw, Camera, Mail, Phone, GraduationCap, FileText,
  Download, Trash2, RefreshCw, LogOut, Eye, EyeOff, Check,
  Moon, Sun, Monitor, ChevronRight, ChevronDown, ExternalLink, Key, Smartphone,
  AlertTriangle, X, MessageSquare, Code, Link2, Clock, Star,
  Brain, Trophy, ArrowUpRight, Image, FolderOpen,
  Database, ShieldCheck, Fingerprint, Menu, Info, Loader2,
  Heart, ClipboardList, TrendingUp, Target, Calendar, Users
} from "lucide-react";
import { toast } from "sonner";
import {
  PremiumCard, PremiumButton, PremiumBadge, PremiumInput,
  PremiumProgressRing, PremiumProgressBar, SettingsToggle, SettingsSelect
} from "@/components/ui/PremiumComponents";
import { getDiceBearUrl } from "@/lib/avatar";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/services/api";


// ─── Navigation Config ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "profile", label: "My Profile", icon: User },
  { id: "account", label: "Account", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai-preferences", label: "AI Preferences", icon: Sparkles },
  { id: "learning", label: "Learning Preferences", icon: BookOpen },
  { id: "security", label: "Security", icon: Shield },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "connected", label: "Connected Accounts", icon: Globe },
  { id: "api", label: "API Integrations", icon: Zap },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "help", label: "Help & Support", icon: HelpCircle },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]["id"];

// ─── Main Component ──────────────────────────────────────────────────────
export function ManageAccountView() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme === "dark";

  const c = useMemo(() => ({
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#475569",
    textMuted: isDark ? "rgba(255,255,255,0.45)" : "#94a3b8",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    cardBgHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    borderHover: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
    primary: "#f59e0b",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#f8fafc",
  }), [isDark]);

  // ── Loading & UI state ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwFields, setShowPwFields] = useState(false);

  // ── Profile state ──
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [branch, setBranch] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [bio, setBio] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [plan, setPlan] = useState("free");
  const [photoUrl, setPhotoUrl] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Appearance state ──
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">("dark");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [compactMode, setCompactMode] = useState(false);
  const [glassEffect, setGlassEffect] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [sidebarCollapse, setSidebarCollapse] = useState(true);
  const [fontSize, setFontSize] = useState(14);

  // ── AI Preferences state ──
  const [aiModel, setAiModel] = useState("gemini");
  const [responseLength, setResponseLength] = useState("balanced");
  const [creativity, setCreativity] = useState(70);
  const [aiMemory, setAiMemory] = useState(true);
  const [markdownOutput, setMarkdownOutput] = useState(true);
  const [codeHighlighting, setCodeHighlighting] = useState(true);
  const [autoCitation, setAutoCitation] = useState(false);
  const [autoSaveConversations, setAutoSaveConversations] = useState(true);

  // ── Learning state ──
  const [language, setLanguage] = useState("en");
  const [learningStyle, setLearningStyle] = useState("visual");
  const [dailyGoal, setDailyGoal] = useState(3);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [noteFormat, setNoteFormat] = useState("markdown");
  const [quizDifficulty, setQuizDifficulty] = useState("medium");
  const [tutorPersonality, setTutorPersonality] = useState("friendly");

  // ── Notifications state ──
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifAssignment, setNotifAssignment] = useState(true);
  const [notifInterview, setNotifInterview] = useState(true);
  const [notifCoding, setNotifCoding] = useState(false);
  const [notifResearch, setNotifResearch] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);

  // ── Security state ──
  const [twoFactor, setTwoFactor] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // ── Connected Accounts state ──
  const [connectedAccounts, setConnectedAccounts] = useState([
    { name: "Google",    icon: "google",    color: "#4285f4", connected: false },
    { name: "GitHub",   icon: "github",    color: "#ffffff", connected: false },
    { name: "Microsoft",icon: "microsoft", color: "#00a4ef", connected: false },
    { name: "LinkedIn", icon: "linkedin",  color: "#0077b5", connected: false },
  ]);

  // ── API Keys state ──
  const [apiKeys, setApiKeys] = useState([
    { name: "Gemini API",      slug: "gemini",      status: "inactive", lastSync: "Never", key: "" },
    { name: "OpenAI API",      slug: "openai",      status: "inactive", lastSync: "Never", key: "" },
    { name: "Claude API",      slug: "claude",      status: "inactive", lastSync: "Never", key: "" },
    { name: "Groq API",        slug: "groq",        status: "inactive", lastSync: "Never", key: "" },
    { name: "OpenRouter API",  slug: "openrouter",  status: "inactive", lastSync: "Never", key: "" },
  ]);

  // ── Privacy state ──
  const [publicProfile, setPublicProfile] = useState(true);
  const [dataCollection, setDataCollection] = useState(true);
  const [personalizedAI, setPersonalizedAI] = useState(true);

  // ── Storage & Activity (loaded from API) ──
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(50);
  const storagePercent = Math.min(100, Math.round((storageUsed / (storageTotal || 1)) * 100));
  const [storageCategories, setStorageCategories] = useState<Array<{ name: string; size: string; percent: number; color: "amber" | "green" | "purple" | "rose" }>>([]);
  const [activityLog, setActivityLog] = useState<Array<{ time: string; action: string; icon: typeof MessageSquare; color: string }>>([]);
  const activeDevices: Array<{ name: string; location: string; current: boolean; lastActive: string }> = [
    { name: "Current Browser", location: "This device", current: true, lastActive: "Now" },
  ];

  // ── Auto-save debounce refs ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Apply theme app-wide ──
  const applyTheme = useCallback((mode: string) => {
    const resolved = mode === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    document.documentElement.setAttribute("data-theme", resolved);
    localStorage.setItem("adyapan-theme", resolved);
  }, []);

  // ── Load all settings on mount ──
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get("/settings");
        const { settings: s, profile: p, meta } = res.data;

        // Profile
        if (p.fullName) setFullName(p.fullName);
        if (p.email) setEmail(p.email);
        if (p.phone) setPhone(p.phone);
        if (p.college) setCollege(p.college);
        if (p.degree) setDegree(p.degree);
        if (p.branch) setBranch(p.branch);
        if (p.graduationYear) setGradYear(p.graduationYear);
        if (p.bio) setBio(p.bio);
        if (p.username) setUsername(p.username);
        if (p.plan) setPlan(p.plan);
        if (p.memberSince) setMemberSince(new Date(p.memberSince).toLocaleDateString("en-IN", { year: "numeric", month: "long" }));
        if (p.photoUrl !== undefined) setPhotoUrl(p.photoUrl || "");

        // Appearance
        setThemeMode((s.themeMode || "dark") as "dark" | "light" | "system");
        setAccentColor(s.accentColor || "#f59e0b");
        applyTheme(s.themeMode || "dark");
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--primary", s.accentColor || "#f59e0b");
          document.documentElement.style.setProperty("--accent-color", s.accentColor || "#f59e0b");
        }
        setCompactMode(!!s.compactMode);
        setGlassEffect(s.glassEffect ?? true);
        setAnimationsEnabled(s.animationsEnabled ?? true);
        setSidebarCollapse(s.sidebarCollapse ?? true);
        setFontSize(s.fontSize || 14);

        // AI
        setAiModel(s.aiModel || "gemini");
        setResponseLength(s.responseLength || "balanced");
        setCreativity(s.creativity ?? 70);
        setAiMemory(s.aiMemory ?? true);
        setMarkdownOutput(s.markdownOutput ?? true);
        setCodeHighlighting(s.codeHighlighting ?? true);
        setAutoCitation(s.autoCitation ?? false);
        setAutoSaveConversations(s.autoSaveConversations ?? true);

        // Learning
        setLanguage(s.language || "en");
        setLearningStyle(s.learningStyle || "visual");
        setDailyGoal(s.dailyGoal || 3);
        setReminderTime(s.reminderTime || "09:00");
        setDifficulty(s.difficulty || "intermediate");
        setNoteFormat(s.noteFormat || "markdown");
        setQuizDifficulty(s.quizDifficulty || "medium");
        setTutorPersonality(s.tutorPersonality || "friendly");

        // Notifications
        setNotifEmail(s.notifEmail ?? true);
        setNotifPush(s.notifPush ?? true);
        setNotifAssignment(s.notifAssignment ?? true);
        setNotifInterview(s.notifInterview ?? true);
        setNotifCoding(s.notifCoding ?? false);
        setNotifResearch(s.notifResearch ?? false);
        setNotifWeekly(s.notifWeekly ?? true);
        setNotifDaily(s.notifDaily ?? true);

        // Privacy
        setPublicProfile(s.publicProfile ?? true);
        setDataCollection(s.dataCollection ?? true);
        setPersonalizedAI(s.personalizedAI ?? true);

        // Security
        setTwoFactor(s.twoFactorEnabled ?? false);
        setLoginAlerts(s.loginAlerts ?? true);

        // API Keys
        if (s.apiKeys) {
          setApiKeys(prev => prev.map(k => {
            const slug = k.slug as keyof typeof s.apiKeys;
            const data = s.apiKeys[slug];
            return data ? { ...k, key: data.key || "", status: data.active ? "active" : "inactive", lastSync: data.active ? "Synced" : "Never" } : k;
          }));
        }

        // Connected Accounts
        if (s.connectedAccounts) {
          setConnectedAccounts(prev => prev.map(a => {
            const slug = a.name.toLowerCase() as keyof typeof s.connectedAccounts;
            return { ...a, connected: !!s.connectedAccounts[slug] };
          }));
        }
      } catch (err) {
        // Fallback: load profile from old endpoint
        try {
          const res = await api.get("/profile/me");
          const p = res.data.profile;
          if (p?.user?.name) setFullName(p.user.name);
          if (p?.user?.email) setEmail(p.user.email);
          if (p?.username) setUsername(p.username);
          if (p?.phone) setPhone(p.phone);
          if (p?.college) setCollege(p.college);
          if (p?.degree) setDegree(p.degree);
          if (p?.branch) setBranch(p.branch);
          if (p?.graduationYear) setGradYear(p.graduationYear);
          if (p?.aboutMe) setBio(p.aboutMe);
        } catch { /* silently fail */ }
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // ── Load storage & activity when those sections are active ──
  useEffect(() => {
    if (activeSection === "storage") {
      api.get("/settings/storage").then(res => {
        if (res.data?.storage) {
          const s = res.data.storage;
          const usedMb = s.usedMb ?? s.totalMb ?? 0;
          const limitMb = s.limitMb ?? 50;
          setStorageUsed(usedMb);
          setStorageTotal(limitMb);
          setStorageCategories([
            { name: "Notes", size: `${s.notes?.count || 0} files`, percent: usedMb ? Math.round(((s.notes?.estimatedMb || 0) / usedMb) * 100) : 0, color: "amber" },
            { name: "Resumes", size: `${s.resumes?.count || 0} files`, percent: usedMb ? Math.round(((s.resumes?.estimatedMb || 0) / usedMb) * 100) : 0, color: "green" },
            { name: "Assignments", size: `${s.assignments?.count || 0} files`, percent: usedMb ? Math.round(((s.assignments?.estimatedMb || 0) / usedMb) * 100) : 0, color: "purple" },
            { name: "Sessions", size: `${s.sessions?.count || 0} sessions`, percent: usedMb ? Math.round(((s.sessions?.estimatedMb || 0) / usedMb) * 100) : 0, color: "rose" },
          ]);
        }
      }).catch(() => {});
    }
    if (activeSection === "activity") {
      api.get("/settings/activity").then(res => {
        if (res.data?.activity) {
          setActivityLog(res.data.activity.map((a: any) => ({
            time: new Date(a.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }),
            action: a.title || a.message || "Activity",
            icon: MessageSquare,
            color: "text-amber-500",
          })));
        }
      }).catch(() => {});
    }
  }, [activeSection]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  // ── Debounced auto-save for toggles (notifications, privacy, security) ──
  const scheduleSave = useCallback((section: string, data: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await api.put(`/settings/${section}`, data);
        toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} saved!`, { duration: 1500 });
      } catch { /* silent */ }
    }, 800);
  }, []);

  // ── Debounced auto-save for appearance controls ──
  const appearanceSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAppearanceSave = useCallback(() => {
    if (appearanceSaveRef.current) clearTimeout(appearanceSaveRef.current);
    appearanceSaveRef.current = setTimeout(async () => {
      try {
        await api.put("/settings/appearance", {
          themeMode, accentColor, compactMode, glassEffect, animationsEnabled, sidebarCollapse, fontSize,
        });
        setHasChanges(false);
      } catch { /* silent */ }
    }, 700);
  }, [themeMode, accentColor, compactMode, glassEffect, animationsEnabled, sidebarCollapse, fontSize]);

  // ── Apply theme mode app-wide ──
  // ── Apply accent color app-wide ──
  const applyAccentColor = useCallback((color: string) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--primary", color);
      document.documentElement.style.setProperty("--accent-color", color);
      localStorage.setItem("adyapan-accent", color);
    }
  }, []);

  // ── Search filtering ──
  const filteredNav = useMemo(() => {
    if (!searchQuery.trim()) return NAV_ITEMS;
    const q = searchQuery.toLowerCase();
    return NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [searchQuery]);

  // ── Save Profile ──
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put("/profile/me", { fullName, phone, college, degree, branch, graduationYear: gradYear, username, aboutMe: bio });
      setHasChanges(false);
      toast.success("Profile saved!");
    } catch { toast.error("Failed to save profile."); }
    finally { setSaving(false); }
  };

  // ── Upload Profile Photo ──
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB."); return; }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await api.post("/settings/profile-photo", formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data?.photoUrl) {
        setPhotoUrl(res.data.photoUrl);
        toast.success("Profile photo updated!");
      }
    } catch { toast.error("Failed to upload photo."); }
    finally { setUploadingPhoto(false); if (photoInputRef.current) photoInputRef.current.value = ""; }
  };

  // ── Remove Profile Photo ──
  const handlePhotoRemove = async () => {
    try {
      await api.delete("/settings/profile-photo");
      setPhotoUrl("");
      toast.success("Profile photo removed!");
    } catch { toast.error("Failed to remove photo."); }
  };

  // ── Save Appearance ──
  const handleSaveAppearance = async () => {
    setSaving(true);
    try {
      await api.put("/settings/appearance", { themeMode, accentColor, compactMode, glassEffect, animationsEnabled, sidebarCollapse, fontSize });
      setHasChanges(false);
      toast.success("Appearance saved!");
    } catch { toast.error("Failed to save appearance."); }
    finally { setSaving(false); }
  };

  // ── Save AI Preferences ──
  const handleSaveAI = async () => {
    setSaving(true);
    try {
      await api.put("/settings/ai", { aiModel, responseLength, creativity, aiMemory, markdownOutput, codeHighlighting, autoCitation, autoSaveConversations });
      setHasChanges(false);
      toast.success("AI preferences saved!");
    } catch { toast.error("Failed to save AI preferences."); }
    finally { setSaving(false); }
  };

  // ── Save Learning ──
  const handleSaveLearning = async () => {
    setSaving(true);
    try {
      await api.put("/settings/learning", { language, learningStyle, dailyGoal, reminderTime, difficulty, noteFormat, quizDifficulty, tutorPersonality });
      setHasChanges(false);
      toast.success("Learning preferences saved!");
    } catch { toast.error("Failed to save learning preferences."); }
    finally { setSaving(false); }
  };

  // ── Generic top-bar Save (context-aware) ──
  const handleSave = async () => {
    if (activeSection === "profile") return handleSaveProfile();
    if (activeSection === "appearance") return handleSaveAppearance();
    if (activeSection === "ai-preferences") return handleSaveAI();
    if (activeSection === "learning") return handleSaveLearning();
    if (activeSection === "notifications") {
      setSaving(true);
      try {
        await api.put("/settings/notifications", {
          notifEmail, notifPush, notifAssignment, notifInterview,
          notifCoding, notifResearch, notifWeekly, notifDaily,
        });
        setHasChanges(false);
        toast.success("Notification preferences saved!");
      } catch { toast.error("Failed to save notification preferences."); }
      finally { setSaving(false); }
      return;
    }
    if (activeSection === "security") {
      setSaving(true);
      try {
        await api.put("/settings/security", { twoFactorEnabled: twoFactor, loginAlerts });
        setHasChanges(false);
        toast.success("Security settings saved!");
      } catch { toast.error("Failed to save security settings."); }
      finally { setSaving(false); }
      return;
    }
    if (activeSection === "privacy") {
      setSaving(true);
      try {
        await api.put("/settings/privacy", { publicProfile, dataCollection, personalizedAI });
        setHasChanges(false);
        toast.success("Privacy settings saved!");
      } catch { toast.error("Failed to save privacy settings."); }
      finally { setSaving(false); }
      return;
    }
    toast.success("Settings saved!");
    setHasChanges(false);
  };

  const handleReset = async () => {
    setHasChanges(false);
    toast.info("Reloading saved settings...");
    try {
      const res = await api.get("/settings");
      const s = res.data?.settings || {};
      setThemeMode((s.themeMode || "dark") as "dark" | "light" | "system");
      setAccentColor(s.accentColor || "#f59e0b");
      setCompactMode(!!s.compactMode);
      setGlassEffect(s.glassEffect ?? true);
      setAnimationsEnabled(s.animationsEnabled ?? true);
      setSidebarCollapse(s.sidebarCollapse ?? true);
      setFontSize(s.fontSize || 14);
    } catch { /* ignore */ }
  };

  // ── Change Password ──
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { toast.error("Fill in all password fields."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      await api.post("/settings/change-password", { currentPassword, newPassword });
      toast.success("Password changed successfully!");
      setShowChangePassword(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to change password.");
    } finally { setSaving(false); }
  };

  // ── Delete Account ──
  const handleDeleteAccount = async () => {
    if (!deletePassword) { toast.error("Enter your password to confirm."); return; }
    setSaving(true);
    try {
      await api.delete("/settings/account", { data: { password: deletePassword } });
      toast.success("Account deleted. Redirecting...");
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete account.");
    } finally { setSaving(false); }
  };

  // ── Export User Data ──
  const handleExportData = async () => {
    toast.info("Preparing your data export...");
    try {
      const res = await api.get("/settings/export-data", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `adyapan-export-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch { toast.error("Failed to export data."); }
  };

  // ── Delete Chat History ──
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const handleDeleteChatHistory = async () => {
    setSaving(true);
    try {
      const res = await api.delete("/settings/chat-history");
      toast.success(`${res.data?.deletedSessions || 0} chat sessions deleted!`);
      setShowDeleteChatModal(false);
    } catch { toast.error("Failed to delete chat history."); }
    finally { setSaving(false); }
  };

  // ── Logout All Devices ──
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogoutDevices = async () => {
    setSaving(true);
    try {
      await api.post("/settings/logout-devices");
      toast.success("All other devices logged out!");
      setShowLogoutModal(false);
    } catch { toast.error("Failed to logout devices."); }
    finally { setSaving(false); }
  };

  const handleSectionChange = (id: SectionId) => {
    setActiveSection(id);
    setMobileNavOpen(false);
  };

  // ── Profile completion calc ──
  const profileCompletion = useMemo(() => {
    const fields = [fullName, username, email, phone, college, degree, branch, gradYear, bio];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [fullName, username, email, phone, college, degree, branch, gradYear, bio]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}>Loading your settings...</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-5"
      style={{ color: c.text }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Settings className="text-amber-500" size={22} /> Settings
          </h1>
          <p className="text-xs mt-1" style={{ color: c.textMuted }}>
            Manage your account, AI preferences, security, and application settings.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="pl-8 pr-3 py-2 rounded-xl text-xs border outline-none transition-all w-48 focus:w-56"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
            />
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{ borderColor: c.border, color: c.textSec, background: c.cardBg }}
          >
            <RotateCcw size={13} /> Reset
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 transition-all"
          >
            <Save size={13} /> Save Changes
          </button>
        </div>
      </div>

      {/* ── Mobile search ── */}
      <div className="relative sm:hidden">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings..."
          className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border outline-none transition-all"
          style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
        />
      </div>

      {/* ── Main Layout ── */}
      <div className="flex gap-5 relative">

        {/* ── Left Navigation (Desktop) ── */}
        <nav
          className="hidden lg:block w-[220px] shrink-0 sticky top-0 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)] pb-4"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          <div
            className="rounded-2xl border p-2 space-y-0.5"
            style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
          >
            {filteredNav.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all relative cursor-pointer"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.1))"
                      : "transparent",
                    color: isActive ? "#f59e0b" : c.textSec,
                  }}
                >
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-amber-500 to-orange-500"
                      style={{ boxShadow: "0 0 8px rgba(245,158,11,0.5)" }}
                    />
                  )}
                  <Icon size={15} className="shrink-0" />
                  <span className="text-[11px] font-bold truncate">{item.label}</span>
                  {isActive && <ChevronRight size={12} className="ml-auto shrink-0 opacity-50" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── Mobile Nav Toggle ── */}
        <div className="lg:hidden fixed bottom-5 right-5 z-50">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/30"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* ── Mobile Nav Drawer ── */}
          {mobileNavOpen && (
            <div
              className="fixed inset-0 z-[60] lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <nav
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-0 bottom-0 w-[280px] border-r p-4 space-y-1 overflow-y-auto"
                style={{ background: isDark ? "#0c0d16" : "#ffffff", borderColor: c.border }}
              >
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-sm font-extrabold" style={{ color: c.text }}>Settings</span>
                  <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5">
                    <X size={16} style={{ color: c.textSec }} />
                  </button>
                </div>
                {NAV_ITEMS.map((item) => {
                  const isActive = activeSection === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: isActive ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.1))" : "transparent",
                        color: isActive ? "#f59e0b" : c.textSec,
                      }}
                    >
                      <Icon size={15} />
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0">
            <div key={activeSection}>
              {activeSection === "profile" && <ProfileSection c={c} fullName={fullName} setFullName={setFullName} username={username} setUsername={setUsername} email={email} setEmail={setEmail} phone={phone} setPhone={setPhone} college={college} setCollege={setCollege} degree={degree} setDegree={setDegree} branch={branch} setBranch={setBranch} gradYear={gradYear} setGradYear={setGradYear} bio={bio} setBio={setBio} photoUrl={photoUrl} photoInputRef={photoInputRef} uploadingPhoto={uploadingPhoto} onPhotoUpload={handlePhotoUpload} onPhotoRemove={handlePhotoRemove} markChanged={markChanged} onSave={handleSaveProfile} saving={saving} />}
              {activeSection === "account" && <AccountSection c={c} email={email} plan={plan} memberSince={memberSince} markChanged={markChanged} onDeleteAccount={() => setShowDeleteModal(true)} onChangePassword={() => setShowChangePassword(true)} />}
              {activeSection === "appearance" && <AppearanceSection c={c} isDark={isDark} themeMode={themeMode} setThemeMode={setThemeMode} accentColor={accentColor} setAccentColor={setAccentColor} compactMode={compactMode} setCompactMode={setCompactMode} glassEffect={glassEffect} setGlassEffect={setGlassEffect} animationsEnabled={animationsEnabled} setAnimationsEnabled={setAnimationsEnabled} sidebarCollapse={sidebarCollapse} setSidebarCollapse={setSidebarCollapse} fontSize={fontSize} setFontSize={setFontSize} markChanged={markChanged} onAutoSave={scheduleAppearanceSave} onApplyTheme={applyTheme} onApplyAccent={applyAccentColor} onSave={handleSaveAppearance} saving={saving} />}
              {activeSection === "notifications" && <NotificationsSection c={c} notifEmail={notifEmail} setNotifEmail={setNotifEmail} notifPush={notifPush} setNotifPush={setNotifPush} notifAssignment={notifAssignment} setNotifAssignment={setNotifAssignment} notifInterview={notifInterview} setNotifInterview={setNotifInterview} notifCoding={notifCoding} setNotifCoding={setNotifCoding} notifResearch={notifResearch} setNotifResearch={setNotifResearch} notifWeekly={notifWeekly} setNotifWeekly={setNotifWeekly} notifDaily={notifDaily} setNotifDaily={setNotifDaily} markChanged={markChanged} scheduleSave={scheduleSave} />}
              {activeSection === "ai-preferences" && <AIPreferencesSection c={c} aiModel={aiModel} setAiModel={setAiModel} responseLength={responseLength} setResponseLength={setResponseLength} creativity={creativity} setCreativity={setCreativity} aiMemory={aiMemory} setAiMemory={setAiMemory} markdownOutput={markdownOutput} setMarkdownOutput={setMarkdownOutput} codeHighlighting={codeHighlighting} setCodeHighlighting={setCodeHighlighting} autoCitation={autoCitation} setAutoCitation={setAutoCitation} autoSaveConversations={autoSaveConversations} setAutoSaveConversations={setAutoSaveConversations} markChanged={markChanged} onSave={handleSaveAI} saving={saving} />}
              {activeSection === "learning" && <LearningSection c={c} language={language} setLanguage={setLanguage} learningStyle={learningStyle} setLearningStyle={setLearningStyle} dailyGoal={dailyGoal} setDailyGoal={setDailyGoal} reminderTime={reminderTime} setReminderTime={setReminderTime} difficulty={difficulty} setDifficulty={setDifficulty} noteFormat={noteFormat} setNoteFormat={setNoteFormat} quizDifficulty={quizDifficulty} setQuizDifficulty={setQuizDifficulty} tutorPersonality={tutorPersonality} setTutorPersonality={setTutorPersonality} markChanged={markChanged} onSave={handleSaveLearning} saving={saving} />}
              {activeSection === "security" && <SecuritySection c={c} twoFactor={twoFactor} setTwoFactor={setTwoFactor} loginAlerts={loginAlerts} setLoginAlerts={setLoginAlerts} showPassword={showPassword} setShowPassword={setShowPassword} activeDevices={activeDevices} markChanged={markChanged} scheduleSave={scheduleSave} onChangePassword={() => setShowChangePassword(true)} onLogoutDevices={() => setShowLogoutModal(true)} />}
              {activeSection === "privacy" && <PrivacySection c={c} publicProfile={publicProfile} setPublicProfile={setPublicProfile} dataCollection={dataCollection} setDataCollection={setDataCollection} personalizedAI={personalizedAI} setPersonalizedAI={setPersonalizedAI} markChanged={markChanged} scheduleSave={scheduleSave} onExportData={handleExportData} onDeleteChatHistory={() => setShowDeleteChatModal(true)} onDeleteAccount={() => setShowDeleteModal(true)} />}
              {activeSection === "connected" && <ConnectedAccountsSection c={c} accounts={connectedAccounts} setAccounts={setConnectedAccounts} markChanged={markChanged} scheduleSave={scheduleSave} />}
              {activeSection === "api" && <APISection c={c} apiKeys={apiKeys} setApiKeys={setApiKeys} markChanged={markChanged} scheduleSave={scheduleSave} />}
              {activeSection === "storage" && <StorageSection c={c} storageUsed={storageUsed} storageTotal={storageTotal} storagePercent={storagePercent} categories={storageCategories} />}
              {activeSection === "activity" && <ActivitySection c={c} activityLog={activityLog} />}
              {activeSection === "help" && <HelpSection c={c} />}
            </div>
        </div>

        {/* ── Right Sidebar (Desktop) ── */}
        <aside className="hidden xl:block w-[260px] shrink-0 sticky top-0 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto pb-4" style={{ scrollbarWidth: "thin" }}>
          {/* Profile Summary Card */}
          <div
            className="rounded-2xl border p-5 space-y-4"
            style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
          >
            <div className="flex flex-col items-center text-center">
              <PremiumProgressRing value={profileCompletion} size={80} strokeWidth={6} />
              <span className="text-[10px] font-bold uppercase tracking-wider mt-2" style={{ color: c.textMuted }}>Profile Completion</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: c.textMuted }}>Profile</span>
                <span className="font-bold">{profileCompletion}%</span>
              </div>
              <PremiumProgressBar value={profileCompletion} color="amber" height={4} />
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: c.textMuted }}>Storage Used</span>
                <span className="font-bold">{storageUsed} MB / {storageTotal} MB</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div
            className="rounded-2xl border p-4 space-y-2"
            style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Quick Actions</span>
            {[
              { label: "Upgrade Plan", icon: ArrowUpRight, color: "text-amber-500", action: () => router.push("/premium") },
              { label: "Download Data", icon: Download, color: "text-cyan-500", action: handleExportData },
              { label: "Export Chats", icon: FileText, color: "text-purple-500", action: handleExportData },
              { label: "Invite Friend", icon: Link2, color: "text-emerald-500", action: () => { navigator.clipboard.writeText(window.location.origin + "/register?ref=" + username); toast.success("Invite link copied!"); } },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold transition-all hover:bg-white/5"
                style={{ color: c.textSec }}
              >
                <action.icon size={14} className={action.color} />
                {action.label}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* ── Changes indicator ── */}
        {hasChanges && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl"
            style={{
              background: isDark ? "rgba(12,13,22,0.95)" : "rgba(255,255,255,0.95)",
              borderColor: c.border,
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 40px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-xs font-bold" style={{ color: c.text }}>You have unsaved changes</span>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold"
            >
              Save Now
            </button>
          </div>
        )}

      {/* ── Change Password Modal ── */}
        {showChangePassword && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={() => setShowChangePassword(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-2xl border p-6 space-y-4 w-full max-w-md"
              style={{ background: isDark ? "#0c0d16" : "#ffffff", borderColor: c.border }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.text }}>
                  <Key size={16} className="text-amber-500" /> Change Password
                </h3>
                <button onClick={() => setShowChangePassword(false)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <X size={16} style={{ color: c.textSec }} />
                </button>
              </div>
              {[
                { label: "Current Password", value: currentPassword, setter: setCurrentPassword },
                { label: "New Password", value: newPassword, setter: setNewPassword },
                { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword },
              ].map((field) => (
                <div key={field.label} className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>{field.label}</label>
                  <div className="relative">
                    <input
                      type={showPwFields ? "text" : "password"}
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all pr-10"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowPwFields(!showPwFields)}
                className="flex items-center gap-1.5 text-[10px]"
                style={{ color: c.textMuted }}
              >
                {showPwFields ? <EyeOff size={11} /> : <Eye size={11} />}
                {showPwFields ? "Hide" : "Show"} passwords
              </button>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all"
                  style={{ borderColor: c.border, color: c.textSec }}
                >Cancel</button>
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
                  Change Password
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ── Delete Account Modal ── */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-2xl border p-6 space-y-4 w-full max-w-md"
              style={{ background: isDark ? "#0c0d16" : "#ffffff", borderColor: "rgba(239,68,68,0.3)" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2 text-red-500">
                  <AlertTriangle size={16} /> Delete Account
                </h3>
                <button onClick={() => setShowDeleteModal(false)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <X size={16} style={{ color: c.textSec }} />
                </button>
              </div>
              <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20">
                <p className="text-xs" style={{ color: c.textSec }}>
                  ⚠️ This action is <strong>permanent and irreversible</strong>. All your data including notes, sessions, progress, and settings will be permanently deleted.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Confirm with your password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter password to confirm..."
                  className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-red-500/40 transition-all"
                  style={{ background: c.inputBg, borderColor: "rgba(239,68,68,0.3)", color: c.text }}
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all"
                  style={{ borderColor: c.border, color: c.textSec }}
                >Cancel</button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={saving || !deletePassword}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ── Delete Chat History Modal ── */}
        {showDeleteChatModal && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={() => setShowDeleteChatModal(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-2xl border p-6 space-y-4 w-full max-w-md"
              style={{ background: isDark ? "#0c0d16" : "#ffffff", borderColor: "rgba(249,115,22,0.3)" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "#f97316" }}>
                  <Trash2 size={16} /> Delete Chat History
                </h3>
                <button onClick={() => setShowDeleteChatModal(false)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <X size={16} style={{ color: c.textSec }} />
                </button>
              </div>
              <div className="rounded-xl p-3 bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs" style={{ color: c.textSec }}>
                  This will permanently delete all your AI conversations. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowDeleteChatModal(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all"
                  style={{ borderColor: c.border, color: c.textSec }}
                >Cancel</button>
                <button
                  onClick={handleDeleteChatHistory}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete All Chats
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ── Logout All Devices Modal ── */}
        {showLogoutModal && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={() => setShowLogoutModal(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-2xl border p-6 space-y-4 w-full max-w-md"
              style={{ background: isDark ? "#0c0d16" : "#ffffff", borderColor: "rgba(239,68,68,0.3)" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2 text-red-500">
                  <LogOut size={16} /> Logout All Devices
                </h3>
                <button onClick={() => setShowLogoutModal(false)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <X size={16} style={{ color: c.textSec }} />
                </button>
              </div>
              <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20">
                <p className="text-xs" style={{ color: c.textSec }}>
                  This will log you out of all other devices. You will need to sign in again on those devices.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all"
                  style={{ borderColor: c.border, color: c.textSec }}
                >Cancel</button>
                <button
                  onClick={handleLogoutDevices}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                  Logout All
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Profile Section ─────────────────────────────────────────────────────
function ProfileSection({
  c, fullName, setFullName, username, setUsername, email, setEmail, phone, setPhone,
  college, setCollege, degree, setDegree, branch, setBranch, gradYear, setGradYear,
  bio, setBio, photoUrl, photoInputRef, uploadingPhoto, onPhotoUpload, onPhotoRemove,
  markChanged, onSave, saving,
}: {
  c: Record<string, string>;
  fullName: string; setFullName: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  college: string; setCollege: (v: string) => void;
  degree: string; setDegree: (v: string) => void;
  branch: string; setBranch: (v: string) => void;
  gradYear: string; setGradYear: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  photoUrl: string; photoInputRef: React.RefObject<HTMLInputElement>;
  uploadingPhoto: boolean; onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhotoRemove: () => void;
  markChanged: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const inputStyle = { background: c.inputBg, borderColor: c.border, color: c.text };

  return (
    <div className="space-y-5">
      {/* Photo Card */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: c.primary }}>
          <Camera size={16} /> Profile Photo
        </h3>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-500/30">
              <img src={photoUrl || getDiceBearUrl(fullName)} alt="avatar" width={80} height={80} className="block object-cover w-full h-full" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => photoInputRef.current?.click()}>
              <Camera size={18} className="text-white" />
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} />
          </div>
          <div>
            <span className="text-xs font-bold block" style={{ color: c.text }}>{fullName}</span>
            <span className="text-[10px] block mt-0.5" style={{ color: c.textMuted }}>JPG, PNG or GIF. Max 2MB.</span>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold disabled:opacity-50">
                {uploadingPhoto ? "Uploading..." : "Upload Photo"}
              </button>
              {photoUrl && (
                <button
                  onClick={onPhotoRemove}
                  className="px-3 py-1.5 rounded-lg border text-[10px] font-bold"
                  style={{ borderColor: c.border, color: c.textMuted }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <User size={16} /> Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Full Name</label>
            <input value={fullName} onChange={(e) => { setFullName(e.target.value); markChanged(); }}
              className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Username</label>
            <input value={username} onChange={(e) => { setUsername(e.target.value); markChanged(); }}
              className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: c.textMuted }}>
              <Mail size={10} /> Email Address
            </label>
            <input value={email} onChange={(e) => { setEmail(e.target.value); markChanged(); }}
              className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: c.textMuted }}>
              <Phone size={10} /> Phone Number
            </label>
            <input value={phone} onChange={(e) => { setPhone(e.target.value); markChanged(); }}
              className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
              style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Education */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <GraduationCap size={16} /> Education
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>College / University</label>
            <input value={college} onChange={(e) => { setCollege(e.target.value); markChanged(); }}
              className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Degree</label>
            <input value={degree} onChange={(e) => { setDegree(e.target.value); markChanged(); }}
              className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Branch / Major</label>
            <input value={branch} onChange={(e) => { setBranch(e.target.value); markChanged(); }}
              className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Graduation Year</label>
            <input value={gradYear} onChange={(e) => { setGradYear(e.target.value); markChanged(); }}
              className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
              style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <FileText size={16} /> Bio
        </h3>
        <textarea value={bio} onChange={(e) => { setBio(e.target.value); markChanged(); }}
          rows={3} maxLength={300}
          className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all resize-none"
          style={inputStyle} />
        <div className="flex justify-end">
          <span className="text-[10px]" style={{ color: c.textMuted }}>{bio.length}/300</span>
        </div>
      </div>

      {/* Save/Cancel */}
      <div
        className="flex justify-end gap-2.5">
        <PremiumButton variant="secondary" onClick={() => window.location.reload()}>Cancel</PremiumButton>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Profile
        </button>
      </div>
    </div>
  );
}

// ─── Account Section ─────────────────────────────────────────────────────
export function AccountSection({
  c, email, plan, memberSince, markChanged, onDeleteAccount, onChangePassword,
}: {
  c: Record<string, string>;
  email: string;
  plan: string;
  memberSince: string;
  markChanged: () => void;
  onDeleteAccount: () => void;
  onChangePassword: () => void;
}) {
  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Settings size={16} /> Account Information
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: c.border }}>
            <div>
              <span className="text-xs font-bold block">Email Address</span>
              <span className="text-[10px]" style={{ color: c.textMuted }}>{email}</span>
            </div>
            <PremiumBadge variant="green">Verified</PremiumBadge>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: c.border }}>
            <div>
              <span className="text-xs font-bold block">Account Type</span>
              <span className="text-[10px]" style={{ color: c.textMuted }}>{plan === "free" ? "Free Plan" : "Premium Student"}</span>
            </div>
            <PremiumBadge variant={plan === "free" ? "green" : "amber"}>{plan === "free" ? "Free" : "Premium"}</PremiumBadge>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: c.border }}>
            <div>
              <span className="text-xs font-bold block">Member Since</span>
              <span className="text-[10px]" style={{ color: c.textMuted }}>{memberSince || "—"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <div>
              <span className="text-xs font-bold block">Language</span>
              <span className="text-[10px]" style={{ color: c.textMuted }}>Interface language</span>
            </div>
            <span className="text-xs font-bold" style={{ color: c.textSec }}>English (IN)</span>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div
        className="rounded-2xl border p-6 space-y-3"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Shield size={16} /> Account Actions
        </h3>
        <button
          onClick={onChangePassword}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-xs font-bold transition-all hover:border-amber-500/30"
          style={{ borderColor: c.border, color: c.textSec }}
        >
          <Key size={15} className="text-amber-500" />
          <div>
            <span className="block">Change Password</span>
            <span className="text-[10px] font-normal" style={{ color: c.textMuted }}>Update your account password securely</span>
          </div>
          <ChevronRight size={14} className="ml-auto opacity-40" />
        </button>
        <button
          onClick={onDeleteAccount}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-xs font-bold transition-all border-red-500/20 hover:border-red-500/40"
          style={{ color: "#ef4444" }}
        >
          <Trash2 size={15} />
          <div>
            <span className="block">Delete Account</span>
            <span className="text-[10px] font-normal text-red-400">Permanently delete your account and all data</span>
          </div>
          <ChevronRight size={14} className="ml-auto opacity-40" />
        </button>
      </div>
    </div>
  );
}

// ─── Appearance Section ──────────────────────────────────────────────────
export function AppearanceSection({
  c, isDark, themeMode, setThemeMode, accentColor, setAccentColor,
  compactMode, setCompactMode, glassEffect, setGlassEffect,
  animationsEnabled, setAnimationsEnabled, sidebarCollapse, setSidebarCollapse,
  fontSize, setFontSize, markChanged, onAutoSave, onApplyTheme, onApplyAccent, onSave, saving,
}: {
  c: Record<string, string>; isDark: boolean;
  themeMode: string; setThemeMode: (v: "dark" | "light" | "system") => void;
  accentColor: string; setAccentColor: (v: string) => void;
  compactMode: boolean; setCompactMode: (v: boolean) => void;
  glassEffect: boolean; setGlassEffect: (v: boolean) => void;
  animationsEnabled: boolean; setAnimationsEnabled: (v: boolean) => void;
  sidebarCollapse: boolean; setSidebarCollapse: (v: boolean) => void;
  fontSize: number; setFontSize: (v: number) => void;
  markChanged: () => void;
  onAutoSave?: () => void;
  onApplyTheme?: (mode: string) => void;
  onApplyAccent?: (color: string) => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  const change = (fn: () => void) => { fn(); markChanged(); onAutoSave?.(); };

  return (
    <div className="space-y-5">
      {/* Theme Mode */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Palette size={16} /> Theme Mode
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on the eyes" },
            { id: "light" as const, label: "Light", icon: Sun, desc: "Bright and clean" },
            { id: "system" as const, label: "System", icon: Monitor, desc: "Match OS setting" },
          ].map((mode) => {
            const isActive = themeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => change(() => { setThemeMode(mode.id); onApplyTheme?.(mode.id); })}
                className="p-4 rounded-xl border text-center space-y-2 transition-all cursor-pointer"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.08))"
                    : c.cardBg,
                  borderColor: isActive ? "rgba(245,158,11,0.4)" : c.border,
                  boxShadow: isActive ? "0 0 20px rgba(245,158,11,0.1)" : "none",
                }}
              >
                <mode.icon size={20} className={isActive ? "text-amber-500 mx-auto" : "mx-auto"} style={!isActive ? { color: c.textSec } : {}} />
                <div>
                  <span className="text-xs font-bold block" style={{ color: isActive ? "#f59e0b" : c.text }}>{mode.label}</span>
                  <span className="text-[9px]" style={{ color: c.textMuted }}>{mode.desc}</span>
                </div>
                {isActive && (
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-amber-500 mx-auto"
                    style={{ boxShadow: "0 0 6px rgba(245,158,11,0.6)" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>



      {/* Toggles */}
      <div
        className="rounded-2xl border p-6 space-y-1 divide-y"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2 pb-3" style={{ color: c.primary }}>
          <Eye size={16} /> Display Options
        </h3>
        <SettingsToggle enabled={compactMode} onToggle={() => change(() => setCompactMode(!compactMode))} label="Compact Mode" description="Reduce spacing for more content density" icon={<Monitor size={14} />} />
        <SettingsToggle enabled={glassEffect} onToggle={() => change(() => setGlassEffect(!glassEffect))} label="Glass Effect" description="Enable glassmorphism backdrop blur" icon={<Eye size={14} />} />
        <SettingsToggle enabled={animationsEnabled} onToggle={() => change(() => setAnimationsEnabled(!animationsEnabled))} label="Animations" description="Smooth transitions and motion effects" icon={<Sparkles size={14} />} />
        <SettingsToggle enabled={sidebarCollapse} onToggle={() => change(() => setSidebarCollapse(!sidebarCollapse))} label="Sidebar Auto Collapse" description="Collapse sidebar when not hovered" icon={<Menu size={14} />} />
      </div>

      {/* Font Size */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <FileText size={16} /> Font Size
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-[10px]" style={{ color: c.textMuted }}>A</span>
          <input type="range" min={12} max={18} value={fontSize}
            onChange={(e) => change(() => setFontSize(Number(e.target.value)))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f59e0b ${((fontSize - 12) / 6) * 100}%, ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} ${((fontSize - 12) / 6) * 100}%)`,
            }}
          />
          <span className="text-sm font-bold" style={{ color: c.text }}>{fontSize}px</span>
        </div>
      </div>

      {/* Live Preview */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Eye size={16} /> Live Preview
        </h3>
        <div className="rounded-xl border p-4" style={{ borderColor: c.border, background: isDark ? "#070913" : "#f8fafc" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-extrabold" style={{ color: c.text }}>Preview Card</span>
          </div>
          <p style={{ fontSize: `${fontSize}px`, color: c.textSec }} className="leading-relaxed">
            This is how your content will appear with the selected font size.
          </p>
          <div className="mt-3 flex gap-2">
            <div className="px-3 py-1 rounded-lg text-[10px] font-bold text-black" style={{ background: c.primary }}>Sample Button</div>
            <div className="px-3 py-1 rounded-lg text-[10px] font-bold border" style={{ borderColor: c.border, color: c.textSec }}>Secondary</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Section ───────────────────────────────────────────────
export function NotificationsSection({
  c, notifEmail, setNotifEmail, notifPush, setNotifPush,
  notifAssignment, setNotifAssignment, notifInterview, setNotifInterview,
  notifCoding, setNotifCoding, notifResearch, setNotifResearch,
  notifWeekly, setNotifWeekly, notifDaily, setNotifDaily, markChanged, scheduleSave,
}: {
  c: Record<string, string>;
  notifEmail: boolean; setNotifEmail: (v: boolean) => void;
  notifPush: boolean; setNotifPush: (v: boolean) => void;
  notifAssignment: boolean; setNotifAssignment: (v: boolean) => void;
  notifInterview: boolean; setNotifInterview: (v: boolean) => void;
  notifCoding: boolean; setNotifCoding: (v: boolean) => void;
  notifResearch: boolean; setNotifResearch: (v: boolean) => void;
  notifWeekly: boolean; setNotifWeekly: (v: boolean) => void;
  notifDaily: boolean; setNotifDaily: (v: boolean) => void;
  markChanged: () => void;
  scheduleSave: (section: string, data: Record<string, unknown>) => void;
}) {
  const handleToggle = (key: string, current: boolean, setter: (v: boolean) => void) => {
    const val = !current;
    setter(val);
    markChanged();
    scheduleSave("notifications", { [key]: val });
  };

  const toggles = [
    { enabled: notifEmail, toggle: () => handleToggle("notifEmail", notifEmail, setNotifEmail), label: "Email Notifications", desc: "Receive updates about your learning progress", icon: <Mail size={14} /> },
    { enabled: notifPush, toggle: () => handleToggle("notifPush", notifPush, setNotifPush), label: "Push Notifications", desc: "Browser and mobile push alerts", icon: <Bell size={14} /> },
    { enabled: notifAssignment, toggle: () => handleToggle("notifAssignment", notifAssignment, setNotifAssignment), label: "Assignment Alerts", desc: "Deadline reminders and submission updates", icon: <ClipboardList size={14} /> },
    { enabled: notifInterview, toggle: () => handleToggle("notifInterview", notifInterview, setNotifInterview), label: "Interview Reminders", desc: "Upcoming interview schedule notifications", icon: <MessageSquare size={14} /> },
    { enabled: notifCoding, toggle: () => handleToggle("notifCoding", notifCoding, setNotifCoding), label: "Coding Challenge Alerts", desc: "New challenges and contest notifications", icon: <Code size={14} /> },
    { enabled: notifResearch, toggle: () => handleToggle("notifResearch", notifResearch, setNotifResearch), label: "Research Updates", desc: "New research papers and citations", icon: <FileText size={14} /> },
    { enabled: notifWeekly, toggle: () => handleToggle("notifWeekly", notifWeekly, setNotifWeekly), label: "Weekly Progress Report", desc: "Summary of your weekly learning activity", icon: <Activity size={14} /> },
    { enabled: notifDaily, toggle: () => handleToggle("notifDaily", notifDaily, setNotifDaily), label: "Daily Study Reminder", desc: "Daily nudge to stay on track", icon: <Clock size={14} /> },
  ];

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-6 space-y-1 divide-y"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2 pb-3" style={{ color: c.primary }}>
          <Bell size={16} /> Notification Preferences
        </h3>
        {toggles.map((t) => (
          <SettingsToggle key={t.label} enabled={t.enabled} onToggle={t.toggle} label={t.label} description={t.desc} icon={t.icon} />
        ))}
      </div>
    </div>
  );
}

// ─── AI Preferences Section ──────────────────────────────────────────────
export function AIPreferencesSection({
  c, aiModel, setAiModel, responseLength, setResponseLength,
  creativity, setCreativity, aiMemory, setAiMemory,
  markdownOutput, setMarkdownOutput, codeHighlighting, setCodeHighlighting,
  autoCitation, setAutoCitation, autoSaveConversations, setAutoSaveConversations, markChanged,
}: {
  c: Record<string, string>;
  aiModel: string; setAiModel: (v: string) => void;
  responseLength: string; setResponseLength: (v: string) => void;
  creativity: number; setCreativity: (v: number) => void;
  aiMemory: boolean; setAiMemory: (v: boolean) => void;
  markdownOutput: boolean; setMarkdownOutput: (v: boolean) => void;
  codeHighlighting: boolean; setCodeHighlighting: (v: boolean) => void;
  autoCitation: boolean; setAutoCitation: (v: boolean) => void;
  autoSaveConversations: boolean; setAutoSaveConversations: (v: boolean) => void;
  markChanged: () => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  const models = [
    { id: "gemini", name: "Gemini", desc: "Google's multimodal AI" },
    { id: "openai", name: "OpenAI", desc: "GPT-4 powered responses" },
    { id: "claude", name: "Claude", desc: "Anthropic's helpful AI" },
    { id: "deepseek", name: "DeepSeek", desc: "Advanced reasoning model" },
    { id: "auto", name: "Auto", desc: "Best model per task" },
  ];

  return (
    <div className="space-y-5">
      {/* Default Model */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Sparkles size={16} /> Default AI Model
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {models.map((model) => {
            const isActive = aiModel === model.id;
            return (
              <button
                key={model.id}
                onClick={() => { setAiModel(model.id); markChanged(); }}
                className="p-3 rounded-xl border text-center space-y-1.5 transition-all"
                style={{
                  background: isActive ? "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.08))" : c.cardBg,
                  borderColor: isActive ? "rgba(245,158,11,0.4)" : c.border,
                  boxShadow: isActive ? "0 0 15px rgba(245,158,11,0.1)" : "none",
                }}
              >
                <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-xs font-black"
                  style={{ background: isActive ? "rgba(245,158,11,0.15)" : c.cardBg, color: isActive ? "#f59e0b" : c.textSec }}>
                  {model.name[0]}
                </div>
                <span className="text-[11px] font-bold block" style={{ color: isActive ? "#f59e0b" : c.text }}>{model.name}</span>
                <span className="text-[9px] block" style={{ color: c.textMuted }}>{model.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Response Length */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <MessageSquare size={16} /> Response Length
        </h3>
        <div className="flex gap-3">
          {["short", "balanced", "detailed"].map((len) => {
            const isActive = responseLength === len;
            return (
              <button
                key={len}
                onClick={() => { setResponseLength(len); markChanged(); }}
                className="flex-1 py-2.5 rounded-xl border text-xs font-bold capitalize transition-all"
                style={{
                  background: isActive ? "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(234,88,12,0.08))" : "transparent",
                  borderColor: isActive ? "rgba(245,158,11,0.4)" : c.border,
                  color: isActive ? "#f59e0b" : c.textSec,
                }}
              >
                {len}
              </button>
            );
          })}
        </div>
      </div>

      {/* Creativity Slider */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Brain size={16} /> Creativity Level
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-[10px]" style={{ color: c.textMuted }}>Precise</span>
          <input type="range" min={0} max={100} value={creativity}
            onChange={(e) => { setCreativity(Number(e.target.value)); markChanged(); }}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f59e0b ${creativity}%, ${c.cardBg.includes("255,255,255") ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} ${creativity}%)`,
            }}
          />
          <span className="text-[10px]" style={{ color: c.textMuted }}>Creative</span>
          <span className="text-xs font-bold w-8 text-right" style={{ color: c.text }}>{creativity}%</span>
        </div>
      </div>

      {/* Toggles */}
      <div
        className="rounded-2xl border p-6 space-y-1 divide-y"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2 pb-3" style={{ color: c.primary }}>
          <Zap size={16} /> AI Behavior
        </h3>
        <SettingsToggle enabled={aiMemory} onToggle={() => { setAiMemory(!aiMemory); markChanged(); }} label="AI Memory" description="AI remembers context across conversations" icon={<Brain size={14} />} />
        <SettingsToggle enabled={markdownOutput} onToggle={() => { setMarkdownOutput(!markdownOutput); markChanged(); }} label="Markdown Output" description="Format AI responses in markdown" icon={<FileText size={14} />} />
        <SettingsToggle enabled={codeHighlighting} onToggle={() => { setCodeHighlighting(!codeHighlighting); markChanged(); }} label="Code Highlighting" description="Syntax highlighting for code blocks" icon={<Code size={14} />} />
        <SettingsToggle enabled={autoCitation} onToggle={() => { setAutoCitation(!autoCitation); markChanged(); }} label="Auto Citation" description="Automatically cite sources in responses" icon={<BookOpen size={14} />} />
        <SettingsToggle enabled={autoSaveConversations} onToggle={() => { setAutoSaveConversations(!autoSaveConversations); markChanged(); }} label="Auto Save Conversations" description="Save chat history automatically" icon={<Save size={14} />} />
      </div>
    </div>
  );
}

// ─── Learning Section ────────────────────────────────────────────────────
export function LearningSection({
  c, language, setLanguage, learningStyle, setLearningStyle,
  dailyGoal, setDailyGoal, reminderTime, setReminderTime,
  difficulty, setDifficulty, noteFormat, setNoteFormat,
  quizDifficulty, setQuizDifficulty, tutorPersonality, setTutorPersonality, markChanged,
}: {
  c: Record<string, string>;
  language: string; setLanguage: (v: string) => void;
  learningStyle: string; setLearningStyle: (v: string) => void;
  dailyGoal: number; setDailyGoal: (v: number) => void;
  reminderTime: string; setReminderTime: (v: string) => void;
  difficulty: string; setDifficulty: (v: string) => void;
  noteFormat: string; setNoteFormat: (v: string) => void;
  quizDifficulty: string; setQuizDifficulty: (v: string) => void;
  tutorPersonality: string; setTutorPersonality: (v: string) => void;
  markChanged: () => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-6 space-y-5"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <BookOpen size={16} /> Learning Preferences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingsSelect label="Preferred Language" value={language} onChange={(v) => { setLanguage(v); markChanged(); }}
            options={[
              { value: "en", label: "English" },
              { value: "hi", label: "Hindi" },
              { value: "es", label: "Spanish" },
              { value: "fr", label: "French" },
              { value: "de", label: "German" },
              { value: "ja", label: "Japanese" },
            ]} icon={<Globe size={11} />} />
          <SettingsSelect label="Learning Style" value={learningStyle} onChange={(v) => { setLearningStyle(v); markChanged(); }}
            options={[
              { value: "visual", label: "Visual" },
              { value: "auditory", label: "Auditory" },
              { value: "reading", label: "Reading/Writing" },
              { value: "kinesthetic", label: "Kinesthetic" },
            ]} icon={<Eye size={11} />} />
          <SettingsSelect label="Difficulty Level" value={difficulty} onChange={(v) => { setDifficulty(v); markChanged(); }}
            options={[
              { value: "beginner", label: "Beginner" },
              { value: "intermediate", label: "Intermediate" },
              { value: "advanced", label: "Advanced" },
              { value: "expert", label: "Expert" },
            ]} icon={<TrendingUp size={11} />} />
          <SettingsSelect label="Default Note Format" value={noteFormat} onChange={(v) => { setNoteFormat(v); markChanged(); }}
            options={[
              { value: "markdown", label: "Markdown" },
              { value: "pdf", label: "PDF" },
              { value: "docx", label: "Word Document" },
              { value: "txt", label: "Plain Text" },
            ]} icon={<FileText size={11} />} />
          <SettingsSelect label="Quiz Difficulty" value={quizDifficulty} onChange={(v) => { setQuizDifficulty(v); markChanged(); }}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
              { value: "adaptive", label: "Adaptive" },
            ]} icon={<Star size={11} />} />
          <SettingsSelect label="AI Tutor Personality" value={tutorPersonality} onChange={(v) => { setTutorPersonality(v); markChanged(); }}
            options={[
              { value: "friendly", label: "Friendly" },
              { value: "formal", label: "Formal" },
              { value: "socratic", label: "Socratic" },
              { value: "motivational", label: "Motivational" },
            ]} icon={<Heart size={11} />} />
        </div>
      </div>

      {/* Daily Goal */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Target size={16} /> Daily Study Goal
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-[10px]" style={{ color: c.textMuted }}>1 hr</span>
          <input type="range" min={1} max={12} value={dailyGoal}
            onChange={(e) => { setDailyGoal(Number(e.target.value)); markChanged(); }}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f59e0b ${((dailyGoal - 1) / 11) * 100}%, ${c.cardBg.includes("255,255,255") ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} ${((dailyGoal - 1) / 11) * 100}%)`,
            }}
          />
          <span className="text-[10px]" style={{ color: c.textMuted }}>12 hrs</span>
          <span className="text-xs font-bold w-12 text-right" style={{ color: c.text }}>{dailyGoal}h/day</span>
        </div>
      </div>

      {/* Reminder Time */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Clock size={16} /> Study Reminder
        </h3>
        <div className="flex items-center gap-3">
          <input type="time" value={reminderTime}
            onChange={(e) => { setReminderTime(e.target.value); markChanged(); }}
            className="rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
            style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
          />
          <span className="text-[10px]" style={{ color: c.textMuted }}>Daily reminder time</span>
        </div>
      </div>
    </div>
  );
}

// ─── Security Section ────────────────────────────────────────────────────
export function SecuritySection({
  c, twoFactor, setTwoFactor, loginAlerts, setLoginAlerts,
  showPassword, setShowPassword, activeDevices, markChanged,
  scheduleSave, onChangePassword, onLogoutDevices,
}: {
  c: Record<string, string>;
  twoFactor: boolean; setTwoFactor: (v: boolean) => void;
  loginAlerts: boolean; setLoginAlerts: (v: boolean) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  activeDevices: { name: string; location: string; current: boolean; lastActive: string }[];
  markChanged: () => void;
  scheduleSave?: (section: string, data: Record<string, unknown>) => void;
  onChangePassword?: () => void;
  onLogoutDevices?: () => void;
}) {
  const inputStyle = { background: c.inputBg, borderColor: c.border, color: c.text };
  const [secCurrentPw, setSecCurrentPw] = useState("");
  const [secNewPw, setSecNewPw] = useState("");
  const [secConfirmPw, setSecConfirmPw] = useState("");
  const [secSaving, setSecSaving] = useState(false);

  const handleInlinePasswordChange = async () => {
    if (!secCurrentPw || !secNewPw) { toast.error("Fill in all password fields."); return; }
    if (secNewPw !== secConfirmPw) { toast.error("Passwords do not match."); return; }
    if (secNewPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSecSaving(true);
    try {
      await api.post("/settings/change-password", { currentPassword: secCurrentPw, newPassword: secNewPw });
      toast.success("Password changed successfully!");
      setSecCurrentPw(""); setSecNewPw(""); setSecConfirmPw("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to change password.");
    } finally { setSecSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Change Password */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Lock size={16} /> Change Password
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Current Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Enter current password"
                value={secCurrentPw} onChange={(e) => setSecCurrentPw(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all pr-10"
                style={inputStyle} />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff size={14} style={{ color: c.textMuted }} /> : <Eye size={14} style={{ color: c.textMuted }} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>New Password</label>
              <input type="password" placeholder="Enter new password"
                value={secNewPw} onChange={(e) => setSecNewPw(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
                style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Confirm Password</label>
              <input type="password" placeholder="Confirm new password"
                value={secConfirmPw} onChange={(e) => setSecConfirmPw(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
                style={inputStyle} />
            </div>
          </div>
        </div>
        <button
          onClick={handleInlinePasswordChange}
          disabled={secSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold disabled:opacity-60"
        >
          {secSaving ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
          Update Password
        </button>
      </div>

      {/* 2FA & Login Alerts */}
      <div
        className="rounded-2xl border p-6 space-y-1 divide-y"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2 pb-3" style={{ color: c.primary }}>
          <ShieldCheck size={16} /> Two-Factor & Login Security
        </h3>
        <SettingsToggle enabled={twoFactor} onToggle={() => { setTwoFactor(!twoFactor); markChanged(); }} label="Two-Factor Authentication" description="Add an extra layer of security with SMS/email verification" icon={<Fingerprint size={14} />} />
        <SettingsToggle enabled={loginAlerts} onToggle={() => { setLoginAlerts(!loginAlerts); markChanged(); }} label="Login Alerts" description="Get notified of new sign-ins to your account" icon={<Smartphone size={14} />} />
      </div>

      {/* Active Devices */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Monitor size={16} /> Active Devices
        </h3>
        <div className="space-y-2.5">
          {activeDevices.map((device, i) => (
            <div key={i}
              className="flex items-center justify-between p-3 rounded-xl border"
              style={{ borderColor: c.border }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: device.current ? "rgba(245,158,11,0.1)" : c.cardBg }}>
                  <Smartphone size={14} style={{ color: device.current ? "#f59e0b" : c.textMuted }} />
                </div>
                <div>
                  <span className="text-xs font-bold block">{device.name}</span>
                  <span className="text-[10px]" style={{ color: c.textMuted }}>{device.location} · {device.lastActive}</span>
                </div>
              </div>
              {device.current && <PremiumBadge variant="green" pulse>Current</PremiumBadge>}
            </div>
          ))}
        </div>
        <button
          onClick={onLogoutDevices}
          className="w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all"
          style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", background: "rgba(239,68,68,0.05)" }}
        >
          <LogOut size={14} /> Logout All Devices
        </button>
      </div>
    </div>
  );
}

// ─── Privacy Section ─────────────────────────────────────────────────────
export function PrivacySection({
  c, publicProfile, setPublicProfile, dataCollection, setDataCollection,
  personalizedAI, setPersonalizedAI, markChanged, scheduleSave,
  onExportData, onDeleteChatHistory, onDeleteAccount,
}: {
  c: Record<string, string>;
  publicProfile: boolean; setPublicProfile: (v: boolean) => void;
  dataCollection: boolean; setDataCollection: (v: boolean) => void;
  personalizedAI: boolean; setPersonalizedAI: (v: boolean) => void;
  markChanged: () => void;
  scheduleSave: (section: string, data: Record<string, unknown>) => void;
  onExportData: () => void;
  onDeleteChatHistory: () => void;
  onDeleteAccount: () => void;
}) {
  const handleToggle = (key: string, current: boolean, setter: (v: boolean) => void) => {
    const val = !current;
    setter(val);
    markChanged();
    scheduleSave("privacy", { [key]: val });
  };

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-6 space-y-1 divide-y"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2 pb-3" style={{ color: c.primary }}>
          <Lock size={16} /> Privacy Controls
        </h3>
        <SettingsToggle enabled={publicProfile} onToggle={() => handleToggle("publicProfile", publicProfile, setPublicProfile)} label="Public Profile" description="Allow others to view your community profile" icon={<Globe size={14} />} />
        <SettingsToggle enabled={dataCollection} onToggle={() => handleToggle("dataCollection", dataCollection, setDataCollection)} label="Data Collection" description="Help improve Adyapan with anonymous usage data" icon={<Database size={14} />} />
        <SettingsToggle enabled={personalizedAI} onToggle={() => handleToggle("personalizedAI", personalizedAI, setPersonalizedAI)} label="Personalized AI" description="AI uses your learning history for better recommendations" icon={<Brain size={14} />} />
      </div>

      {/* Data Actions */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Database size={16} /> Data Management
        </h3>
        <div className="space-y-2.5">
          <button
            onClick={onExportData}
            className="w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:bg-white/5"
            style={{ borderColor: c.border }}>
            <div className="flex items-center gap-2.5">
              <Download size={14} className="text-cyan-500" />
              <div className="text-left">
                <span className="text-xs font-bold block">Export My Data</span>
                <span className="text-[10px]" style={{ color: c.textMuted }}>Download all your data as JSON</span>
              </div>
            </div>
            <ChevronRight size={14} style={{ color: c.textMuted }} />
          </button>
          <button
            onClick={onDeleteChatHistory}
            className="w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:bg-white/5"
            style={{ borderColor: c.border }}>
            <div className="flex items-center gap-2.5">
              <Trash2 size={14} className="text-orange-500" />
              <div className="text-left">
                <span className="text-xs font-bold block">Delete Chat History</span>
                <span className="text-[10px]" style={{ color: c.textMuted }}>Permanently delete all AI conversations</span>
              </div>
            </div>
            <ChevronRight size={14} style={{ color: c.textMuted }} />
          </button>
          <button
            onClick={onDeleteAccount}
            className="w-full flex items-center justify-between p-3 rounded-xl border transition-all"
            style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.03)" }}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={14} className="text-rose-500" />
              <div className="text-left">
                <span className="text-xs font-bold block" style={{ color: "#ef4444" }}>Delete Account</span>
                <span className="text-[10px]" style={{ color: c.textMuted }}>Permanently delete your account and all data</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-rose-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Connected Accounts Section ──────────────────────────────────────────
// ─── Provider SVG Logos ──────────────────────────────────────────────────
function GoogleLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );
}

function GithubLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function MicrosoftLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M1 1h10v10H1V1z" fill="#F25022" />
      <path d="M13 1h10v10H13V1z" fill="#7FBA00" />
      <path d="M1 13h10v10H1V13z" fill="#00A4EF" />
      <path d="M13 13h10v10H13V13z" fill="#FFB900" />
    </svg>
  );
}

function LinkedinLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0077B5">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

export function ProviderLogo({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  switch (name.toLowerCase()) {
    case "google":
      return <GoogleLogo className={className} />;
    case "github":
      return <GithubLogo className={className} />;
    case "microsoft":
      return <MicrosoftLogo className={className} />;
    case "linkedin":
      return <LinkedinLogo className={className} />;
    default:
      return <Globe className={className} />;
  }
}

const PROVIDER_AUTH_URLS: Record<string, string> = {
  Google: "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Faccounts.google.com%2F&service=mail&flowName=GlifWebSignIn&flowEntry=ServiceLogin",
  GitHub: "https://github.com/login",
  Microsoft: "https://login.microsoftonline.com/",
  LinkedIn: "https://www.linkedin.com/login",
};

export function ConnectedAccountsSection({
  c, accounts, setAccounts, markChanged, scheduleSave,
}: {
  c: Record<string, string>;
  accounts: { name: string; icon: string; color: string; connected: boolean; authUrl?: string }[];
  setAccounts: (v: any) => void;
  markChanged: () => void;
  scheduleSave: (section: string, data: Record<string, unknown>) => void;
}) {
  const toggleAccount = (index: number) => {
    const acct = accounts[index];
    const isConnecting = !acct.connected;
    const updated = [...accounts];
    updated[index] = { ...acct, connected: isConnecting };
    setAccounts(updated);
    markChanged();
    const key = `${acct.name.toLowerCase()}Connected`;
    scheduleSave("connected-accounts", { [key]: isConnecting });

    if (isConnecting) {
      toast.info(`Redirecting to ${acct.name} login page...`);
      const targetUrl = acct.authUrl || PROVIDER_AUTH_URLS[acct.name] || "https://google.com";
      setTimeout(() => {
        window.open(targetUrl, "_blank");
      }, 400);
    } else {
      toast.success(`Disconnected from ${acct.name}`);
    }
  };

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Globe size={16} /> Connected Accounts
        </h3>
        <div className="space-y-2.5">
          {accounts.map((acct, i) => (
            <div key={acct.name}
              className="flex items-center justify-between p-3.5 rounded-xl border" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm shrink-0"
                  style={{ borderColor: c.border, background: "rgba(255,255,255,0.03)" }}>
                  <ProviderLogo name={acct.name} className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold block">{acct.name}</span>
                  <span className="text-[10px]" style={{ color: acct.connected ? "#10b981" : c.textMuted }}>
                    {acct.connected ? "Connected" : "Not connected"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleAccount(i)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                style={{
                  background: acct.connected ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                  color: acct.connected ? "#ef4444" : "#f59e0b",
                  border: `1px solid ${acct.connected ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                }}
              >
                {!acct.connected && <ExternalLink size={10} />}
                {acct.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── API Integrations Section ────────────────────────────────────────────
export function APISection({
  c, apiKeys, setApiKeys, markChanged, scheduleSave,
}: {
  c: Record<string, string>;
  apiKeys: { name: string; slug?: string; status: string; lastSync: string; key: string }[];
  setApiKeys: (v: any) => void;
  markChanged: () => void;
  scheduleSave: (section: string, data: Record<string, unknown>) => void;
}) {
  const inputStyle = { background: c.inputBg, borderColor: c.border, color: c.text };

  const handleUpdateKey = (index: number) => {
    const api = apiKeys[index];
    scheduleSave("api-keys", { [`${api.slug}ApiKey`]: api.key });
    toast.success(`${api.name} key updated!`);
  };

  const handleRemoveKey = (index: number) => {
    const api = apiKeys[index];
    const updated = [...apiKeys];
    updated[index] = { ...updated[index], key: "", status: "inactive", lastSync: "Never" };
    setApiKeys(updated);
    markChanged();
    scheduleSave("api-keys", { [`${api.slug}ApiKey`]: "" });
    toast.success(`${api.name} key removed!`);
  };

  const updateKeyField = (index: number, value: string) => {
    const updated = [...apiKeys];
    updated[index] = { ...updated[index], key: value };
    setApiKeys(updated);
    markChanged();
  };

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <Zap size={16} /> API Integrations
        </h3>
        <div className="space-y-3">
          {apiKeys.map((api, i) => (
            <div key={api.name}
              className="p-4 rounded-xl border space-y-3" style={{ borderColor: c.border }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: api.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)" }}>
                    <Zap size={14} style={{ color: api.status === "active" ? "#10b981" : c.textMuted }} />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{api.name}</span>
                    <span className="text-[10px]" style={{ color: c.textMuted }}>Last sync: {api.lastSync}</span>
                  </div>
                </div>
                <PremiumBadge variant={api.status === "active" ? "green" : "rose"} pulse={api.status === "active"}>
                  {api.status}
                </PremiumBadge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
                  <input
                    type="password"
                    value={api.key}
                    onChange={(e) => updateKeyField(i, e.target.value)}
                    placeholder="Enter API key..."
                    className="w-full rounded-lg px-3 py-2 pl-8 text-[11px] border outline-none focus:border-amber-500/40 transition-all"
                    style={inputStyle}
                  />
                </div>
                <button
                  onClick={() => handleUpdateKey(i)}
                  className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold shrink-0">
                  Update
                </button>
                <button
                  onClick={() => handleRemoveKey(i)}
                  className="px-3 py-2 rounded-lg border text-[10px] font-bold shrink-0"
                  style={{ borderColor: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Storage Section ─────────────────────────────────────────────────────
export function StorageSection({
  c, storageUsed, storageTotal, storagePercent, categories, unit = "MB",
}: {
  c: Record<string, string>;
  storageUsed: number; storageTotal: number; storagePercent: number;
  categories: { name: string; size: string; percent: number; color: "amber" | "green" | "purple" | "rose" }[];
  unit?: string;
}) {
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await api.delete("/settings/storage/cache");
      toast.success("Cache cleared successfully!");
    } catch { toast.error("Failed to clear cache."); }
    finally { setClearingCache(false); }
  };

  const handleDownloadBackup = async () => {
    toast.info("Preparing your backup...");
    try {
      const res = await api.get("/settings/export-data", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `adyapan-backup-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded!");
    } catch { toast.error("Failed to download backup."); }
  };

  return (
    <div className="space-y-5">
      {/* Usage Overview */}
      <div
        className="rounded-2xl border p-6 space-y-5"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <HardDrive size={16} /> Storage Usage
        </h3>
        <div className="flex flex-col items-center">
          <PremiumProgressRing value={storagePercent} size={120} strokeWidth={8} />
          <span className="text-xs mt-3" style={{ color: c.textMuted }}>
            {storageUsed} {unit} of {storageTotal} {unit} used
          </span>
        </div>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold" style={{ color: c.text }}>{cat.name}</span>
                <span style={{ color: c.textMuted }}>{cat.size}</span>
              </div>
              <PremiumProgressBar value={cat.percent} color={cat.color} height={4} />
            </div>
          ))}
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleDownloadBackup}
            className="flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2"
            style={{ borderColor: c.border, color: c.textSec, background: c.cardBg }}>
            <Download size={13} /> Download Backup
          </button>
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className="flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ borderColor: "rgba(239,68,68,0.25)", color: "#ef4444", background: "rgba(239,68,68,0.05)" }}>
            {clearingCache ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {clearingCache ? "Clearing..." : "Clear Cache"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Section ────────────────────────────────────────────────────
export function ActivitySection({
  c, activityLog,
}: {
  c: Record<string, string>;
  activityLog: { time: string; action: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }[];
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = activityLog.filter((item) => {
    if (searchTerm && !item.action.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
            <Activity size={16} /> Activity Log
          </h3>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search activity..."
              className="pl-7 pr-3 py-1.5 rounded-lg text-[11px] border outline-none transition-all w-full sm:w-44"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pl-6">
          <div className="absolute left-[9px] top-0 bottom-0 w-px" style={{ background: c.border }} />
          <div className="space-y-4">
            {filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i}
                  className="relative flex items-start gap-3">
                  <div className="absolute left-[-15px] top-1 w-[10px] h-[10px] rounded-full border-2"
                    style={{ borderColor: c.border, background: c.cardBg }} />
                  <div className="flex-1">
                    <span className="text-xs font-bold block" style={{ color: c.text }}>{item.action}</span>
                    <span className="text-[10px]" style={{ color: c.textMuted }}>{item.time}</span>
                  </div>
                  <Icon size={14} className={item.color} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Help Section ────────────────────────────────────────────────────────
export function HelpSection({ c }: { c: Record<string, string> }) {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme === "dark";
  const [activeModal, setActiveModal] = useState<"faq" | "support" | "bug" | "docs" | "about" | null>(null);

  // FAQ state
  const [faqQuery, setFaqQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Support Ticket state
  const [supportSubject, setSupportSubject] = useState("");
  const [supportCategory, setSupportCategory] = useState("General Inquiry");
  const [supportMessage, setSupportMessage] = useState("");
  const [submittingSupport, setSubmittingSupport] = useState(false);

  // Bug Report state
  const [bugTitle, setBugTitle] = useState("");
  const [bugSeverity, setBugSeverity] = useState("Medium");
  const [bugSteps, setBugSteps] = useState("");
  const [bugMessage, setBugMessage] = useState("");
  const [submittingBug, setSubmittingBug] = useState(false);

  const faqs = [
    {
      q: "How do storage limits work on Adyapan AI?",
      a: "Free accounts receive 50 MB of cloud storage. Upgrading to Premium increases your storage limit to 200 MB for your notes, resumes, study sessions, and assignments."
    },
    {
      q: "How do I upgrade to Premium?",
      a: "Click on the 'Upgrade Plan' or 'Premium' badge in the top navigation bar or settings sidebar to view subscription options."
    },
    {
      q: "How does Ady Chat work?",
      a: "Ady Chat is your personal AI tutor. It assists with study notes, coding problems, career advice, and live mock interview practice."
    },
    {
      q: "Can I use my own API keys?",
      a: "Yes! Navigate to Settings -> API Integrations to add your custom Gemini, OpenAI, Claude, or Groq API keys."
    },
    {
      q: "How do I export my data or chat history?",
      a: "Under Settings -> Privacy, click 'Export Account Data' to download a complete JSON archive of your account records."
    },
    {
      q: "Is my personal data secure?",
      a: "We enforce strict encryption, isolated user sandboxes, and two-factor authentication to ensure your data stays private and safe."
    }
  ];

  const filteredFaqs = faqs.filter(
    (item) =>
      item.q.toLowerCase().includes(faqQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(faqQuery.toLowerCase())
  );

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) {
      toast.error("Please fill in both subject and message.");
      return;
    }
    setSubmittingSupport(true);
    try {
      const res = await api.post("/settings/support-ticket", {
        subject: supportSubject,
        category: supportCategory,
        message: supportMessage,
      });
      toast.success(res.data.message || "Support ticket submitted!");
      setSupportSubject("");
      setSupportMessage("");
      setActiveModal(null);
    } catch {
      toast.error("Failed to submit support ticket.");
    } finally {
      setSubmittingSupport(false);
    }
  };

  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugMessage.trim()) {
      toast.error("Please fill in bug title and description.");
      return;
    }
    setSubmittingBug(true);
    try {
      const res = await api.post("/settings/report-bug", {
        title: bugTitle,
        severity: bugSeverity,
        steps: bugSteps,
        message: bugMessage,
      });
      toast.success(res.data.message || "Bug report submitted!");
      setBugTitle("");
      setBugSteps("");
      setBugMessage("");
      setActiveModal(null);
    } catch {
      toast.error("Failed to submit bug report.");
    } finally {
      setSubmittingBug(false);
    }
  };

  const cards = [
    { id: "faq", title: "FAQ", desc: "Frequently asked questions about Adyapan AI", icon: HelpCircle, color: "text-blue-500", onClick: () => setActiveModal("faq") },
    { id: "support", title: "Contact Support", desc: "Get help from our support team", icon: Mail, color: "text-emerald-500", onClick: () => setActiveModal("support") },
    { id: "bug", title: "Report Bug", desc: "Report issues or unexpected behavior", icon: AlertTriangle, color: "text-rose-500", onClick: () => setActiveModal("bug") },
    { id: "docs", title: "Documentation", desc: "Explore guides and tutorials", icon: FileText, color: "text-purple-500", onClick: () => setActiveModal("docs") },
    { id: "community", title: "Community", desc: "Join the Adyapan developer community", icon: Users, color: "text-cyan-500", onClick: () => router.push("/dashboard/user?view=community-browse") },
    { id: "about", title: "About Adyapan AI", desc: "Version 2.0.0 · Made with love", icon: Info, color: "text-amber-500", onClick: () => setActiveModal("about") },
  ];

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.primary }}>
          <HelpCircle size={16} /> Help & Support
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.title}
                onClick={item.onClick}
                className="p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all"
                style={{ borderColor: c.border, background: c.cardBgHover }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <Icon size={16} className={item.color} />
                </div>
                <div>
                  <span className="text-xs font-bold block">{item.title}</span>
                  <span className="text-[10px] leading-relaxed" style={{ color: c.textMuted }}>{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal Popups ── */}
        {activeModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
              className="relative w-full max-w-xl rounded-2xl border p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl"
              style={{ background: isDark ? "#0c0d16" : "#ffffff", borderColor: c.border, color: c.text }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-amber-500" />
                  <h3 className="text-base font-extrabold capitalize" style={{ color: c.text }}>
                    {activeModal === "faq" && "Frequently Asked Questions"}
                    {activeModal === "support" && "Contact Support Team"}
                    {activeModal === "bug" && "Report a Bug"}
                    {activeModal === "docs" && "Documentation & Guides"}
                    {activeModal === "about" && "About Adyapan AI"}
                  </h3>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer">
                  <X size={16} style={{ color: c.textMuted }} />
                </button>
              </div>

              {/* FAQ Modal Content */}
              {activeModal === "faq" && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
                    <input type="text" value={faqQuery} onChange={(e) => setFaqQuery(e.target.value)}
                      placeholder="Search FAQs..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                  </div>
                  <div className="space-y-2">
                    {filteredFaqs.map((faq, index) => {
                      const isOpen = expandedFaq === index;
                      return (
                        <div key={index} className="rounded-xl border overflow-hidden" style={{ borderColor: c.border }}>
                          <button onClick={() => setExpandedFaq(isOpen ? null : index)}
                            className="w-full flex items-center justify-between p-3 text-xs font-bold text-left transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                            style={{ color: c.text }}>
                            <span>{faq.q}</span>
                            <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180 text-amber-500" : ""}`} />
                          </button>
                          {isOpen && (
                            <div className="p-3 text-[11px] border-t leading-relaxed" style={{ borderColor: c.border, color: c.textMuted, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Support Ticket Modal Content */}
              {activeModal === "support" && (
                <form onSubmit={handleSubmitSupport} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Subject</label>
                    <input type="text" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder="Brief summary of your issue..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Category</label>
                    <select value={supportCategory} onChange={(e) => setSupportCategory(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>
                      <option value="General Inquiry" style={{ background: isDark ? "#0c0d16" : "#ffffff", color: c.text }}>General Inquiry</option>
                      <option value="Technical Issue" style={{ background: isDark ? "#0c0d16" : "#ffffff", color: c.text }}>Technical Issue</option>
                      <option value="Billing & Subscription" style={{ background: isDark ? "#0c0d16" : "#ffffff", color: c.text }}>Billing & Subscription</option>
                      <option value="Feature Request" style={{ background: isDark ? "#0c0d16" : "#ffffff", color: c.text }}>Feature Request</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Message</label>
                    <textarea rows={4} value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe your issue in detail..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none resize-none"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }} required />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <PremiumButton variant="secondary" onClick={() => setActiveModal(null)} type="button">Cancel</PremiumButton>
                    <button type="submit" disabled={submittingSupport}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold disabled:opacity-60 cursor-pointer">
                      {submittingSupport ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                      Submit Ticket
                    </button>
                  </div>
                </form>
              )}

              {/* Bug Report Modal Content */}
              {activeModal === "bug" && (
                <form onSubmit={handleSubmitBug} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Bug Title</label>
                    <input type="text" value={bugTitle} onChange={(e) => setBugTitle(e.target.value)}
                      placeholder="What went wrong?"
                      className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Severity</label>
                    <select value={bugSeverity} onChange={(e) => setBugSeverity(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>
                      <option value="Low" style={{ background: isDark ? "#0c0d16" : "#ffffff", color: c.text }}>Low - Minor UI issue</option>
                      <option value="Medium" style={{ background: isDark ? "#0c0d16" : "#ffffff", color: c.text }}>Medium - Feature malfunctioning</option>
                      <option value="High" style={{ background: isDark ? "#0c0d16" : "#ffffff", color: c.text }}>High - Unable to complete task</option>
                      <option value="Critical" style={{ background: isDark ? "#0c0d16" : "#ffffff", color: c.text }}>Critical - System crash or data issue</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Steps to Reproduce (Optional)</label>
                    <input type="text" value={bugSteps} onChange={(e) => setBugSteps(e.target.value)}
                      placeholder="e.g., Clicked upload photo -> Network error"
                      className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Description</label>
                    <textarea rows={3} value={bugMessage} onChange={(e) => setBugMessage(e.target.value)}
                      placeholder="Explain what happened vs what you expected..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none resize-none"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }} required />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <PremiumButton variant="secondary" onClick={() => setActiveModal(null)} type="button">Cancel</PremiumButton>
                    <button type="submit" disabled={submittingBug}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-bold disabled:opacity-60 cursor-pointer">
                      {submittingBug ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                      Report Bug
                    </button>
                  </div>
                </form>
              )}

              {/* Documentation Content */}
              {activeModal === "docs" && (
                <div className="space-y-4 text-xs leading-relaxed" style={{ color: c.textSec }}>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold">
                    🚀 Adyapan AI Quick Start Guide
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-sm" style={{ color: c.text }}>Core Modules & Hubs</h4>
                    <ul className="list-disc list-inside space-y-1 text-[11px]" style={{ color: c.textMuted }}>
                      <li><strong style={{ color: c.text }}>Ady Chat:</strong> Interactive AI assistant for custom queries and instant tutoring.</li>
                      <li><strong style={{ color: c.text }}>Coding Hub:</strong> Practice DSA problems, generate solutions, and build GitHub portfolios.</li>
                      <li><strong style={{ color: c.text }}>Interview Hub:</strong> Practice HR and Technical mock interviews with AI evaluation.</li>
                      <li><strong style={{ color: c.text }}>Resume Hub:</strong> Build ATS-optimized resumes and generate cover letters.</li>
                      <li><strong style={{ color: c.text }}>Placement Hub:</strong> Practice company MCQs and aptitude tests.</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5 border-t pt-3" style={{ borderColor: c.border }}>
                    <h4 className="font-extrabold text-sm" style={{ color: c.text }}>Keyboard Shortcuts</h4>
                    <div className="flex justify-between items-center text-[11px] py-1 border-b" style={{ borderColor: c.border }}>
                      <span>Quick Search Tool</span>
                      <kbd className="px-2 py-0.5 rounded text-[10px] font-mono border" style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>Ctrl + K</kbd>
                    </div>
                    <div className="flex justify-between items-center text-[11px] py-1 border-b" style={{ borderColor: c.border }}>
                      <span>Close Modals / Overlays</span>
                      <kbd className="px-2 py-0.5 rounded text-[10px] font-mono border" style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>Esc</kbd>
                    </div>
                  </div>
                </div>
              )}

              {/* About Modal Content */}
              {activeModal === "about" && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto font-black text-xl">
                    A
                  </div>
                  <div>
                    <h4 className="text-lg font-extrabold" style={{ color: c.text }}>Adyapan AI Platform</h4>
                    <span className="text-xs text-amber-500 font-semibold block">Version 2.0.0 (Enterprise Build)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left border-y py-3" style={{ borderColor: c.border }}>
                    <div className="p-3 rounded-xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                      <span className="text-[10px] block" style={{ color: c.textMuted }}>Engine Status</span>
                      <span className="text-xs font-bold text-emerald-500">● Operational</span>
                    </div>
                    <div className="p-3 rounded-xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                      <span className="text-[10px] block" style={{ color: c.textMuted }}>AI Model Integration</span>
                      <span className="text-xs font-bold text-amber-500">Gemini / Claude / GPT-4</span>
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: c.textMuted }}>
                    Built with love to empower students, job seekers, and developers with next-gen AI learning tools.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}


