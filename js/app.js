// Blossom 🌸 — Y2K desktop UI wiring
import { getProvider } from "./providers.js";
import {
  loadKeys, saveKeys, loadOrder, saveOrder,
  loadModels, saveModels, clearAll, hasKey,
} from "./vault.js";
import { runPipeline } from "./pipeline.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) node.append(c);
  return node;
};

let runController = null;

/* ============================ Window manager ============================ */

const WIN_TITLES = {
  blossom: "🌸 Blossom",
  vault: "🔑 Token Vault",
  howto: "📖 How To",
  about: "💖 About",
};
const minimized = {};
let topZ = 20;

function winEl(id) { return document.getElementById("win-" + id); }

function openWin(id) {
  const w = winEl(id);
  if (!w) return;
  w.classList.add("open");
  w.style.zIndex = ++topZ;
  minimized[id] = false;
  updateTaskbar();
}
function closeWin(id) {
  const w = winEl(id);
  if (!w) return;
  w.classList.remove("open");
  minimized[id] = false;
  updateTaskbar();
}
function focusWin(id) {
  const w = winEl(id);
  if (w) w.style.zIndex = ++topZ;
}
function toggleMin(id) {
  const w = winEl(id);
  if (!w) return;
  if (minimized[id]) {
    w.classList.add("open");
    w.style.zIndex = ++topZ;
    minimized[id] = false;
  } else {
    w.classList.remove("open");
    minimized[id] = true;
  }
  updateTaskbar();
}

function updateTaskbar() {
  const tb = $("#taskbar-tasks");
  tb.innerHTML = "";
  Object.keys(WIN_TITLES).forEach((id) => {
    const w = winEl(id);
    const visible = w && (w.classList.contains("open") || minimized[id]);
    if (!visible) return;
    const btn = el("div", {
      className: "taskbar-task" + (minimized[id] ? "" : " active"),
      textContent: WIN_TITLES[id],
    });
    btn.onclick = () => {
      if (minimized[id]) toggleMin(id);
      else focusWin(id);
    };
    tb.append(btn);
  });
}

// Dragging
let dragging = null, ox = 0, oy = 0;
function startDrag(e, id) {
  const w = winEl(id);
  w.style.zIndex = ++topZ;
  const r = w.getBoundingClientRect();
  const dr = $("#desktop").getBoundingClientRect();
  ox = e.clientX - (r.left - dr.left);
  oy = e.clientY - (r.top - dr.top);
  dragging = w;
  e.preventDefault();
}
document.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dr = $("#desktop").getBoundingClientRect();
  let nx = e.clientX - dr.left - ox;
  let ny = e.clientY - dr.top - oy;
  nx = Math.max(0, Math.min(dr.width - dragging.offsetWidth, nx));
  ny = Math.max(0, Math.min(dr.height - 50, ny));
  dragging.style.left = nx + "px";
  dragging.style.top = ny + "px";
});
document.addEventListener("mouseup", () => { dragging = null; });

/* ============================ Token Vault ============================ */

function renderVault() {
  const keys = loadKeys();
  const models = loadModels();
  const order = loadOrder();
  const list = $("#vault-list");
  list.innerHTML = "";

  order.forEach((id, index) => {
    const provider = getProvider(id);
    if (!provider) return;
    const configured = Boolean((keys[id] || "").trim());

    const row = el("div", { className: "vault-card" });

    const head = el("div", { className: "vault-card-head" });
    head.append(
      el("div", { className: "vault-rank", title: "Failover priority" }, String(index + 1)),
      el("div", { className: "vault-title" },
        el("span", { className: "vault-name" }, provider.label),
        el("span", { className: `status-dot ${configured ? "on" : "off"}`, title: configured ? "Key set" : "No key" })
      )
    );
    const moveBox = el("div", { className: "vault-move" });
    const up = el("button", { className: "icon-btn", title: "Higher priority", textContent: "▲", disabled: index === 0 });
    const down = el("button", { className: "icon-btn", title: "Lower priority", textContent: "▼", disabled: index === order.length - 1 });
    up.onclick = () => moveProvider(id, -1);
    down.onclick = () => moveProvider(id, 1);
    moveBox.append(up, down);
    head.append(moveBox);
    row.append(head);

    row.append(
      el("div", { className: "vault-note" }, provider.note + " "),
      el("a", { className: "vault-link", href: provider.signupUrl, target: "_blank", rel: "noopener", textContent: "Get a free key ↗" })
    );

    const keyWrap = el("div", { className: "field" });
    const input = el("input", {
      type: "password", placeholder: `${provider.keyName} …`,
      value: keys[id] || "", autocomplete: "off", spellcheck: false,
    });
    input.oninput = () => input.classList.remove("saved");
    const reveal = el("button", { className: "icon-btn", title: "Show / hide", textContent: "👁" });
    reveal.onclick = () => { input.type = input.type === "password" ? "text" : "password"; };
    keyWrap.append(input, reveal);
    row.append(keyWrap);

    const modelSel = el("select");
    provider.models.forEach((m) => modelSel.append(el("option", { value: m, textContent: m, selected: (models[id] || provider.models[0]) === m })));
    modelSel.onchange = () => { const mm = loadModels(); mm[id] = modelSel.value; saveModels(mm); };
    row.append(el("label", { className: "model-label" }, "Model", modelSel));

    const actions = el("div", { className: "vault-actions" });
    const save = el("button", { className: "btn small primary", textContent: "Save key" });
    save.onclick = () => {
      const k = loadKeys();
      k[id] = input.value.trim();
      saveKeys(k);
      input.classList.add("saved");
      flash(`${provider.label} key saved locally 💾`);
      renderVault();
      updateProviderHint();
    };
    const clear = el("button", { className: "btn small", textContent: "Clear" });
    clear.onclick = () => {
      const k = loadKeys();
      delete k[id];
      saveKeys(k);
      flash(`${provider.label} key cleared`);
      renderVault();
      updateProviderHint();
    };
    actions.append(save, clear);
    row.append(actions);

    list.append(row);
  });
}

