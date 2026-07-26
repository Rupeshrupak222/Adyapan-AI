import { env } from "../../config/env";
import { getCachedAIResponse, setCachedAIResponse } from "./aiCache";

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenRouterOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
}

// Gemini model fallback chain — tried in order when one is unavailable
const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

// Groq model fallback chain
const GROQ_MODEL_FALLBACKS_STRONG = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];
const GROQ_MODEL_FALLBACKS_FAST = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
];

// NVIDIA NIM model fallback chain — 5 keys, each with a different model
const NVIDIA_NIM_MODELS = [
  { model: "nvidia/llama-3.3-70b-instruct", label: "Nemotron" },
  { model: "deepseek-ai/deepseek-r1", label: "DeepSeek" },
  { model: "mistralai/mistral-large-2-instruct", label: "Mistral" },
  { model: "moonshotai/kimi-k2", label: "Kimi" },
  { model: "z-ai/glm-5.1", label: "GLM" },
];

// Sequential fallback completion engine: Gemini (multiple models) → Groq (multiple models) → OpenRouter
export async function callAIRobust(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions
): Promise<string> {
  const providers: { name: string; url: string; key: string; model: string }[] = [];

  // 0. Moonshot / Kimi 2.6 API (Direct Kimi Provider if requested or key present)
  const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  const isKimiRequested = (options.model?.toLowerCase() ?? "").includes("kimi");
  if (kimiKey && (isKimiRequested || !env.geminiApiKey)) {
    providers.push({
      name: "Kimi 2.6 (Moonshot)",
      url: "https://api.moonshot.cn/v1/chat/completions",
      key: kimiKey,
      model: "moonshot-v1-32k",
    });
  }

  // 1. Add Google Gemini with fallback models (primary)
  if (env.geminiApiKey) {
    const modelLower = options.model?.toLowerCase() ?? "";
    const requestedModel = modelLower.includes("gemini")
      ? options.model.split("/").pop() || ""
      : "";

    // If a specific Gemini model was requested, try it first then fall back
    const modelsToTry = requestedModel
      ? [requestedModel, ...GEMINI_MODEL_FALLBACKS.filter(m => m !== requestedModel)]
      : [...GEMINI_MODEL_FALLBACKS];

    for (const m of modelsToTry) {
      providers.push({
        name: `Gemini (${m})`,
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        key: env.geminiApiKey,
        model: m,
      });
    }
  }

  // 2. Add Groq with fallback models (secondary)
  if (env.groqApiKey) {
    const modelLower = options.model?.toLowerCase() ?? "";
    const isMiniOrFast = (modelLower.includes("mini") && !modelLower.includes("gemini")) ||
                         (modelLower.includes("fast") && !modelLower.includes("flash")) ||
                         modelLower.includes("cheap");
    const groqChain = isMiniOrFast ? GROQ_MODEL_FALLBACKS_FAST : GROQ_MODEL_FALLBACKS_STRONG;

    for (const m of groqChain) {
      providers.push({
        name: `Groq (${m})`,
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: env.groqApiKey,
        model: m,
      });
    }
  }

  // 3. Add NVIDIA NIM with 5 keys/models (tertiary) — key rotation across Nemotron, DeepSeek, Mistral, Kimi, GLM
  if (env.nvidiaApiKeys && env.nvidiaApiKeys.length > 0) {
    for (let i = 0; i < env.nvidiaApiKeys.length; i++) {
      const key = env.nvidiaApiKeys[i];
      const nvidiaModel = NVIDIA_NIM_MODELS[i % NVIDIA_NIM_MODELS.length];
      providers.push({
        name: `NVIDIA NIM (${nvidiaModel.label})`,
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        key,
        model: nvidiaModel.model,
      });
    }
  }

  // 4. Add OpenRouter if key exists (quaternary) — including moonshotai/kimi-k2.6 when requested
  if (env.openrouterApiKey) {
    providers.push({
      name: "OpenRouter (Kimi 2.6 / GPT)",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: env.openrouterApiKey,
      model: isKimiRequested ? "moonshotai/kimi-k2.6" : (options.model || "openai/gpt-4o-mini"),
    });
  }


  if (providers.length === 0) {
    throw new Error("No AI providers configured. Please check environment keys.");
  }

  const errors: string[] = [];

  const MAX_RETRIES = 2;

  for (const provider of providers) {
    let lastError: string = "";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          console.log(`[AI Engine] Retrying ${provider.name} (attempt ${attempt + 1}/${MAX_RETRIES + 1}) after ${delayMs}ms...`);
          await new Promise(r => setTimeout(r, delayMs));
        }

        const body: Record<string, unknown> = {
          model: provider.model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        };

        if (options.responseFormat?.type === "json_object") {
          // Only Gemini and OpenRouter support response_format; NVIDIA NIM and Groq do not
          const supportsResponseFormat = provider.name.includes("Gemini") || provider.name.includes("OpenRouter");
          if (supportsResponseFormat) {
            body.response_format = { type: "json_object" };
          }
        }

        const controller = new AbortController();
        const fetchTimeoutMs = (options.maxTokens ?? 4096) > 4096 ? 120000 : 60000;
        const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);

        let res: Response;
        try {
          res = await fetch(provider.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${provider.key}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
        clearTimeout(timeoutId);

        const rawText = await res.text();
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch {
          console.error(`[AI Engine] ${provider.name} returned non-JSON (${rawText.length} chars): ${rawText.substring(0, 300)}`);
          throw new Error(`${provider.name} returned non-JSON response.`);
        }

        if (!res.ok || data.error) {
          const errMsg = data.error?.message ?? res.statusText;
          const isRateLimit = res.status === 429;
          const isServerError = res.status >= 500;
          console.error(`[AI Engine] ${provider.name} error (HTTP ${res.status}):`, JSON.stringify(data).substring(0, 500));
          if (isRateLimit || isServerError) {
            throw new Error(`${provider.name} error: ${errMsg}`);
          }
          throw new Error(`${provider.name} error: ${errMsg}`);
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content || content.trim().length === 0) {
          console.error(`[AI Engine] ${provider.name} empty content. Full response keys: ${Object.keys(data)}, choices: ${JSON.stringify(data.choices).substring(0, 500)}`);
          throw new Error(`${provider.name} returned empty completion.`);
        }

        console.log(`[AI Engine] Success with ${provider.name}`);
        return content;
      } catch (e: any) {
        const msg = e.message || String(e);
        const isAbort = e?.name === "AbortError" || msg.includes("abort") || msg.includes("This operation was aborted");
        const isTransient = isAbort || msg.includes("429") || msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("rate") || msg.includes("overloaded") || msg.includes("unavailable");
        lastError = isAbort ? `${provider.name}: Request timed out` : `${provider.name}: ${msg}`;

        if (isTransient && attempt < MAX_RETRIES) {
          console.warn(`[AI Engine] ${provider.name} transient error (attempt ${attempt + 1}): ${msg}`);
          continue;
        }

        console.warn(`[AI Engine] ${provider.name} failed: ${msg} — trying next provider...`);
        break;
      }
    }

    errors.push(lastError);
  }

  throw new Error(`All AI providers failed. Tried ${providers.length} options: ${errors.join(" | ")}`);
}

