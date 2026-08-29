import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import type { ChatModelId } from "./openrouter";

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
 * Stream chat using official Google Generative AI SDK
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

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemMessage || undefined,
  });

  if (conversationMessages.length === 0) {
    callbacks.onDone("");
    return true;
  }

  // Format previous history for Gemini (must start with user and alternate)
  const rawHistory = conversationMessages.slice(0, -1);
  const formattedHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];

  for (const m of rawHistory) {
    const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
      formattedHistory[formattedHistory.length - 1].parts[0].text += `\n\n${m.content}`;
    } else {
      formattedHistory.push({
        role,
        parts: [{ text: m.content || " " }],
      });
    }
  }

  if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
    formattedHistory.shift();
  }

  const lastUserMsg = conversationMessages[conversationMessages.length - 1];
  const lastPrompt = lastUserMsg?.content || "Hello";

  const chat = model.startChat({
    history: formattedHistory,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  const result = await chat.sendMessageStream(lastPrompt);

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

  // 1. Primary: Google Gemini Native SDK (Fastest, most reliable)
  if (env.geminiApiKey) {
    const requestedLower = (model || "").toLowerCase();
    const primaryGeminiModel = requestedLower.includes("pro")
      ? "gemini-1.5-pro"
      : "gemini-2.0-flash";

    const geminiModelsToTry = [
      primaryGeminiModel,
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
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
        if (success) return; // Successfully streamed!
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

  // 2. Secondary fallback: OpenRouter / OpenAI compatible providers
  const providers: { name: string; url: string; key: string; model: string }[] = [];

  // OpenRouter
  if (env.openrouterApiKey) {
    let orModel = "google/gemini-2.0-flash-001";
    const modelLower = (model || "").toLowerCase();
    if (modelLower.includes("kimi")) orModel = "moonshotai/kimi-k2";
    else if (modelLower.includes("deepseek")) orModel = "deepseek/deepseek-chat";
    else if (modelLower.includes("llama")) orModel = "meta-llama/llama-3.3-70b-instruct";
    else if (modelLower.includes("gpt")) orModel = "openai/gpt-4o-mini";

    providers.push({
      name: `OpenRouter (${orModel})`,
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: env.openrouterApiKey,
      model: orModel,
    });
  }

  // Groq
  if (env.groqApiKey) {
    providers.push(
      {
        name: "Groq (llama-3.3-70b)",
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: env.groqApiKey,
        model: "llama-3.3-70b-versatile",
      },
      {
        name: "Groq (llama-3.1-8b)",
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: env.groqApiKey,
        model: "llama-3.1-8b-instant",
      }
    );
  }

  // NVIDIA NIM (active endpoints)
  const nimKey = env.nvidiaApiKey || (env.nvidiaApiKeys && env.nvidiaApiKeys[0]);
  if (nimKey) {
    providers.push(
      {
        name: "NVIDIA (Llama 3.3 70B)",
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        key: nimKey,
        model: "meta/llama-3.3-70b-instruct",
      },
      {
        name: "NVIDIA (DeepSeek R1)",
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        key: nimKey,
        model: "deepseek-ai/deepseek-r1",
      }
    );
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
            // skip unparseable lines
          }
        }
      }

      callbacks.onDone(fullText);
      return; // Success! Return immediately.
    } catch (error: any) {
      if (error.name === "AbortError" || signal?.aborted) {
        callbacks.onDone("");
        return;
      }
      console.warn(`[Chat Stream] ${provider.name} stream failed:`, error.message || error);
      lastError = error;
    }
  }

  callbacks.onError(
    new Error(`All AI streaming providers failed. Last Error: ${lastError?.message || "Unknown error"}`)
  );
}