function moveProvider(id, dir) {
  const order = loadOrder();
  const i = order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  saveOrder(order);
  renderVault();
  updateProviderHint();
}

function updateProviderHint() {
  const order = loadOrder();
  const active = order.filter((id) => hasKey(id)).map((id) => getProvider(id)?.label);
  const hint = $("#active-providers");
  if (active.length === 0) {
    hint.innerHTML = `⚠️ No keys yet — open the <b>🔑 Token Vault</b> and add a free key.`;
    hint.className = "providers-hint warn";
  } else {
    hint.innerHTML = `✨ Failover: ${active.map((n, i) => `${i + 1}. ${n}`).join("  →  ")}`;
    hint.className = "providers-hint";
  }
}

/* ============================ Pipeline ============================ */

function logAttempt({ provider, status, detail }) {
  const map = {
    trying: ["…", `> trying ${provider.label} (${detail})`],
    success: ["✓", `> ${provider.label} responded`],
    skipped: ["–", `> ${provider.label} skipped: ${detail}`],
    rate_limited: ["⏭", `> ${provider.label} rate-limited — failing over`],
    failed: ["✕", `> ${provider.label} failed: ${detail}`],
  };
  const [icon, text] = map[status] || ["•", `> ${provider.label}: ${status}`];
  const line = el("div", { className: `log-line ${status}` }, el("span", { className: "log-icon" }, icon), el("span", {}, text));
  $("#run-log").append(line);
  $("#run-log").scrollTop = $("#run-log").scrollHeight;
}

async function runPrompt() {
  const prompt = $("#prompt").value.trim();
  if (!prompt) { flash("Enter a prompt first 🌷"); return; }

  const order = loadOrder();
  if (!order.some((id) => hasKey(id))) {
    flash("Add a key in the Token Vault 🔑");
    openWin("vault");
    return;
  }

  const runBtn = $("#run-btn");
  runBtn.disabled = true;
  runBtn.textContent = "Running…";
  $("#run-log").innerHTML = "";
  $("#output").textContent = "";
  $("#output-provider").textContent = "";
  $("#result-box").style.display = "block";

  runController = new AbortController();
  const messages = [
    { role: "system", content: $("#system").value.trim() || "You are a helpful assistant." },
    { role: "user", content: prompt },
  ];

  try {
    const { text, provider } = await runPipeline({ messages, onAttempt: logAttempt, signal: runController.signal });
    $("#output").textContent = text;
    $("#output-provider").textContent = `via ${provider.label}`;
  } catch (err) {
    if (err.name === "AbortError") {
      flash("Run cancelled");
    } else {
      $("#output").textContent = "";
      $("#output").append(el("div", { className: "error-box" }, err.message));
    }
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "▶ Run pipeline";
    runController = null;
  }
}

/* ============================ Helpers ============================ */

let flashTimer = null;
function flash(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function updateClock() {
  const now = new Date();
  $("#clock").textContent =
    now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
}

function toggleStart() { $("#start-menu").classList.toggle("open"); }

/* ============================ Init ============================ */

function init() {
  renderVault();
  updateProviderHint();

  // Open/close/min/drag/focus wiring via data-attributes
  $$("[data-open]").forEach((node) => {
    const id = node.getAttribute("data-open");
    const handler = () => { openWin(id); $("#start-menu").classList.remove("open"); };
    if (node.classList.contains("desktop-icon")) node.addEventListener("dblclick", handler);
    else node.addEventListener("click", handler);
  });
  $$("[data-close]").forEach((n) => n.addEventListener("click", (e) => { e.stopPropagation(); closeWin(n.getAttribute("data-close")); }));
  $$("[data-min]").forEach((n) => n.addEventListener("click", (e) => { e.stopPropagation(); toggleMin(n.getAttribute("data-min")); }));
  $$("[data-drag]").forEach((n) => {
    const id = n.getAttribute("data-drag");
    n.addEventListener("mousedown", (e) => startDrag(e, id));
  });
  $$(".win").forEach((w) => w.addEventListener("mousedown", () => focusWin(w.id.replace("win-", ""))));

  $("#run-btn").onclick = runPrompt;
  $("#cancel-btn").onclick = () => runController?.abort();
  $("#clear-all").onclick = () => {
    if (confirm("Remove all saved keys and settings from this browser?")) {
      clearAll();
      renderVault();
      updateProviderHint();
      flash("Vault cleared 🗑");
    }
  };
  $("#prompt").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runPrompt();
  });

  // Start menu
  $("#start-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleStart(); });
  $("#desktop").addEventListener("click", (e) => {
    if (!e.target.closest("#start-btn") && !e.target.closest("#start-menu"))
      $("#start-menu").classList.remove("open");
  });

  updateClock();
  setInterval(updateClock, 1000);
  updateTaskbar();

  // Open the main window by default
  openWin("blossom");
}

document.addEventListener("DOMContentLoaded", init);
