"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, X, AlertTriangle, Trash2, LogOut, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";

// ─── Shared modal primitives ─────────────────────────────────────────────
function ModalFrame({
  open, onClose, c, isDark, borderColor, children,
}: {
  open: boolean;
  onClose: () => void;
  c: Record<string, string>;
  isDark: boolean;
  borderColor?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rounded-2xl border p-6 space-y-4 w-full max-w-md"
            style={{ background: isDark ? "#0c0d16" : "#ffffff", borderColor: borderColor || c.border }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Change Password Modal ───────────────────────────────────────────────
export function ChangePasswordModal({
  open, onClose, c, isDark,
}: {
  open: boolean;
  onClose: () => void;
  c: Record<string, string>;
  isDark: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword) { toast.error("Fill in all password fields."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      await api.post("/settings/change-password", { currentPassword, newPassword });
      toast.success("Password changed successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to change password.");
    } finally { setSaving(false); }
  };

  return (
    <ModalFrame open={open} onClose={onClose} c={c} isDark={isDark}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.text }}>
          <Key size={16} className="text-amber-500" /> Change Password
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
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
          <input
            type={showPw ? "text" : "password"}
            value={field.value}
            onChange={(e) => field.setter(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-amber-500/40 transition-all"
            style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
          />
        </div>
      ))}
      <button onClick={() => setShowPw(!showPw)} className="flex items-center gap-1.5 text-[10px]" style={{ color: c.textMuted }}>
        {showPw ? <EyeOff size={11} /> : <Eye size={11} />}
        {showPw ? "Hide" : "Show"} passwords
      </button>
      <div className="flex gap-2.5 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all"
          style={{ borderColor: c.border, color: c.textSec }}
        >Cancel</button>
        <motion.button
          onClick={handleSubmit}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
          Change Password
        </motion.button>
      </div>
    </ModalFrame>
  );
}

// ─── Delete Account Modal ────────────────────────────────────────────────
export function DeleteAccountModal({
  open, onClose, c, isDark,
}: {
  open: boolean;
  onClose: () => void;
  c: Record<string, string>;
  isDark: boolean;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (!password) { toast.error("Enter your password to confirm."); return; }
    setSaving(true);
    try {
      await api.delete("/settings/account", { data: { password } });
      toast.success("Account deleted. Redirecting...");
      setTimeout(() => { window.location.href = "/"; }, 1500);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete account.");
    } finally { setSaving(false); }
  };

  return (
    <ModalFrame open={open} onClose={onClose} c={c} isDark={isDark} borderColor="rgba(239,68,68,0.3)">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2 text-red-500">
          <AlertTriangle size={16} /> Delete Account
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password to confirm..."
          className="w-full rounded-xl px-4 py-2.5 text-xs border outline-none focus:border-red-500/40 transition-all"
          style={{ background: c.inputBg, borderColor: "rgba(239,68,68,0.3)", color: c.text }}
        />
      </div>
      <div className="flex gap-2.5 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all"
          style={{ borderColor: c.border, color: c.textSec }}
        >Cancel</button>
        <motion.button
          onClick={handleDelete}
          disabled={saving || !password}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          Delete Forever
        </motion.button>
      </div>
    </ModalFrame>
  );
}

// ─── Delete Chat History Modal ───────────────────────────────────────────
export function DeleteChatHistoryModal({
  open, onClose, c, isDark,
}: {
  open: boolean;
  onClose: () => void;
  c: Record<string, string>;
  isDark: boolean;
}) {
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await api.delete("/settings/chat-history");
      toast.success(`${res.data?.deletedSessions || 0} chat sessions deleted!`);
      onClose();
    } catch { toast.error("Failed to delete chat history."); }
    finally { setSaving(false); }
  };

  return (
    <ModalFrame open={open} onClose={onClose} c={c} isDark={isDark} borderColor="rgba(249,115,22,0.3)">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "#f97316" }}>
          <Trash2 size={16} /> Delete Chat History
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
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
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all"
          style={{ borderColor: c.border, color: c.textSec }}
        >Cancel</button>
        <motion.button
          onClick={handleDelete}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          Delete All Chats
        </motion.button>
      </div>
    </ModalFrame>
  );
}

// ─── Logout All Devices Modal ────────────────────────────────────────────
export function LogoutDevicesModal({
  open, onClose, c, isDark,
}: {
  open: boolean;
  onClose: () => void;
  c: Record<string, string>;
  isDark: boolean;
}) {
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    setSaving(true);
    try {
      await api.post("/settings/logout-devices");
      toast.success("All other devices logged out!");
      onClose();
    } catch { toast.error("Failed to logout devices."); }
    finally { setSaving(false); }
  };

  return (
    <ModalFrame open={open} onClose={onClose} c={c} isDark={isDark} borderColor="rgba(239,68,68,0.3)">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2 text-red-500">
          <LogOut size={16} /> Logout All Devices
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5">
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
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all"
          style={{ borderColor: c.border, color: c.textSec }}
        >Cancel</button>
        <motion.button
          onClick={handleLogout}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          Logout All
        </motion.button>
      </div>
    </ModalFrame>
  );
}
