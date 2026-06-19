# How to use Blossom 🌸

Blossom is a free AI app you run in your browser. You bring your own free API
keys, they stay on **your** computer, and the app automatically switches between
providers so you keep running even when a free limit is reached.

This guide covers everything from zero to your first answer.

---

## 1. Open the app

You have three easy options — pick whichever is simplest for you.

### Option A — Just open the file (zero setup)
Double-click `index.html`. It opens in your browser and works immediately.

### Option B — Run a tiny local server
Useful if you want a clean `http://localhost` URL.

```bash
npm start
```

Then open the URL it prints (usually <http://localhost:3000>).

### Option C — Host it online for free
Because Blossom is just static files, you can publish it for free:

- **GitHub Pages:** push this project to a GitHub repo → repo **Settings → Pages**
  → *Build and deployment* → **Deploy from a branch** → select `main` and `/ (root)` → **Save**.
  Your app appears at `https://<your-username>.github.io/<repo-name>/`.
- **Vercel / Netlify / Cloudflare Pages:** click "Import project", choose this repo.
  There's **no build command**; the output directory is the project root.

---

## 2. Get your free API keys

Blossom never gives you keys — you create your own free ones. You only need
**one** to start, but adding more enables automatic failover.

| Provider | Where to get a free key | Notes |
|----------|------------------------|-------|
| **Groq** | <https://console.groq.com/keys> | Fast Llama models, generous free tier |
| **Google Gemini** | <https://aistudio.google.com/app/apikey> | Free tier via Google AI Studio |
| **OpenRouter** | <https://openrouter.ai/keys> | Access to many `:free` community models |

Sign in to any of the links above, create a key, and copy it.

---

## 3. Save your keys in the Token Vault

1. Click **🔑 Token Vault** (top-right).
2. Find the provider you have a key for.
3. Paste the key into its box and click **Save key**.
   - The green dot 🟢 means a key is saved.
   - Use the 👁 button to reveal/hide the key while typing.
4. (Optional) Pick a **Model** for that provider from the dropdown.

> 🔒 **Your keys never leave your device.** They are stored only in your
> browser's `localStorage` and are sent **directly** to the provider's API when
> you run a prompt — never to any Blossom server (there isn't one).

To remove a key, click **Clear** on that provider, or **Clear all keys** at the
bottom of the vault.

---

## 4. Set your failover order (optional)

The number badge (1, 2, 3…) on each provider is its **priority**. Blossom tries
provider **1** first; if it's rate-limited or out of free quota, it automatically
moves to **2**, then **3**, and so on.

Use the **▲ / ▼** arrows on each card to reorder them. Put your favorite or
fastest provider at the top.

---

## 5. Run a pipeline

1. Close the vault.
2. (Optional) Edit the **System prompt** to steer the assistant's behavior.
3. Type your request in **Your prompt**.
4. Click **Run pipeline** (or press **Ctrl/Cmd + Enter**).

You'll see a live log such as:

```
… Trying Groq (llama-3.3-70b-versatile)
✓ Groq responded
```

…or, when a free limit is hit, automatic failover in action:

```
⏭ Groq rate-limited — failing over
… Trying Google Gemini (gemini-1.5-flash)
✓ Google Gemini responded
```

The answer appears under **Result**, tagged with the provider that handled it.
Click **Cancel** to stop a run in progress.

---

## 6. How automatic free-tier failover works

When you run a prompt, Blossom walks down your provider list:

1. **Skips** any provider with no key.
2. **Tries** the next configured provider.
3. On **success**, shows the answer and stops.
4. On a **rate limit (HTTP 429)**, **auth error**, **server error**, or **network
   error**, it logs the issue and **moves to the next provider automatically**.
5. If every provider fails, it shows the last error so you know what happened.

This is what keeps you running "for free even when limits are reached" — add keys
for two or three providers and you effectively multiply your free quota.

---

## 7. The other apps on the desktop

Blossom is a little desktop — open these from the icons or the 🌸 Start menu.

### 💻 Code Editor
Write and **run JavaScript right in the browser**, with syntax highlighting.
- Click **Run code** to execute. `console.log(...)` output and the function's
  `return` value are shown below.
- Your code runs in a **sandboxed iframe** — it can't touch the rest of Blossom.
- When your Secrets vault is unlocked, a read-only `secrets` object is available
  inside your code (e.g. `secrets.MY_TOKEN`).
- Python/HTML are available for editing & highlighting; only JavaScript executes.

### 🗝️ Secrets Manager
Store API keys, tokens, and env vars beyond the three AI providers.
1. The first time, **create a master passphrase** — this encrypts your vault.
2. Add secrets as `NAME` → `value` (e.g. `STRIPE_KEY` → `sk_live_…`).
3. Values are **encrypted at rest** with AES-GCM (a key derived from your
   passphrase) and stored only on this device. They're masked in the UI.
4. **Lock** the vault to wipe the decrypted values from memory.
- Reference any secret inside pipelines and code as `{{NAME}}`.
- ⚠️ There is **no recovery** — if you forget the passphrase, the data can't be
  decrypted (that's the point of encryption).

### 🔁 Pipeline Builder
Chain multiple steps into one repeatable workflow. Each step's output feeds the
next as `{{input}}` (or the `input` variable in code).
- **Step types:** 🤖 AI prompt (runs through the failover chain), 🌐 HTTP request,
  💻 Code (JavaScript).
- Inject secrets anywhere with `{{SECRET_NAME}}`.
- Set **Retries on failure** per step.
- **Conditional logic:** give a step a **Run only if** JavaScript expression
  (it sees `input` and `secrets`). If it evaluates falsy, that step is skipped
  and the previous output passes straight through — e.g. `input.length > 0`.
- **Run pipeline** runs it once; tick **Run automatically every N seconds** to
  schedule it (runs while the tab stays open).
- Tick **Notify me when a run fails** to get a desktop notification (or a
  taskbar alert) whenever a run errors out.
- Create multiple named pipelines with **＋** and switch between them.

### 🚀 Deploy & Share
Blossom has no server, so "deploy" means these free options:
- **🔗 Shareable link** — encodes the pipeline config in a URL; opening it imports
  the pipeline. Secret **values are never included.**
- **📦 Standalone HTML** — download one self-contained `.html` that runs the
  pipeline anywhere (the user enters their own free keys).
- **☁️ Host the whole app free** on GitHub Pages, Netlify Drop, or Vercel.

---

## 8. Troubleshooting

| Problem | Fix |
|---------|-----|
| "No keys set yet" warning | Open the Token Vault and save at least one key. |
| All providers fail with **auth** errors | The key is wrong or expired — paste a fresh one. |
| Everything is **rate-limited** | Wait a bit, or add another provider's free key. |
| Nothing happens on click | Make sure JavaScript is enabled; try the local server option. |
| Keys disappeared | They're per-browser/per-device. Clearing browser data removes them. |

---

## 9. Privacy summary

- ✅ Keys are stored **only** in your browser (`localStorage`).
- ✅ Prompts and keys go **directly** to the provider you're using.
- ✅ No backend, no database, no telemetry, no accounts.
- ⚠️ If you ever pasted a key somewhere public or shared it, **rotate it** at the
  provider's dashboard.

Enjoy Blossom 🌸 — build freely.
