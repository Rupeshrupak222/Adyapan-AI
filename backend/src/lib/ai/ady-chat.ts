import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { callAIRobust, type ChatModelId, type OpenRouterMessage } from "./openrouter";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Stream chat using official Google Generative AI SDK (generateContentStream)
 */
async function streamGeminiNative(
  apiKey: string,
  modelName: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<boolean> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return false;

  const genAI = new GoogleGenerativeAI(cleanKey);

  const systemMessage = messages.find((m) => m.role === "system")?.content;
  const conversationMessages = messages.filter((m) => m.role !== "system" && m.content?.trim());

  if (conversationMessages.length === 0) {
    callbacks.onDone("");
    return true;
  }

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemMessage ? { role: "system", parts: [{ text: systemMessage }] } : undefined,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  const contents = conversationMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content || " " }],
  }));

  const result = await model.generateContentStream({ contents });

  let fullText = "";
  for await (const chunk of result.stream) {
    if (signal?.aborted) {
      callbacks.onDone(fullText);
      return true;
    }
    const text = chunk.text();
    if (text) {
      fullText += text;
      callbacks.onChunk(text);
    }
  }

  callbacks.onDone(fullText);
  return true;
}

export async function streamChat(
  messages: ChatMessage[],
  model: ChatModelId,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let lastError: Error | null = null;

  // 1. Primary: Google Gemini Native SDK
  if (env.geminiApiKey) {
    const requestedLower = (model || "").toLowerCase();
    const primaryGeminiModel = requestedLower.includes("pro")
      ? "gemini-1.5-pro"
      : "gemini-2.0-flash";

    const geminiModelsToTry = [
      primaryGeminiModel,
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    for (const gModel of geminiModelsToTry) {
      try {
        const success = await streamGeminiNative(
          env.geminiApiKey,
          gModel,
          messages,
          callbacks,
          signal
        );
        if (success) return;
      } catch (err: any) {
        if (err.name === "AbortError" || signal?.aborted) {
          callbacks.onDone("");
          return;
        }
        console.warn(`[Gemini SDK] ${gModel} stream error:`, err?.message || err);
        lastError = err;
      }
    }
  }

  // 2. Secondary fallback: OpenRouter / OpenAI compatible streaming providers
  const providers: { name: string; url: string; key: string; model: string }[] = [];

  // OpenRouter
  if (env.openrouterApiKey) {
    let orModel = "google/gemini-2.0-flash-001";
    const modelLower = (model || "").toLowerCase();
    if (modelLower.includes("kimi")) orModel = "moonshotai/kimi-k2";
    else if (modelLower.includes("deepseek")) orModel = "deepseek/deepseek-chat";
    else if (modelLower.includes("llama")) orModel = "meta-llama/llama-3.3-70b-instruct";
    else if (modelLower.includes("gpt")) orModel = "openai/gpt-4o-mini";

    providers.push(
      {
        name: `OpenRouter (${orModel})`,
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: env.openrouterApiKey,
        model: orModel,
      },
      {
        name: "OpenRouter (gpt-4o-mini)",
        url: "https://openrouter.ai/api/v1/chat/completions",
        key: env.openrouterApiKey,
        model: "openai/gpt-4o-mini",
      }
    );
  }

  // Groq (active high-speed models)
  if (env.groqApiKey) {
    providers.push(
      {
        name: "Groq (openai/gpt-oss-120b)",
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: env.groqApiKey,
        model: "openai/gpt-oss-120b",
      },
      {
        name: "Groq (qwen/qwen3.8-27b)",
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: env.groqApiKey,
        model: "qwen/qwen3.8-27b",
      },
      {
        name: "Groq (openai/gpt-oss-20b)",
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: env.groqApiKey,
        model: "openai/gpt-oss-20b",
      },
      {
        name: "Groq (qwen/qwen3.6-27b)",
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: env.groqApiKey,
        model: "qwen/qwen3.6-27b",
      }
    );
  }

  // NVIDIA NIM (rotate through all available API keys with validated models)
  const nvidiaKeys = (env.nvidiaApiKeys && env.nvidiaApiKeys.length > 0)
    ? env.nvidiaApiKeys
    : (env.nvidiaApiKey ? [env.nvidiaApiKey] : []);

  const nvidiaModels = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "mistralai/mistral-large-2-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "moonshotai/kimi-k2.6",
  ];

  for (const nKey of nvidiaKeys) {
    for (const nModel of nvidiaModels) {
      providers.push({
        name: `NVIDIA (${nModel})`,
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        key: nKey,
        model: nModel,
      });
    }
  }

  for (const provider of providers) {
    try {
      const body: Record<string, unknown> = {
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      };

      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.key}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(`${provider.name} error: ${errData.error?.message ?? res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              callbacks.onChunk(delta);
            }
          } catch {
            // skip unparseable SSE lines
          }
        }
      }

      if (fullText.trim()) {
        callbacks.onDone(fullText);
        return; // Success!
      }
    } catch (error: any) {
      if (error.name === "AbortError" || signal?.aborted) {
        callbacks.onDone("");
        return;
      }
      console.warn(`[Chat Stream] ${provider.name} stream failed:`, error.message || error);
      lastError = error;
    }
  }

  // 3. Ultimate Safety Net: Call multi-provider fallback engine (callAIRobust)
  try {
    console.log("[Chat Stream] Fallback to callAIRobust multi-provider fallback engine...");
    const fallbackResponse = await callAIRobust(messages as OpenRouterMessage[], {
      model: model || "google/gemini-2.0-flash-001",
      maxTokens: 4096,
    });

    if (fallbackResponse && fallbackResponse.trim()) {
      // Chunk response smoothly to client
      const chunkSize = 24;
      for (let i = 0; i < fallbackResponse.length; i += chunkSize) {
        const chunk = fallbackResponse.slice(i, i + chunkSize);
        callbacks.onChunk(chunk);
      }
      callbacks.onDone(fallbackResponse);
      return;
    }
  } catch (robustErr: any) {
    console.error("[Chat Stream] callAIRobust fallback also failed:", robustErr);
    lastError = robustErr;
  }

  callbacks.onError(
    new Error(`All AI streaming providers failed. Last Error: ${lastError?.message || "Unknown error"}`)
  );
}
