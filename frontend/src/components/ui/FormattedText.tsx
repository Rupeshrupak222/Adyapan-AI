"use client";

import React from "react";
import { AIContent } from "@/components/ai/AIContent";

interface FormattedTextProps {
  content: string;
  className?: string;
  accentColor?: string;
}

export function cleanMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, (match) => {
      const lines = match.split("\n");
      return lines.slice(1, -1).join(" ");
    })
    .replace(/`/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Central renderer for AI-generated Markdown + KaTeX Math formulas across the platform
 */
export function FormattedText({ content, className = "" }: FormattedTextProps) {
  if (!content) return null;
  return <AIContent content={content} className={className} />;
}

