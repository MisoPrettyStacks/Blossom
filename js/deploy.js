// Blossom 🌸 — "One-click" deploy / share
//
// Blossom is a free static app with no backend, so there's no server to deploy
// to. Instead we give you the free, no-cost equivalents:
//   1. Shareable link  — the pipeline config is encoded into a URL (#p=…) so
//      anyone who opens it imports the pipeline (secret VALUES are never included).
//   2. Standalone HTML — download a single self-contained .html file that runs
//      this pipeline on its own (the recipient enters their own free keys).
//   3. Host the whole app free on GitHub Pages / Netlify / Vercel.

// Base64 that survives unicode.
function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64decode(str) {
  return decodeURIComponent(escape(atob(str)));
}

export function encodeShareLink(pipeline) {
  const safe = { ...pipeline, id: undefined };
  const payload = b64encode(JSON.stringify(safe));
  const base = location.href.split("#")[0];
  return `${base}#p=${payload}`;
}

// Returns a decoded pipeline from the URL hash, or null.
export function readShareLink() {
  const m = location.hash.match(/[#&]p=([^&]+)/);
  if (!m) return null;
  try {
    const obj = JSON.parse(b64decode(m[1]));
    if (obj && Array.isArray(obj.steps)) return obj;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearShareLink() {
  history.replaceState(null, "", location.pathname + location.search);
}

export function downloadFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Build a single self-contained HTML file that runs the given pipeline.
export function buildStandaloneHtml(pipeline) {
  const cfg = JSON.stringify(pipeline, null, 2);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(pipeline.name)} — Blossom pipeline</title>
<style>
  body { font-family: 'Trebuchet MS', system-ui, sans-serif; background: #ffe0f0; color: #2b2b3d; margin: 0; padding: 24px; }
  .card { max-width: 720px; margin: 0 auto; background: #fdfaf6; border: 2.5px solid #2b2b3d; border-radius: 14px; box-shadow: 6px 6px 0 rgba(43,43,61,.9); padding: 20px; }
  h1 { font-size: 20px; margin: 0 0 4px; } .muted { color: #6b6b7a; font-size: 13px; }
  label { display:block; font-weight:700; font-size:12px; margin:12px 0 4px; color:#cc0066; }
  input, textarea { width:100%; border:2px solid #2b2b3d; border-radius:8px; padding:8px; font:inherit; font-size:13px; }
  button { margin-top:14px; background:#ff9fc7; border:2px solid #2b2b3d; border-radius:8px; box-shadow:2px 2px 0 #2b2b3d; padding:8px 16px; font-weight:700; cursor:pointer; }
  button:active { transform:translate(2px,2px); box-shadow:none; }
  pre { white-space:pre-wrap; word-break:break-word; background:#e8f4fd; border:2px solid #9fc9f5; border-radius:10px; padding:12px; font-size:13px; }
  .log { font-family:monospace; font-size:12px; background:#16161f; color:#00ff88; border-radius:8px; padding:10px; margin-top:12px; }
</style>
</head>
<body>
<div class="card">
  <h1>🌸 ${escapeHtml(pipeline.name)}</h1>
  <p class="muted">A standalone Blossom pipeline. Your keys stay in this browser tab only.</p>
  <label>Groq API key <span class="muted">(console.groq.com/keys)</span></label>
  <input id="k_groq" type="password" placeholder="gsk_…" />
  <label>Google Gemini API key <span class="muted">(aistudio.google.com/app/apikey)</span></label>
  <input id="k_gemini" type="password" placeholder="AIza…" />
  <label>OpenRouter API key <span class="muted">(openrouter.ai/keys)</span></label>
  <input id="k_openrouter" type="password" placeholder="sk-or-…" />
  <label>Pipeline input <span class="muted">(optional)</span></label>
  <textarea id="input" rows="3" placeholder="Starting input for the first step…"></textarea>
  <button id="run">▶ Run pipeline</button>
  <div id="log" class="log" style="display:none"></div>
  <label style="margin-top:16px">Result</label>
  <pre id="out">—</pre>
</div>
<script>
const PIPELINE = ${cfg};
${STANDALONE_RUNTIME}
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Compact runtime embedded into standalone exports. Mirrors the providers +
// failover + step logic, but reads keys from the page inputs.
const STANDALONE_RUNTIME = `
function keys() {
  return {
    groq: document.getElementById("k_groq").value.trim(),
    gemini: document.getElementById("k_gemini").value.trim(),
    openrouter: document.getElementById("k_openrouter").value.trim(),
  };
}
async function aiChat(prompt) {
  const k = keys();
  const messages = [{ role: "user", content: prompt }];
  const attempts = [
    { id: "groq", ok: !!k.groq, run: () => oai("https://api.groq.com/openai/v1/chat/completions", k.groq, "llama-3.3-70b-versatile", messages) },
    { id: "gemini", ok: !!k.gemini, run: () => gemini(k.gemini, "gemini-1.5-flash", messages) },
    { id: "openrouter", ok: !!k.openrouter, run: () => oai("https://openrouter.ai/api/v1/chat/completions", k.openrouter, "meta-llama/llama-3.3-70b-instruct:free", messages) },
  ];
  let lastErr = "no keys entered";
  for (const a of attempts) {
    if (!a.ok) continue;
    try { return await a.run(); } catch (e) { lastErr = e.message; log("failover: " + a.id + " → " + e.message); }
  }
  throw new Error("All providers failed. Last: " + lastErr);
}
async function oai(url, key, model, messages) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ model, messages }) });
  if (!r.ok) throw new Error("HTTP " + r.status); const d = await r.json(); return d.choices[0].message.content.trim();
}
async function gemini(key, model, messages) {
  const contents = messages.map(m => ({ role: "user", parts: [{ text: m.content }] }));
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(key), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents }) });
  if (!r.ok) throw new Error("HTTP " + r.status); const d = await r.json(); return d.candidates[0].content.parts.map(p => p.text).join("").trim();
}
function fill(t, input) { return typeof t === "string" ? t.replace(/\\{\\{\\s*input\\s*\\}\\}/g, input == null ? "" : String(input)) : t; }
function log(msg) { const el = document.getElementById("log"); el.style.display = "block"; el.textContent += "> " + msg + "\\n"; }
async function runStep(step, input) {
  if (step.type === "ai") return await aiChat(fill(step.config.prompt || "", input));
  if (step.type === "http") {
    const init = { method: (step.config.method || "GET").toUpperCase(), headers: step.config.headers ? JSON.parse(fill(step.config.headers, input)) : {} };
    if (init.method !== "GET" && init.method !== "HEAD" && step.config.body) init.body = fill(step.config.body, input);
    const r = await fetch(fill(step.config.url, input), init); const b = await r.text(); if (!r.ok) throw new Error("HTTP " + r.status); return b;
  }
  if (step.type === "code") { const AF = Object.getPrototypeOf(async function(){}).constructor; return await new AF("input", "secrets", step.config.code || "return input;")(input, {}); }
  throw new Error("Unknown step: " + step.type);
}
document.getElementById("run").onclick = async () => {
  document.getElementById("log").textContent = ""; document.getElementById("out").textContent = "Running…";
  let input = document.getElementById("input").value || null;
  try {
    for (let i = 0; i < PIPELINE.steps.length; i++) { log("step " + (i + 1) + " (" + PIPELINE.steps[i].type + ")…"); input = await runStep(PIPELINE.steps[i], input); }
    document.getElementById("out").textContent = typeof input === "string" ? input : JSON.stringify(input, null, 2);
  } catch (e) { document.getElementById("out").textContent = "Error: " + e.message; }
};
`;
