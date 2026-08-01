"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserMessage } from "./UserMessage";
import { AIMessage } from "./AIMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { ChatMessage } from "./types";

interface MessageListProps {
  messages: ChatMessage[];
  streamingText: string;
  loading: boolean;
  isDark: boolean;
  userName?: string;
  onRegenerate?: () => void;
  onEditUserMessage?: (text: string) => void;
}

export function MessageList({
  messages,
  streamingText,
  loading,
  isDark,
  userName,
  onRegenerate,
  onEditUserMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6">
      <div className="max-w-3xl mx-auto py-6">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <UserMessage
                key={msg.id || i}
                message={msg}
                index={i}
                isDark={isDark}
                userName={userName}
                onEdit={onEditUserMessage}
              />
            ) : (
              <AIMessage
                key={msg.id || i}
                message={msg}
                index={i}
                isDark={isDark}
                onRegenerate={onRegenerate}
              />

            )
          )}
        </AnimatePresence>

        {/* Streaming / Thinking */}
        <AnimatePresence>
          {loading && !streamingText && (
            <motion.div
              key="thinking"
              className="flex gap-3 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <div className="w-7 flex-shrink-0" />
              <ThinkingIndicator isDark={isDark} />
            </motion.div>
          )}

          {streamingText && (
            <AIMessage
              key="streaming"
              message={{
                id: "streaming",
                sessionId: "",
                role: "assistant",
                content: streamingText,
                createdAt: new Date().toISOString(),
              }}
              index={messages.length}
              isDark={isDark}
              isStreaming
              streamingText={streamingText}
            />
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

