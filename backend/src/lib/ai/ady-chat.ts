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

export async function streamChat(
  messages: ChatMessage[],
  model: ChatModelId,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const providers = [];

  // 1. Add NVIDIA NIM if key exists (primary for chat)
  if (env.nvidiaApiKey) {
    let nvidiaModel = "z-ai/glm-5.2";
    if (model.includes("deepseek-ai/")) nvidiaModel = model;
    else if (model.includes("z-ai/")) nvidiaModel = model;
    else if (model.includes("moonshotai/")) nvidiaModel = model;
    else if (model.includes("mistralai/")) nvidiaModel = model;
    else if (model.includes("gemini")) nvidiaModel = "deepseek-ai/deepseek-v4-flash";
    providers.push({
      name: "NVIDIA",
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      key: env.nvidiaApiKey,
      model: nvidiaModel,
    });
  }

  // 2. Add Google Gemini if key exists
  if (env.geminiApiKey) {
    let geminiModel = "gemini-2.0-flash";
    if (model.includes("gemini")) {
      geminiModel = model.split("/").pop() || "gemini-2.0-flash";
    }
    providers.push({
      name: "Gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: env.geminiApiKey,
      model: geminiModel
    });
  }

  // 3. Add Groq if key exists
  if (env.groqApiKey) {
    let groqModel = "llama-3.3-70b-versatile";
    const modelLower = model.toLowerCase();
    const isMiniOrFast = (modelLower.includes("mini") && !modelLower.includes("gemini")) ||
                         modelLower.includes("haiku") ||
                         modelLower.includes("flash");
    if (isMiniOrFast) {
      groqModel = "llama-3.1-8b-instant";
    }
    providers.push({
      name: "Groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: env.groqApiKey,
      model: groqModel
    });
  }

  if (providers.length === 0) {
    throw new Error("No AI providers configured. Please check environment keys.");
  }

  let lastError: Error | null = null;

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
      if (error.name === "AbortError") {
        callbacks.onDone("");
        return;
      }
      console.warn(`[Chat Stream] ${provider.name} stream failed:`, error.message || error);
      lastError = error;
    }
  }

  callbacks.onError(new Error(`All AI streaming providers failed. Last Error: ${lastError?.message}`));
}
