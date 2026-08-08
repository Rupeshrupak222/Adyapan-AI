import type { ReactNode } from "react";
import { AIContent } from "@/components/ai/AIContent";

export function parseMarkdown(text: string, _isDark?: boolean): ReactNode {
  if (!text) return null;
  return <AIContent content={text} />;
}
