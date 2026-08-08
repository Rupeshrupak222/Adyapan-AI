"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { CodeBlock } from "./CodeBlock";

interface AIContentProps {
  content: string;
  className?: string;
}

/**
 * Normalizes common AI math formatting inconsistencies:
 * - Converts \[...\] to $$...$$
 * - Converts \(...\) to $...$
 */
export function normalizeMathFormat(content: string): string {
  if (!content) return "";
  let text = content;

  // Convert display math \[ ... \] to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);

  // Convert inline math \( ... \) to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  return text;
}

export function AIContent({ content, className = "" }: AIContentProps) {
  const normalized = normalizeMathFormat(content);

  return (
    <div className={`ai-content-renderer space-y-3 leading-relaxed text-sm ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (!inline && (match || codeString.includes("\n"))) {
              return (
                <CodeBlock
                  language={match ? match[1] : "text"}
                  value={codeString}
                />
              );
            }
            return (
              <code
                className="bg-amber-500/10 text-amber-400 dark:bg-amber-400/10 dark:text-amber-300 font-mono text-xs px-1.5 py-0.5 rounded border border-amber-500/20"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-2 leading-relaxed text-slate-700 dark:text-gray-200">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mt-4 mb-2 text-slate-900 dark:text-white border-b pb-1 border-slate-200 dark:border-gray-800">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold mt-3 mb-2 text-slate-900 dark:text-white">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mt-3 mb-1 text-slate-800 dark:text-gray-100">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-1 my-2 text-slate-700 dark:text-gray-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-1 my-2 text-slate-700 dark:text-gray-300">{children}</ol>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-amber-500 pl-4 py-1 italic my-2 bg-amber-500/5 rounded-r text-slate-600 dark:text-gray-400">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-gray-800">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800 text-xs text-left">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return <th className="px-3 py-2 bg-slate-100 dark:bg-white/5 font-semibold text-slate-800 dark:text-gray-200">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 border-t border-slate-100 dark:border-gray-800/60 text-slate-700 dark:text-gray-300">{children}</td>;
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

export default AIContent;
