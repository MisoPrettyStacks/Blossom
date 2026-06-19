// Blossom 🌸 — Pipeline runner with automatic free-tier failover.
//
// Tries each configured provider in the user's chosen order. If a provider is
// rate-limited / out of quota / erroring, it automatically advances to the next
// one so the pipeline keeps running on free resources.

import { getProvider, ProviderError } from "./providers.js";
import { getKey, getModel, loadOrder } from "./vault.js";

// Run a chat through the failover chain.
//   messages: [{ role, content }]
//   onAttempt: optional callback({ provider, status, detail }) for live UI logs
// Returns { text, provider, attempts }.
export async function runPipeline({ messages, onAttempt, signal } = {}) {
  const order = loadOrder();
  const attempts = [];
  let lastError = null;

  for (const providerId of order) {
    const provider = getProvider(providerId);
    if (!provider) continue;

    const apiKey = getKey(providerId).trim();
    if (!apiKey) {
      attempts.push({ provider: providerId, status: "skipped", detail: "No API key set" });
      onAttempt?.({ provider, status: "skipped", detail: "No API key set" });
      continue;
    }

    const model = getModel(providerId);
    onAttempt?.({ provider, status: "trying", detail: model });

    try {
      const text = await provider.rawChat({ apiKey, messages, model, signal });
      attempts.push({ provider: providerId, status: "success", detail: model });
      onAttempt?.({ provider, status: "success", detail: model });
      return { text, provider, attempts };
    } catch (err) {
      if (err.name === "AbortError") throw err;
      lastError = err;
      const detail = err instanceof ProviderError ? err.message : String(err);
      const isFailoverable =
        !(err instanceof ProviderError) ||
        ["rate_limit", "network", "error", "auth"].includes(err.type);
      attempts.push({ provider: providerId, status: "failed", detail });
      onAttempt?.({
        provider,
        status: err instanceof ProviderError && err.type === "rate_limit" ? "rate_limited" : "failed",
        detail,
      });
      if (!isFailoverable) break;
      // otherwise continue to the next provider
    }
  }

  const error = new Error(
    lastError
      ? `All providers exhausted. Last error: ${lastError.message}`
      : "No providers are configured. Add at least one API key in the Token Vault."
  );
  error.attempts = attempts;
  throw error;
}
