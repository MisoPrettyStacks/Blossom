# My Blossom Project 🌸

A **100% free, client-side** AI pipeline web app. No backend, no servers, no bills.

- 🔑 **Bring your own free keys** — each user enters their own API keys in the in-app **Token Vault**.
- 💻 **Keys stay on your computer** — stored only in your browser's `localStorage`, never uploaded to any cloud.
- ♻️ **Automatic free-tier failover** — when one provider hits its rate limit or runs out of free quota, Blossom automatically switches to the next one.
- 🚀 **Free to host** — it's just static files, so GitHub Pages / Vercel / Netlify host it for free.

## Quick start (local)

It's static HTML/JS — just open it, or serve it:

```bash
npm start          # serves on http://localhost:3000
# or simply open index.html in your browser
```

Then click **🔑 Token Vault**, paste at least one free API key, and run a prompt.

👉 **Full walkthrough:** see [HOW_TO_USE.md](./HOW_TO_USE.md)

## Deploy for free

- **GitHub Pages:** push this repo, then Settings → Pages → deploy from `main` / root.
- **Vercel / Netlify / Cloudflare Pages:** import the repo; no build step, output dir is the repo root.

## Supported free providers

| Provider | Free key |
|----------|----------|
| Groq | https://console.groq.com/keys |
| Google Gemini | https://aistudio.google.com/app/apikey |
| OpenRouter (free models) | https://openrouter.ai/keys |

## Security

There is **no `.env` with real keys** in this repo, and `.env` is git-ignored. Each user supplies
their own keys at runtime, stored locally in their browser. If you ever shared a key, rotate it.
