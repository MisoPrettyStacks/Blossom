// Blossom 🌸 — Secrets Manager
//
// A general-purpose secrets store (beyond provider API keys). Secrets are
// encrypted AT REST in the browser with AES-GCM, using a key derived from a
// master passphrase via PBKDF2. The plaintext is only ever held in memory
// after the user unlocks the vault, and is masked in the UI.
//
// Storage shape (localStorage "blossom.secrets.vault"):
//   { v: 1, salt, iv, ct }   // ct = AES-GCM ciphertext of JSON { NAME: value }
//
// Nothing here ever leaves the device.

const VAULT_KEY = "blossom.secrets.vault";
const PBKDF2_ITERATIONS = 150000;

const enc = new TextEncoder();
const dec = new TextDecoder();

// In-memory state for the unlocked session.
let cryptoKey = null;        // CryptoKey derived from the passphrase
let secrets = null;          // { NAME: value } once unlocked
let salt = null;             // Uint8Array, persisted with the vault

function toB64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function fromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function readVault() {
  try {
    return JSON.parse(localStorage.getItem(VAULT_KEY));
  } catch {
    return null;
  }
}

export function vaultExists() {
  return Boolean(readVault());
}

export function isUnlocked() {
  return secrets !== null;
}

async function deriveKey(passphrase, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt the current in-memory secrets and persist them.
async function persist() {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    enc.encode(JSON.stringify(secrets))
  );
  localStorage.setItem(VAULT_KEY, JSON.stringify({
    v: 1, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct),
  }));
}

// Create a brand-new encrypted vault with the given passphrase.
export async function createVault(passphrase) {
  salt = crypto.getRandomValues(new Uint8Array(16));
  cryptoKey = await deriveKey(passphrase, salt);
  secrets = {};
  await persist();
}

// Unlock an existing vault. Returns true on success, false on wrong passphrase.
export async function unlock(passphrase) {
  const vault = readVault();
  if (!vault) return false;
  const saltBytes = fromB64(vault.salt);
  const key = await deriveKey(passphrase, saltBytes);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(vault.iv) },
      key,
      fromB64(vault.ct)
    );
    secrets = JSON.parse(dec.decode(plain));
    cryptoKey = key;
    salt = saltBytes;
    return true;
  } catch {
    return false; // wrong passphrase → decryption fails
  }
}

// Lock the vault: wipe plaintext + key from memory.
export function lock() {
  cryptoKey = null;
  secrets = null;
  salt = null;
}

// Permanently delete the encrypted vault.
export function destroyVault() {
  lock();
  localStorage.removeItem(VAULT_KEY);
}

function ensureUnlocked() {
  if (!isUnlocked()) throw new Error("Secrets vault is locked. Unlock it first.");
}

export function listNames() {
  ensureUnlocked();
  return Object.keys(secrets).sort();
}

export function getSecret(name) {
  ensureUnlocked();
  return secrets[name];
}

export async function setSecret(name, value) {
  ensureUnlocked();
  secrets[name] = value;
  await persist();
}

export async function deleteSecret(name) {
  ensureUnlocked();
  delete secrets[name];
  await persist();
}

// Replace {{SECRET_NAME}} tokens in a string with their values.
// Unknown tokens are left untouched. Only works when unlocked.
export function injectSecrets(text) {
  if (typeof text !== "string" || !isUnlocked()) return text;
  return text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, name) => {
    return Object.prototype.hasOwnProperty.call(secrets, name) ? secrets[name] : match;
  });
}

// A read-only snapshot of secrets for injecting into the code sandbox.
export function snapshot() {
  return isUnlocked() ? { ...secrets } : {};
}
