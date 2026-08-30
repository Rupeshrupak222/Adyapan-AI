import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import {
  Menu, Sun, Moon, RefreshCw, Plus, Zap, Loader2, Search, Bell, LogOut, User,
} from "lucide-react";

interface AdminHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: string;
  toggleTheme: () => void;
  onRefresh: () => void;
  onAddJob?: () => void;
  onIngestJobs?: () => void;
  onOpenNotifications?: () => void;
  ingestLoading?: boolean;
}

export function AdminHeader({
  sidebarOpen, setSidebarOpen, theme, toggleTheme,
  onRefresh, onAddJob, onIngestJobs, onOpenNotifications, ingestLoading
}: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isDark = theme === "dark";
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    api.get("/admin/notifications?limit=1")
      .then((res) => {
        if (mounted && res.data?.success && res.data?.stats) {
          setUnreadCount(res.data.stats.activeBroadcasts || 0);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [onRefresh]);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: 70,
      background: isDark ? "rgba(6,11,14,0.92)" : "rgba(255,255,255,0.92)",
      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 1.5rem", zIndex: 105, backdropFilter: "blur(16px)",
    }}>
      <div className="flex items-center gap-3">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mobile-menu-btn"
          style={{
            display: "none", background: "transparent", border: "none",
            cursor: "pointer", padding: 4, color: "var(--text-secondary)",
          }}>
          <Menu size={20} />
        </motion.button>
        <div className="flex items-center gap-2.5">
          <Image src="/assets/logo.png" alt="Adyapan AI" width={237} height={208} style={{ width: 32, height: 32 }} className="rounded-full" />
          <div>
            <span className="font-extrabold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>Adyapan AI</span>
            <span className="text-[10px] font-bold text-amber-500 block -mt-1 tracking-wider uppercase">Admin Console</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={onAddJob}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
          style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
          <Plus size={14} /> Add Job
        </motion.button>

        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={onIngestJobs} disabled={ingestLoading}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
          style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
          {ingestLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          Ingest Jobs
        </motion.button>

        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2 rounded-full border flex items-center justify-center transition-all"
          style={{ background: isDark ? "#0d151c" : "#f1f5f9", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: isDark ? "#f59e0b" : "#475569" }}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </motion.button>

        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          className="p-2 rounded-full border flex items-center justify-center transition-all"
          style={{ background: isDark ? "#0d151c" : "#f1f5f9", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: "var(--text-secondary)" }}>
          <RefreshCw size={16} />
        </motion.button>

        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onOpenNotifications}
          title="Notifications & Broadcasts"
          className="p-2 rounded-full border flex items-center justify-center transition-all relative cursor-pointer"
          style={{ background: isDark ? "#0d151c" : "#f1f5f9", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: "var(--text-secondary)" }}>
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-black flex items-center justify-center shadow-md">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </motion.button>

        <div className="relative">
          <motion.div
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 border-l cursor-pointer"
            style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
              {user?.name?.[0] || "A"}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{user?.name || "Admin"}</div>
              <div className="text-[10px] text-amber-500 font-semibold leading-tight">Super Admin</div>
            </div>
          </motion.div>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border p-2 shadow-2xl z-50"
                style={{
                  background: isDark ? "#0c131a" : "#ffffff",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                }}>
                <button onClick={() => { router.push("/profile/admin"); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/5"
                  style={{ color: "var(--text-primary)" }}>
                  <User size={14} /> Profile
                </button>
                <button onClick={() => { logout(); router.push("/login"); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 transition-all hover:bg-red-500/10">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
