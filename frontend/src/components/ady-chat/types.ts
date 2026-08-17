// ─── Shared types for Ady Chat ────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatModel {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  iconKey: "flash" | "pro" | "reasoning" | "vision";
  description: string;
  fast: boolean;
}

export const ADY_MODELS: ChatModel[] = [
  {
    id: "google/gemini-2.5-flash",
    name: "Ady Flash",
    displayName: "Ady Flash",
    provider: "Google",
    iconKey: "flash",
    description: "Fast & efficient",
    fast: true,
  },

  {
    id: "deepseek/deepseek-r1",
    name: "Ady Reasoning",
    displayName: "Ady Reasoning",
    provider: "DeepSeek",
    iconKey: "reasoning",
    description: "Deep reasoning",
    fast: false,
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Ady Vision",
    displayName: "Ady Vision",
    provider: "Anthropic",
    iconKey: "vision",
    description: "Multimodal",
    fast: false,
  },
];

export const SUGGESTION_CARDS = [
  { iconKey: "book",       title: "Study a Topic",       prompt: "Help me study " },
  { iconKey: "notes",      title: "Generate Notes",       prompt: "Generate detailed notes on " },
  { iconKey: "code",       title: "Explain Code",         prompt: "Explain this code: " },
  { iconKey: "resume",     title: "Resume Review",        prompt: "Review and improve my resume: " },
  { iconKey: "target",     title: "Interview Prep",       prompt: "Help me prepare for an interview for " },
  { iconKey: "research",   title: "Research Assistant",   prompt: "Research and summarize: " },
  { iconKey: "clipboard",  title: "Assignment Help",      prompt: "Help me with this assignment: " },
  { iconKey: "slides",     title: "Create PPT Outline",   prompt: "Create a presentation outline for " },
  { iconKey: "quiz",       title: "Generate Quiz",        prompt: "Generate a quiz on " },
  { iconKey: "career",     title: "Career Advice",        prompt: "Give me career advice for " },
];

