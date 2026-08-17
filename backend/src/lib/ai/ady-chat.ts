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

  // 1. Add Google Gemini if key exists (primary for chat)
  if (env.geminiApiKey) {
    let primaryModel = "gemini-2.5-flash";
    const requestedLower = (model || "").toLowerCase();
    if (requestedLower.includes("pro")) {
      primaryModel = "gemini-2.5-pro";
    }
    const geminiChain = [primaryModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
    const uniqueGemini = Array.from(new Set(geminiChain));

    for (const gModel of uniqueGemini) {
      providers.push({
        name: `Gemini (${gModel})`,
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        key: env.geminiApiKey,
        model: gModel,
      });
    }
  }

  // 2. Add OpenRouter if key exists (secondary for chat)
  if (env.openrouterApiKey) {
    let orModel = "openai/gpt-4o-mini";
    const modelLower = (model || "").toLowerCase();
    if (modelLower.includes("kimi")) orModel = "moonshotai/kimi-k2";
    else if (modelLower.includes("pro")) orModel = "google/gemini-2.5-pro";
    else if (modelLower.includes("gemini")) orModel = "google/gemini-2.5-flash";
    else if (modelLower.includes("deepseek")) orModel = "deepseek/deepseek-chat";
    else if (modelLower.includes("llama")) orModel = "meta-llama/llama-3.3-70b-instruct";
    else if (modelLower.includes("mistral")) orModel = "mistralai/mistral-medium";
    else if (modelLower.includes("glm")) orModel = "z-ai/glm-4.5";
    providers.push({
      name: `OpenRouter (${orModel})`,
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: env.openrouterApiKey,
      model: orModel,
    });
  }

  // 3. Add Groq if key exists
  if (env.groqApiKey) {
    providers.push({
      name: "Groq (llama-3.3-70b)",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: env.groqApiKey,
      model: "llama-3.3-70b-versatile",
    });
    providers.push({
      name: "Groq (llama-3.1-8b)",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: env.groqApiKey,
      model: "llama-3.1-8b-instant",
    });
  }

  // 4. Add NVIDIA NIM if key exists (valid active NIM endpoints only)
  const nimKey = env.nvidiaApiKey || (env.nvidiaApiKeys && env.nvidiaApiKeys[0]);
  if (nimKey) {
    const validNimModels = [
      "meta/llama-3.3-70b-instruct",
      "deepseek-ai/deepseek-r1",
      "mistralai/mistral-large-2-instruct",
    ];

    for (const nimModel of validNimModels) {
      providers.push({
        name: `NVIDIA (${nimModel})`,
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        key: nimKey,
        model: nimModel,
      });
    }
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
