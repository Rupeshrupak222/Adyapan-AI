"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, ArrowLeft, Search, Trash2, MoreVertical, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { getDiceBearUrl } from "@/lib/avatar";
import { useTheme } from "@/hooks/useTheme";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { AnimatedSkeleton, EmptyState } from "@/components/ui/PremiumComponents";

const CARD = (isDark: boolean) => ({
  background: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.85)",
  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
  backdropFilter: "blur(20px)" as const,
});

export function CommunityMessagesView({ openChatWith }: { openChatWith?: string | null }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<string | null>(openChatWith || null);
  const [chatName, setChatName] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get("/community/conversations");
      if (res.data.success) setConversations(res.data.conversations);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!openChatWith) return;
    setActiveChat(openChatWith);
    loadChat(openChatWith);
  }, [openChatWith]);

  const loadChat = async (userId: string) => {
    setChatLoading(true);
    try {
      const [msgRes, userRes] = await Promise.all([
        api.get(`/community/messages/${userId}`),
        api.get(`/community/users/${userId}`),
      ]);
      if (msgRes.data.success) setMessages(msgRes.data.messages);
      if (userRes.data.success) setChatName(userRes.data.profile.user?.name || "Unknown");
    } catch { toast.error("Failed to load chat"); }
    finally { setChatLoading(false); }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!userSearch.trim() || userSearch.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/community/users?q=${encodeURIComponent(userSearch)}&limit=10`);
        if (res.data.success) setSearchResults(res.data.users);
      } catch { /* */ }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [userSearch]);

  const sendMessage = async () => {
    if (!msgInput.trim() || !activeChat) return;
    setSending(true);
    try {
      const res = await api.post("/community/messages", { receiverId: activeChat, content: msgInput.trim() });
      if (res.data.success) {
        setMessages(prev => [...prev, res.data.message]);
        setMsgInput("");
        fetchConversations();
      }
    } catch { toast.error("Failed to send message"); }
    finally { setSending(false); }
  };

  const deleteConversation = async (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.delete(`/community/conversations/${userId}`);
      if (res.data.success) {
        setConversations(prev => prev.filter(c => c.userId !== userId));
        if (activeChat === userId) {
          setActiveChat(null);
          setMessages([]);
        }
        toast.success("Conversation deleted");
      }
    } catch {
      toast.error("Failed to delete conversation");
    } finally {
      setConfirmDeleteUser(null);
    }
  };

  const deleteSingleMessage = async (messageId: string) => {
    try {
      const res = await api.delete(`/community/messages/single/${messageId}`);
      if (res.data.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success("Message deleted");
        fetchConversations();
      }
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const openNewChat = (userId: string, name: string) => {
    setActiveChat(userId);
    setChatName(name);
    setMessages([]);
    setUserSearch("");
    setSearchResults([]);
    loadChat(userId);
  };

  const pc = CARD(isDark);
  const txt = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.5)";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  // Active Chat view
  if (activeChat) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-120px)]">
        {/* Active Chat Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b" style={{ borderColor: border }}>
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveChat(null); setMessages([]); fetchConversations(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-500/10" 
              style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
              <ArrowLeft size={14} style={{ color: muted }} />
            </button>
            <img src={getDiceBearUrl(chatName)} alt="" width={32} height={32} className="rounded-lg" />
            <div>
              <span className={`text-sm font-extrabold block ${txt}`}>{chatName}</span>
              <span className="text-[9px] text-slate-400">Direct Message</span>
            </div>
          </div>

          {/* Delete Conversation Button in Header */}
          <button 
            onClick={() => setConfirmDeleteUser(activeChat)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
            title="Delete this entire conversation">
            <Trash2 size={13} />
            <span>Delete Chat</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-1 no-scrollbar" style={{ maxHeight: "calc(100vh - 260px)" }}>
          {chatLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <AnimatedSkeleton key={i} type="card" className="h-12 rounded-xl" />)}</div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState title="No messages yet" description="Send a message to start the conversation!" illustration={<MessageSquare className="w-6 h-6 text-amber-500" />} />
            </div>
          ) : (
            messages.map((m: any, i: number) => {
              const isMe = m.senderId !== activeChat;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"} group relative`}>
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed relative ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}
                    style={{
                      background: isMe ? "linear-gradient(135deg, #f59e0b, #d97706)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                      color: isMe ? "#000" : (isDark ? "#f8fafc" : "#1e293b"),
                      border: isMe ? "none" : `1px solid ${border}`,
                    }}>
                    {stripMarkdown(m.content)}
                    <div className="flex items-center justify-between gap-3 text-[9px] mt-1 opacity-70">
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <button 
                        onClick={() => deleteSingleMessage(m.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 ml-2"
                        title="Delete message">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="flex gap-2">
          <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-xl text-xs font-bold outline-none"
            style={{ ...pc, color: isDark ? "#fff" : "#0f172a" }} />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={sendMessage} disabled={sending || !msgInput.trim()}
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 shadow-lg"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)" }}>
            <Send size={14} className="text-white" />
          </motion.button>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmDeleteUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="max-w-sm w-full p-5 rounded-2xl space-y-4" style={pc}>
                <div className="flex items-center gap-3 text-red-500">
                  <AlertTriangle size={22} />
                  <h3 className={`text-base font-extrabold ${txt}`}>Delete Conversation?</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to delete this chat history? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setConfirmDeleteUser(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800">
                    Cancel
                  </button>
                  <button onClick={() => deleteConversation(confirmDeleteUser)} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow">
                    Delete Chat
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Conversation List view
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 min-h-screen">
      <div>
        <h1 className={`text-xl font-extrabold ${txt}`}>Messages</h1>
        <p className="text-xs mt-0.5" style={{ color: muted }}>Chat with community members</p>
      </div>

      {/* New Chat Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: muted }} />
        <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users to start a new chat..."
          className="w-full pl-9 pr-4 py-3 rounded-xl text-xs font-bold outline-none" style={{ ...pc, color: isDark ? "#fff" : "#0f172a" }} />
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-full left-0 right-0 mt-1 rounded-xl z-50 max-h-60 overflow-y-auto" style={pc}>
              {searchResults.map((u: any) => (
                <button key={u.userId} onClick={() => openNewChat(u.userId, u.user?.name || "Unknown")}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors">
                  <img src={getDiceBearUrl(u.user?.name || "")} alt="" width={28} height={28} className="rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <span className={`text-[11px] font-bold block ${txt}`}>{u.user?.name || "Unknown"}</span>
                    {u.college && <span className="text-[9px]" style={{ color: muted }}>{u.college}</span>}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <AnimatedSkeleton key={i} type="card" className="h-16 rounded-xl" />)}</div>
      ) : conversations.length === 0 ? (
        <EmptyState title="No conversations yet" description="Search for users above to start chatting!" illustration={<MessageSquare className="w-8 h-8 text-amber-500" />} />
      ) : (
        <div className="space-y-2">
          {conversations.map((c: any) => (
            <motion.div key={c.userId} whileHover={{ scale: 1.005, y: -1 }}
              className="flex items-center justify-between w-full p-4 rounded-xl transition-colors cursor-pointer group"
              onClick={() => openNewChat(c.userId, c.name)}
              style={{ ...pc, background: c.unread > 0 ? (isDark ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.03)") : pc.background }}>
              
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <img src={getDiceBearUrl(c.name)} alt="" width={40} height={40} className="rounded-xl" />
                  {c.unread > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ background: "#f59e0b" }}>{c.unread}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between pr-2">
                    <span className={`text-xs font-extrabold ${txt}`}>{c.name}</span>
                    <span className="text-[9px]" style={{ color: muted }}>{new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: muted }}>
                    {c.lastMessage.senderId === c.userId ? "" : "You: "}{stripMarkdown(c.lastMessage.content).slice(0, 60)}
                  </p>
                </div>
              </div>

              {/* Delete Chat Button on Conversation Card */}
              <button 
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteUser(c.userId); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 ml-2"
                title="Delete Chat">
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="max-w-sm w-full p-5 rounded-2xl space-y-4" style={pc}>
              <div className="flex items-center gap-3 text-red-500">
                <AlertTriangle size={22} />
                <h3 className={`text-base font-extrabold ${txt}`}>Delete Conversation?</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to delete this conversation? All chat messages with this user will be removed.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setConfirmDeleteUser(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800">
                  Cancel
                </button>
                <button onClick={() => deleteConversation(confirmDeleteUser)} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow">
                  Delete Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