// Extracts clean JSON string by finding first '{' or '[' and matching to final '}' or ']'
function stripMarkdownJson(text: string): string {
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  
  let startIdx = -1;
  let endIdx = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = text.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = text.lastIndexOf("]");
  }
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return text.substring(startIdx, endIdx + 1);
  }
  
  return text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options: OpenRouterOptions
): Promise<string> {
  const cached = getCachedAIResponse(systemPrompt, userPrompt, options);
  if (cached) return cached;

  const start = Date.now();
  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const response = await callAIRobust(messages, options);
  const duration = Date.now() - start;

  try {
    const { PerformanceMonitor } = require("../../utils/monitoring");
    PerformanceMonitor.record("ai", options.model || "unknown", duration);
  } catch (err) {
    // Ignore monitoring import errors in isolated contexts
  }

  setCachedAIResponse(systemPrompt, userPrompt, options, response);
  return response;
}

export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options: OpenRouterOptions,
  fallback: T
): Promise<T> {
  const modifiedSys = `${systemPrompt}\nYou MUST respond with valid JSON only, no other conversational introduction or explanation.`;
  const cached = getCachedAIResponse(modifiedSys, userPrompt, options);
  if (cached) {
    try {
      const repaired = tryRepairJSON(cached);
      const parsed = JSON.parse(repaired);
      const validated = enforceSchema(parsed, fallback);
      // Reject cached resume profiles that are empty/all-default (only for resume schemas that have name/email/skills)
      const isResumeSchema = fallback !== null && fallback !== undefined && ("name" in (fallback as any) || "email" in (fallback as any));
      const isEmpty = isResumeSchema && !(validated as any).name && !(validated as any).email && ((validated as any).skills?.length ?? 0) === 0;
      if (isEmpty) {
      } else {
        return validated;
      }
    } catch (e) {
      console.warn("[AI Engine] Cache hit but failed to validate, falling back to fresh API call:", (e as Error)?.message);
    }
  }

  const start = Date.now();
  let text = "";
  try {
    const messages: OpenRouterMessage[] = [
      { role: "system", content: modifiedSys },
      { role: "user", content: userPrompt },
    ];
    text = await callAIRobust(messages, options);
    const duration = Date.now() - start;

    try {
      const { PerformanceMonitor } = require("../../utils/monitoring");
      PerformanceMonitor.record("ai", options.model || "unknown", duration);
    } catch (err) {}

    const repaired = tryRepairJSON(text);
    const parsed = JSON.parse(repaired);
    const validated = enforceSchema(parsed, fallback);
    
    setCachedAIResponse(modifiedSys, userPrompt, options, text);
    return validated;
  } catch (error) {
    console.warn(`[AI Engine] Initial JSON generation/parsing failed:`, error);
    try {
        const retryMessages: OpenRouterMessage[] = [
        { role: "system", content: `${modifiedSys}\nIMPORTANT: Your previous output was invalid JSON. Ensure all keys and string values are double-quoted and all trailing commas are removed. Do not include markdown wraps or conversational prose.` },
        { role: "user", content: fallback != null ? `${userPrompt}\n\nStrict instruction: return valid JSON matching this schema: ${JSON.stringify(fallback)}` : userPrompt }
      ];
      const retryText = await callAIRobust(retryMessages, options);
      const repaired = tryRepairJSON(retryText);
      const parsed = JSON.parse(repaired);
      const validated = enforceSchema(parsed, fallback);
      
      setCachedAIResponse(modifiedSys, userPrompt, options, retryText);
      return validated;
    } catch (retryError) {
      console.error(`[AI Engine] Retry JSON generation failed too:`, retryError);
      if (fallback !== undefined) {
        console.warn(`[AI Engine] Returning fallback object for schema safety.`);
        return fallback;
      }
      console.error(`[AI Engine] All AI providers exhausted. Throwing error.`);
      throw new Error("AI extraction failed: all providers are rate-limited or unavailable. Please try again later.");
    }
  }
}

