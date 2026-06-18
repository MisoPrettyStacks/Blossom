// Blossom 🌸 — Token Vault
//
// Stores the user's API keys ONLY in their browser's localStorage. Keys never
// leave the user's computer except when sent directly to the chosen provider.

import { PROVIDERS } from "./providers.js";

const KEYS_STORAGE = "blossom.vault.keys";
const ORDER_STORAGE = "blossom.vault.order";
const MODEL_STORAGE = "blossom.vault.models";

export function loadKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEYS_STORAGE)) || {};
  } catch {
    return {};
  }
}

export function saveKeys(keys) {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
}

export function getKey(providerId) {
  return loadKeys()[providerId] || "";
}

export function hasKey(providerId) {
  return Boolean((loadKeys()[providerId] || "").trim());
}

// Failover order — defaults to declaration order in PROVIDERS.
export function loadOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_STORAGE));
    if (Array.isArray(saved) && saved.length) {
      // Drop unknown ids and append any new providers.
      const known = saved.filter((id) => PROVIDERS.some((p) => p.id === id));
      for (const p of PROVIDERS) if (!known.includes(p.id)) known.push(p.id);
      return known;
    }
  } catch {
    /* fall through */
  }
  return PROVIDERS.map((p) => p.id);
}

export function saveOrder(order) {
  localStorage.setItem(ORDER_STORAGE, JSON.stringify(order));
}

export function loadModels() {
  try {
    return JSON.parse(localStorage.getItem(MODEL_STORAGE)) || {};
  } catch {
    return {};
  }
}

export function saveModels(models) {
  localStorage.setItem(MODEL_STORAGE, JSON.stringify(models));
}

export function getModel(providerId) {
  const saved = loadModels()[providerId];
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return saved || provider?.models?.[0] || "";
}

export function clearAll() {
  localStorage.removeItem(KEYS_STORAGE);
  localStorage.removeItem(ORDER_STORAGE);
  localStorage.removeItem(MODEL_STORAGE);
}
