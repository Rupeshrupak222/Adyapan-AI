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

// Gemini model fallback chain — active supported models
const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

// Groq model fallback chain — active official fast models on Groq
const GROQ_MODEL_FALLBACKS_STRONG = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];
const GROQ_MODEL_FALLBACKS_FAST = [
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
];

// NVIDIA NIM model fallback chain
const NVIDIA_NIM_MODELS = [
  { model: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { model: "deepseek-ai/deepseek-r1", label: "DeepSeek R1" },
  { model: "qwen/qwen2.5-72b-instruct", label: "Qwen 2.5 72B" },
];

const FAST_OPENROUTER_DEFAULT = "openai/gpt-4o-mini";

// In-memory circuit breaker to prevent hammering dead/rate-limited providers
const providerCooldownUntil = new Map<string, number>();

// Maps any requested model hint to a valid, fast OpenRouter model id.
function resolveOpenRouterModel(requestedModel?: string): string {
  const lower = (requestedModel ?? "").toLowerCase();
  if (!lower) return FAST_OPENROUTER_DEFAULT;
  if (lower.includes("kimi")) return "moonshotai/kimi-k2";
  if (lower.includes("gemini")) return "google/gemini-2.0-flash-001";
  if (lower.includes("llama")) return "meta-llama/llama-3.3-70b-instruct";
  if (lower.includes("deepseek")) return "deepseek/deepseek-chat";
  if (lower.includes("mistral")) return "mistralai/mistral-small-24b-instruct-2501";
  if (lower.includes("qwen")) return "qwen/qwen-2.5-72b-instruct";
  return FAST_OPENROUTER_DEFAULT;
}

// Sequential fallback completion engine with Circuit Breaker & Instant Failover
export async function callAIRobust(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions
): Promise<string> {
  const providers: { name: string; url: string; key: string; model: string; cooldownKey: string }[] = [];

  // 0. Moonshot / Kimi 2.6 API (Direct Kimi Provider if requested or key present)
  const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  const isKimiRequested = (options.model?.toLowerCase() ?? "").includes("kimi");
  if (kimiKey && (isKimiRequested || !env.geminiApiKey)) {
    providers.push({
      name: "Kimi 2.6 (Moonshot)",
      url: "https://api.moonshot.cn/v1/chat/completions",
      key: kimiKey,
      model: "moonshot-v1-32k",
      cooldownKey: "kimi",
    });
  }

  // 1. Add Google Gemini with latest flash models first (primary)
  if (env.geminiApiKey) {
    const modelLower = options.model?.toLowerCase() ?? "";
    const requestedModel = modelLower.includes("gemini")
      ? options.model.split("/").pop() || ""
      : "";

    const modelsToTry = requestedModel
      ? [requestedModel, ...GEMINI_MODEL_FALLBACKS.filter(m => m !== requestedModel)]
      : [...GEMINI_MODEL_FALLBACKS];

    for (const m of modelsToTry) {
      providers.push({
        name: `Gemini (${m})`,
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        key: env.geminiApiKey,
        model: m,
        cooldownKey: `gemini-${m}`,
      });
    }
  }

  // 2. Add OpenRouter if key exists (secondary) — fast models, high reliability
  if (env.openrouterApiKey) {
    providers.push({
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: env.openrouterApiKey,
      model: isKimiRequested ? "moonshotai/kimi-k2" : resolveOpenRouterModel(options.model),
      cooldownKey: "openrouter",
    });
  }

  // 3. Add Groq with fallback models (tertiary) — ultrafast inference
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
        cooldownKey: `groq-${m}`,
      });
    }
  }

  // 4. Add NVIDIA NIM (fallback) — key rotation across Llama, DeepSeek, Mistral, Qwen
  if (env.nvidiaApiKeys && env.nvidiaApiKeys.length > 0) {
    for (let i = 0; i < env.nvidiaApiKeys.length; i++) {
      const key = env.nvidiaApiKeys[i];
      const nvidiaModel = NVIDIA_NIM_MODELS[i % NVIDIA_NIM_MODELS.length];
      providers.push({
        name: `NVIDIA NIM (${nvidiaModel.label})`,
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        key,
        model: nvidiaModel.model,
        cooldownKey: `nvidia-${i}`,
      });
    }
  }

  if (providers.length === 0) {
    throw new Error("No AI providers configured. Please check environment keys.");
  }

  // Filter out temporarily dead providers (cooldown active)
  const now = Date.now();
  const availableProviders = providers.filter(p => {
    const cooldown = providerCooldownUntil.get(p.cooldownKey) ?? 0;
    return now >= cooldown;
  });

  const providersToRun = availableProviders.length > 0 ? availableProviders : providers;
  const errors: string[] = [];

  for (const provider of providersToRun) {
    try {
      const body: Record<string, unknown> = {
        model: provider.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ? Math.max(options.maxTokens, 16384) : 16384,
      };

      if (options.responseFormat?.type === "json_object") {
        const supportsResponseFormat = provider.name.includes("Gemini") || provider.name.includes("OpenRouter");
        if (supportsResponseFormat) {
          body.response_format = { type: "json_object" };
        }
      }

      const controller = new AbortController();
      const fetchTimeoutMs = 60000; // 60s generous timeout for unlimited token generation
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
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        const isAbort = fetchErr?.name === "AbortError" || String(fetchErr).includes("abort");
        if (isAbort) {
          console.warn(`[AI Engine] ${provider.name} timed out after ${fetchTimeoutMs}ms — failing over immediately...`);
          providerCooldownUntil.set(provider.cooldownKey, Date.now() + 30000);
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error(`[AI Engine] ${provider.name} returned non-JSON (${rawText.length} chars)`);
        throw new Error(`${provider.name} returned non-JSON response.`);
      }

      if (!res.ok || data.error) {
        const errMsg = data.error?.message ?? res.statusText;
        const isQuotaOr404 = res.status === 429 || res.status === 404 || res.status === 401 ||
                             String(errMsg).includes("quota") || String(errMsg).includes("RESOURCE_EXHAUSTED") ||
                             String(errMsg).includes("does not exist") || String(errMsg).includes("not found") ||
                             String(errMsg).includes("more credits");
        
        if (isQuotaOr404) {
          console.warn(`[AI Engine] ${provider.name} quota/model error (HTTP ${res.status}): ${errMsg}. Cooling down for 60s.`);
          providerCooldownUntil.set(provider.cooldownKey, Date.now() + 60000);
        }

        throw new Error(`${provider.name} error: ${errMsg}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error(`${provider.name} returned empty completion.`);
      }

      // Success — clear any cooldown for this provider
      providerCooldownUntil.delete(provider.cooldownKey);
      return content;
    } catch (e: any) {
      const msg = e.message || String(e);
      errors.push(`${provider.name}: ${msg}`);
      // Immediate failover to the next healthy provider without blocking sleep delay
    }
  }

  throw new Error(`All AI providers failed. Tried ${providersToRun.length} options: ${errors.join(" | ")}`);
}

// Extracts clean JSON string by stripping reasoning tags and finding first '{' or '[' and matching to final '}' or ']'
function stripMarkdownJson(text: string): string {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  
  let startIdx = -1;
  let endIdx = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf("]");
  }
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return cleaned.substring(startIdx, endIdx + 1);
  }
  
  return cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
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
      return validated;
    } catch (e) {
      console.warn("[AI Engine] Cache hit but failed to validate, falling back to fresh API call:", (e as Error)?.message);
    }
  }

  const start = Date.now();
  const messages: OpenRouterMessage[] = [
    { role: "system", content: modifiedSys },
    { role: "user", content: userPrompt },
  ];

  let text: string;
  try {
    text = await callAIRobust(messages, options);
  } catch (error) {
    console.error(`[AI Engine] All AI providers failed during JSON generation:`, error);
    throw new Error("AI extraction failed: all providers are rate-limited or unavailable. Please try again later.");
  }
  const duration = Date.now() - start;

  try {
    const { PerformanceMonitor } = require("../../utils/monitoring");
    PerformanceMonitor.record("ai", options.model || "unknown", duration);
  } catch (err) {}

  try {
    const repaired = tryRepairJSON(text);
    const parsed = JSON.parse(repaired);
    const validated = enforceSchema(parsed, fallback);

    setCachedAIResponse(modifiedSys, userPrompt, options, text);
    return validated;
  } catch (error) {
    console.warn(`[AI Engine] Initial JSON parsing/validation failed (AI call succeeded):`, error);
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

  // Fix unterminated string literals (odd unescaped quote count)
  const quotesCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quotesCount % 2 !== 0) {
    repaired += '"';
  }

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
// Latest Gemini flash models are the default; OpenRouter/Groq/NVIDIA remain as fallback providers.
export const MODELS = {
  FAST: "gemini-3.5-flash-lite",       // Study Assistant, Notes, Assignment, ATS fast, Proctoring
  BALANCED: "gemini-3.6-flash",        // Resume Builder, Interview, Coding Assistant, LinkedIn, DSA
  POWERFUL: "gemini-3.6-flash",        // Research Paper, Code Generation, PPT, Enhanced MindMap/Quiz
  CODE: "gemini-3.5-flash-lite",       // Code Gen, Debug, Explain, AI Coding Analysis
  CHEAP: "gemini-3.5-flash-lite",      // Cheapest option
  SUMMARIZATION: "gemini-3.6-flash",   // Research Summarization, writing
  CHAT: "gemini-3.6-flash",            // AI Chat default
  EMBEDDING: "nvidia/nemotron-3-embed-1b", // RAG/Search embeddings
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
  fast_summaries: "gemini-2.0-flash",
  ui_responses: "gemini-2.0-flash",
  quick_recommendations: "gemini-2.0-flash",
  general_assistant: "gemini-2.0-flash",
  fallback: "gemini-2.0-flash",
  hr_behavioral: "nvidia/llama-3.3-70b-instruct",
  hr_star_analysis: "nvidia/llama-3.3-70b-instruct",
  hr_communication: "deepseek-ai/deepseek-r1",
  hr_resume_analysis: "moonshotai/kimi-k2",
  hr_followup: "gemini-2.0-flash",
  hr_evaluation: "nvidia/llama-3.3-70b-instruct",
  hr_fallback: "gemini-2.0-flash",
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
  { id: "google/gemini-3.6-flash", name: "Gemini 3.6 Flash", provider: "Google", cheap: true },
  { id: "google/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", provider: "Google", cheap: true },
  { id: "google/gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "Google", cheap: false },
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