// Helper to repair common JSON malformations from LLMs
function tryRepairJSON(text: string): string {
  let cleaned = text.trim();
  cleaned = stripMarkdownJson(cleaned);
  
  // Clean trailing commas before close characters
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {}

  // Repair unquoted or single quoted keys/values
  let repaired = cleaned
    .replace(/(['"])?(\w+)\1\s*:/g, '"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"');

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {}

  // Balance open/close brackets
  let openBraces = (repaired.match(/\{/g) || []).length;
  let closeBraces = (repaired.match(/\}/g) || []).length;
  let openBrackets = (repaired.match(/\[/g) || []).length;
  let closeBrackets = (repaired.match(/\]/g) || []).length;

  while (openBraces > closeBraces) {
    repaired += "}";
    closeBraces++;
  }
  while (openBrackets > closeBrackets) {
    repaired += "]";
    closeBrackets++;
  }

  try {
    JSON.parse(repaired);
    return repaired;
  } catch {}

  return cleaned;
}

// Ensures parsed object has the identical keys and types as the fallback schema
function enforceSchema<T>(parsed: any, fallback: T): T {
  if (fallback === null || fallback === undefined) {
    return parsed as T;
  }
  
  if (Array.isArray(fallback)) {
    let target = parsed;
    if (!Array.isArray(target) && typeof target === "object" && target !== null) {
      const arrayVal = Object.values(target).find((v) => Array.isArray(v));
      if (arrayVal && Array.isArray(arrayVal)) {
        target = arrayVal;
      }
    }
    if (!Array.isArray(target)) {
      return fallback;
    }
    if (fallback.length > 0) {
      const template = fallback[0];
      return target.map((item: any) => enforceSchema(item, template)) as unknown as T;
    }
    return target as T;
  }
  
  if (typeof fallback === "object") {
    if (typeof parsed !== "object" || parsed === null) {
      return fallback;
    }
    const res: any = { ...fallback };
    for (const key of Object.keys(fallback)) {
      if (key in parsed) {
        res[key] = enforceSchema(parsed[key], (fallback as any)[key]);
      }
    }
    return res as T;
  }
  
  if (typeof parsed !== typeof fallback) {
    return fallback;
  }
  
  return parsed as T;
}

// Default model presets for different task categories
// Each module is mapped to its optimal NVIDIA model
export const MODELS = {
  FAST: "deepseek-ai/deepseek-v4-flash",       // Study Assistant, Notes, Assignment, ATS fast, Proctoring
  BALANCED: "z-ai/glm-5.2",                    // Resume Builder, Interview, Coding Assistant, LinkedIn, DSA
  POWERFUL: "moonshotai/kimi-k2.6",             // Research Paper, Code Generation, PPT, Enhanced MindMap/Quiz
  CODE: "deepseek-ai/deepseek-v4-flash",        // Code Gen, Debug, Explain, AI Coding Analysis
  CHEAP: "deepseek-ai/deepseek-v4-flash",       // Cheapest option
  SUMMARIZATION: "mistralai/mistral-medium-3.5-128b", // Research Summarization, writing
  CHAT: "z-ai/glm-5.2",                        // AI Chat default
  EMBEDDING: "nvidia/nemotron-3-embed-1b",      // RAG/Search embeddings
} as const;

//Centralized Multi-LLM Orchestration Layer
export const ORCHESTRATED_MODELS = {
  career_coaching: "nvidia/llama-3.3-70b-instruct",
  career_insights: "nvidia/llama-3.3-70b-instruct",
  roadmap_reasoning: "nvidia/llama-3.3-70b-instruct",
  technical_readiness: "deepseek-ai/deepseek-r1",
  coding_analysis: "deepseek-ai/deepseek-r1",
  project_evaluation: "deepseek-ai/deepseek-r1",
  document_understanding: "moonshotai/kimi-k2",
  resume_context: "moonshotai/kimi-k2",
  job_descriptions: "moonshotai/kimi-k2",
  fast_summaries: "mistralai/mistral-large-2-instruct",
  ui_responses: "mistralai/mistral-large-2-instruct",
  quick_recommendations: "mistralai/mistral-large-2-instruct",
  general_assistant: "z-ai/glm-5.1",
  fallback: "z-ai/glm-5.1",
  hr_behavioral: "nvidia/llama-3.3-70b-instruct",
  hr_star_analysis: "nvidia/llama-3.3-70b-instruct",
  hr_communication: "deepseek-ai/deepseek-r1",
  hr_resume_analysis: "moonshotai/kimi-k2",
  hr_followup: "mistralai/mistral-large-2-instruct",
  hr_evaluation: "nvidia/llama-3.3-70b-instruct",
  hr_fallback: "z-ai/glm-5.1",
} as const;

export type OrchestratedTaskType = keyof typeof ORCHESTRATED_MODELS;

export async function callOrchestratedAI(
  taskType: OrchestratedTaskType,
  messages: OpenRouterMessage[],
  options?: Omit<OpenRouterOptions, "model">
): Promise<string> {
  const model = ORCHESTRATED_MODELS[taskType] || ORCHESTRATED_MODELS.fallback;
  return callAIRobust(messages, { ...options, model });
}

export async function generateOrchestratedText(
  taskType: OrchestratedTaskType,
  systemPrompt: string,
  userPrompt: string,
  options?: Omit<OpenRouterOptions, "model">
): Promise<string> {
  const model = ORCHESTRATED_MODELS[taskType] || ORCHESTRATED_MODELS.fallback;
  return generateText(systemPrompt, userPrompt, { ...options, model });
}

export async function generateOrchestratedJSON<T>(
  taskType: OrchestratedTaskType,
  systemPrompt: string,
  userPrompt: string,
  options: Omit<OpenRouterOptions, "model">,
  fallback: T
): Promise<T> {
  const model = ORCHESTRATED_MODELS[taskType] || ORCHESTRATED_MODELS.fallback;
  return generateJSON(systemPrompt, userPrompt, { ...options, model }, fallback);
}


// Available models for Ady Chat
export const CHAT_MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", cheap: true },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", cheap: false },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", cheap: false },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", cheap: true },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", cheap: true },
  { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", cheap: false },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek", cheap: true },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", cheap: true },
  { id: "meta-llama/llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta", cheap: true },
  { id: "mistralai/mistral-large", name: "Mistral Large", provider: "Mistral", cheap: false },
  { id: "deepseek-ai/deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "NVIDIA", cheap: true },
  { id: "z-ai/glm-5.2", name: "GLM 5.2", provider: "NVIDIA", cheap: true },
  { id: "moonshotai/kimi-k2.6", name: "Kimi K2.6", provider: "NVIDIA", cheap: true },
  { id: "mistralai/mistral-medium-3.5-128b", name: "Mistral Medium 3.5 128B", provider: "NVIDIA", cheap: true },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];
