// Blossom 🌸 — Free AI provider adapters
//
// Each provider exposes a unified interface:
//   { id, label, signupUrl, keyName, models, isConfigured(keys), chat({ keys, messages, model, signal }) }
//
// All calls run in the browser. Keys are read from the user's local vault and
// are never sent anywhere except directly to the provider's own API.

// A normalized error so the pipeline can decide whether to fail over.
export class ProviderError extends Error {
  constructor(message, { type = "error", status = null, provider = null } = {}) {
    super(message);
    this.name = "ProviderError";
    this.type = type; // "rate_limit" | "auth" | "missing_key" | "network" | "error"
    this.status = status;
    this.provider = provider;
  }
}

// Map an HTTP status to a failover-relevant error type.
function classifyStatus(status) {
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (status >= 500) return "error"; // transient server error — worth failing over
  return "error";
}

async function postJson(url, { headers, body, signal }) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ProviderError(`Network error: ${err.message}`, { type: "network" });
  }
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.error?.message || data?.message || JSON.stringify(data);
    } catch {
      detail = res.statusText;
    }
    throw new ProviderError(`HTTP ${res.status}: ${detail}`, {
      type: classifyStatus(res.status),
      status: res.status,
    });
  }
  return res.json();
}

// OpenAI-compatible chat (used by Groq and OpenRouter).
function openAICompatChat(endpoint, extraHeaders = () => ({})) {
  return async ({ apiKey, messages, model, signal }) => {
    const data = await postJson(endpoint, {
      headers: { Authorization: `Bearer ${apiKey}`, ...extraHeaders() },
      body: { model, messages, temperature: 0.7 },
      signal,
    });
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new ProviderError("Empty response from provider", { type: "error" });
    return text.trim();
  };
}

export const PROVIDERS = [
  {
    id: "groq",
    label: "Groq",
    keyName: "GROQ_API_KEY",
    signupUrl: "https://console.groq.com/keys",
    note: "Very fast Llama models. Generous free tier.",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    rawChat: openAICompatChat("https://api.groq.com/openai/v1/chat/completions"),
  },
  {
    id: "gemini",
    label: "Google Gemini",
    keyName: "GOOGLE_AI_API_KEY",
    signupUrl: "https://aistudio.google.com/app/apikey",
    note: "Google AI Studio free tier.",
    models: ["gemini-1.5-flash", "gemini-1.5-flash-8b"],
    rawChat: async ({ apiKey, messages, model, signal }) => {
      // Gemini uses a different request shape.
      const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body = { contents };
      if (sys) body.systemInstruction = { parts: [{ text: sys }] };
      const data = await postJson(url, { body, signal });
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");
      if (!text) throw new ProviderError("Empty response from Gemini", { type: "error" });
      return text.trim();
    },
  },
  {
    id: "openrouter",
    label: "OpenRouter (free models)",
    keyName: "OPENROUTER_API_KEY",
    signupUrl: "https://openrouter.ai/keys",
    note: "Aggregates many free community models.",
    models: ["meta-llama/llama-3.3-70b-instruct:free", "google/gemma-2-9b-it:free"],
    rawChat: openAICompatChat("https://openrouter.ai/api/v1/chat/completions", () => ({
      "HTTP-Referer": location.origin || "https://blossom.local",
      "X-Title": "Blossom",
    })),
  },
];

export function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id) || null;
}
