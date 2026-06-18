// Blossom 🌸 — UI wiring
import { PROVIDERS, getProvider } from "./providers.js";
import {
  loadKeys, saveKeys, loadOrder, saveOrder,
  loadModels, saveModels, getModel, clearAll, hasKey,
} from "./vault.js";
import { runPipeline } from "./pipeline.js";

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) node.append(c);
  return node;
};

let runController = null;

/* ---------------------------- Token Vault UI ---------------------------- */

function renderVault() {
  const keys = loadKeys();
  const models = loadModels();
  const order = loadOrder();
  const list = $("#vault-list");
  list.innerHTML = "";

  // Render rows in failover order so reordering is intuitive.
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
    up.onclick = () => { moveProvider(id, -1); };
    down.onclick = () => { moveProvider(id, 1); };
    moveBox.append(up, down);
    head.append(moveBox);
    row.append(head);

    row.append(el("div", { className: "vault-note" }, provider.note + " "),
      el("a", { className: "vault-link", href: provider.signupUrl, target: "_blank", rel: "noopener",
        textContent: "Get a free key ↗" }));

    // Key input
    const keyWrap = el("div", { className: "field" });
    const input = el("input", {
      type: "password", className: "key-input", placeholder: `${provider.keyName} …`,
      value: keys[id] || "", autocomplete: "off", spellcheck: false,
    });
    input.oninput = () => { input.classList.remove("saved"); };
    const reveal = el("button", { className: "icon-btn", title: "Show / hide", textContent: "👁" });
    reveal.onclick = () => { input.type = input.type === "password" ? "text" : "password"; };
    keyWrap.append(input, reveal);
    row.append(keyWrap);

    // Model select
    const modelSel = el("select", { className: "model-select" });
    provider.models.forEach((m) => modelSel.append(el("option", { value: m, textContent: m, selected: (models[id] || provider.models[0]) === m })));
    modelSel.onchange = () => { const mm = loadModels(); mm[id] = modelSel.value; saveModels(mm); };
    row.append(el("label", { className: "model-label" }, "Model", modelSel));

    // Save / clear
    const actions = el("div", { className: "vault-actions" });
    const save = el("button", { className: "btn small", textContent: "Save key" });
    save.onclick = () => {
      const k = loadKeys();
      k[id] = input.value.trim();
      saveKeys(k);
      input.classList.add("saved");
      flash(`${provider.label} key saved locally`);
      renderVault();
      updateProviderHint();
    };
    const clear = el("button", { className: "btn small ghost", textContent: "Clear" });
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
    hint.innerHTML = `⚠️ No keys set yet — open the <b>Token Vault</b> and add at least one free key.`;
    hint.className = "providers-hint warn";
  } else {
    hint.innerHTML = `Failover order: ${active.map((n, i) => `${i + 1}. ${n}`).join("  →  ")}`;
    hint.className = "providers-hint";
  }
}

/* ----------------------------- Pipeline UI ----------------------------- */

function logAttempt({ provider, status, detail }) {
  const map = {
    trying: ["…", `Trying ${provider.label} (${detail})`],
    success: ["✓", `${provider.label} responded`],
    skipped: ["–", `${provider.label} skipped: ${detail}`],
    rate_limited: ["⏭", `${provider.label} rate-limited — failing over`],
    failed: ["✕", `${provider.label} failed: ${detail}`],
  };
  const [icon, text] = map[status] || ["•", `${provider.label}: ${status}`];
  const line = el("div", { className: `log-line ${status}` }, el("span", { className: "log-icon" }, icon), el("span", {}, text));
  $("#run-log").append(line);
  $("#run-log").scrollTop = $("#run-log").scrollHeight;
}

async function runPrompt() {
  const promptEl = $("#prompt");
  const prompt = promptEl.value.trim();
  if (!prompt) { flash("Enter a prompt first"); return; }

  const order = loadOrder();
  if (!order.some((id) => hasKey(id))) {
    flash("Add at least one API key in the Token Vault");
    openVault();
    return;
  }

  const runBtn = $("#run-btn");
  runBtn.disabled = true;
  runBtn.textContent = "Running…";
  $("#run-log").innerHTML = "";
  $("#output").textContent = "";
  $("#output-card").classList.remove("hidden");

  runController = new AbortController();
  const messages = [
    { role: "system", content: $("#system").value.trim() || "You are a helpful assistant." },
    { role: "user", content: prompt },
  ];

  try {
    const { text, provider } = await runPipeline({ messages, onAttempt: logAttempt, signal: runController.signal });
    $("#output").textContent = text;
    $("#output-provider").textContent = `Answered by ${provider.label}`;
  } catch (err) {
    if (err.name === "AbortError") {
      flash("Run cancelled");
    } else {
      $("#output").textContent = "";
      $("#output-provider").textContent = "";
      const msg = el("div", { className: "error-box" }, err.message);
      $("#output").append(msg);
    }
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "Run pipeline";
    runController = null;
  }
}

/* ------------------------------ Helpers -------------------------------- */

let flashTimer = null;
function flash(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function openVault() { $("#vault-panel").classList.add("open"); $("#overlay").classList.add("show"); }
function closeVault() { $("#vault-panel").classList.remove("open"); $("#overlay").classList.remove("show"); }

/* ------------------------------- Init ---------------------------------- */

function init() {
  renderVault();
  updateProviderHint();

  $("#open-vault").onclick = openVault;
  $("#close-vault").onclick = closeVault;
  $("#overlay").onclick = closeVault;
  $("#run-btn").onclick = runPrompt;
  $("#cancel-btn").onclick = () => runController?.abort();
  $("#clear-all").onclick = () => {
    if (confirm("Remove all saved keys and settings from this browser?")) {
      clearAll();
      renderVault();
      updateProviderHint();
      flash("Vault cleared");
    }
  };
  $("#prompt").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runPrompt();
  });

  $("#year").textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", init);
