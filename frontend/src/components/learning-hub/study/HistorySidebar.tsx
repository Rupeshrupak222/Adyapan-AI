"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  History, X, Search, FileText, ChevronRight, GraduationCap, Trash2
} from "lucide-react";
import { mkColors } from "@/utils/themeColors";
import type { UnifiedLesson } from "../StudyAssistantView";

type DocumentItem = { name: string; date: string; pages: number; topics: number; analysis: Record<string, unknown> };
type TopicItem = { topic: string; date: string; duration: string; level: string; lesson: UnifiedLesson };

type Props = {
  c: ReturnType<typeof mkColors>;
  type: "document" | "topic";
  show: boolean;
  onClose: () => void;
  history: DocumentItem[];
  topicHistory: TopicItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLoadDocument: (item: DocumentItem) => void;
  onLoadTopic: (item: TopicItem) => void;
  onDeleteDocument?: (name: string) => void;
  onDeleteTopic?: (index: number) => void;
};

export function HistorySidebar({ c, type, show, onClose, history, topicHistory, searchQuery, onSearchChange, onLoadDocument, onLoadTopic, onDeleteDocument, onDeleteTopic }: Props) {
  if (!show) return null;

  const isDocument = type === "document";
  const items = isDocument ? history : topicHistory;
  const count = isDocument ? history.length : topicHistory.length;

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed", top: "70px", left: 0, right: 0, bottom: 0, zIndex: 98,
            background: "rgba(0,0,0,0.4)",
          }}
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          style={{
            position: "fixed", top: "70px", right: 0, bottom: 0, zIndex: 99,
            width: "min(420px, 90vw)",
            background: c.isDark ? "rgba(18, 17, 26, 0.95)" : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            borderLeft: `1px solid ${c.border}`,
            display: "flex", flexDirection: "column",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: `1px solid ${c.divider}`,
            background: c.surface,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <History size={16} style={{ color: c.amber }} />
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: c.text }}>
                {isDocument ? "Recent Documents" : "Topic History"}
              </span>
              <span style={{
                fontSize: "0.7rem", fontWeight: 600, color: c.amber,
                background: c.amberBg, padding: "1px 7px", borderRadius: 999,
              }}>
                {count}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: c.textMuted, padding: 4 }}
            >
              <X size={18} />
            </motion.button>
          </div>

          {isDocument && (
            <div style={{ padding: "0.75rem 1.25rem" }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: c.textMuted }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search history..."
                  style={{
                    width: "100%", padding: "0.55rem 0.75rem 0.55rem 2rem",
                    borderRadius: 10, fontSize: "0.8rem", outline: "none",
                    background: c.pill, border: `1px solid ${c.border}`,
                    color: c.text, boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: isDocument ? "0 0.75rem 1rem" : "1rem 0.75rem" }}>
            {count === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: 8 }}>
                {isDocument ? (
                  <FileText size={32} style={{ color: c.textMuted, opacity: 0.3 }} />
                ) : (
                  <History size={32} style={{ color: c.textMuted, opacity: 0.3 }} />
                )}
                <p style={{ fontSize: "0.82rem", color: c.textMuted, textAlign: "center" }}>
                  {isDocument ? "No documents analyzed yet. Upload a study file to get started." : "No topics studied yet. Generate a lesson to get started."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {isDocument ? (
                  history.map((doc, i) => (
                    <motion.div
                      key={doc.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => onLoadDocument(doc)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.65rem 0.75rem", borderRadius: 12, cursor: "pointer",
                        background: c.cardBg, border: `1px solid ${c.border}`,
                      }}
                      whileHover={{ borderColor: c.amberBorder, background: c.amberBg }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                          <FileText size={13} style={{ color: c.amber }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: c.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.name}
                          </p>
                          <p style={{ fontSize: "0.7rem", color: c.textMuted, margin: 0 }}>
                            {doc.date} · {doc.pages} pages · {doc.topics} topics
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {onDeleteDocument && (
                          <motion.button
                            whileHover={{ scale: 1.15, color: "#ef4444" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument(doc.name);
                            }}
                            title="Delete from history"
                            style={{
                              background: "transparent", border: "none", color: c.textMuted,
                              padding: "4px 6px", borderRadius: 6, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        )}
                        <ChevronRight size={14} style={{ color: c.textMuted }} />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  topicHistory.map((item, i) => (
                    <motion.div
                      key={`${item.topic}-${i}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => onLoadTopic(item)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.65rem 0.75rem", borderRadius: 12, cursor: "pointer",
                        background: c.cardBg, border: `1px solid ${c.border}`,
                      }}
                      whileHover={{ borderColor: c.amberBorder, background: c.amberBg }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                          <GraduationCap size={13} style={{ color: c.amber, margin: "auto" }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: c.text, margin: 0 }} className="truncate">{item.topic}</p>
                          <p style={{ fontSize: "0.68rem", color: c.textMuted, margin: "2px 0 0" }}>{item.date} · {item.duration} · {item.level}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {onDeleteTopic && (
                          <motion.button
                            whileHover={{ scale: 1.15, color: "#ef4444" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTopic(i);
                            }}
                            title="Delete from history"
                            style={{
                              background: "transparent", border: "none", color: c.textMuted,
                              padding: "4px 6px", borderRadius: 6, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        )}
                        <ChevronRight size={14} style={{ color: c.textMuted }} />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
