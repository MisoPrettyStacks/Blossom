// Blossom 🌸 — Y2K desktop UI wiring
import { getProvider } from "./providers.js";
import {
  loadKeys, saveKeys, loadOrder, saveOrder,
  loadModels, saveModels, clearAll, hasKey,
} from "./vault.js";
import { runPipeline } from "./pipeline.js";
import { runCode } from "./runner.js";
import * as secretsStore from "./secrets.js";
import * as pipes from "./pipelines.js";
import * as deploy from "./deploy.js";

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
  editor: "💻 Code Editor",
  pipelines: "🔁 Pipelines",
  secrets: "🗝️ Secrets",
  vault: "🔑 Token Vault",
  deploy: "🚀 Deploy",
  howto: "📖 How To",
  about: "💖 About",
};

// Lazy render/init hooks fired the first (and every) time a window opens.
const ON_OPEN = {
  editor: initCodeEditor,
  secrets: renderSecrets,
  pipelines: () => { refreshPipelineSelect(); renderPipelineEditor(); },
  deploy: refreshDeploySelect,
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
  ON_OPEN[id]?.();
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

/* ============================ Code Editor ============================ */

let cmEditor = null;

function initCodeEditor() {
  const ta = $("#code-area");
  if (cmEditor || !ta) return;
  if (window.CodeMirror) {
    cmEditor = window.CodeMirror.fromTextArea(ta, {
      mode: "javascript", lineNumbers: true, tabSize: 2, lineWrapping: true,
    });
    cmEditor.setSize("100%", 240);
  }
}
function editorValue() { return cmEditor ? cmEditor.getValue() : $("#code-area").value; }
function setEditorMode(lang) { if (cmEditor) cmEditor.setOption("mode", lang); }

async function runCodeEditor() {
  if ($("#editor-lang").value !== "javascript") {
    flash("Only JavaScript runs in-browser 🌷");
    return;
  }
  const consoleBox = $("#code-console");
  consoleBox.style.display = "block";
  consoleBox.innerHTML = "";
  $("#code-output").textContent = "";
  const btn = $("#code-run");
  btn.disabled = true; btn.textContent = "Running…";
  try {
    const { logs, result, error } = await runCode({
      code: editorValue(), secrets: secretsStore.snapshot(),
    });
    logs.forEach((l) =>
      consoleBox.append(el("div", { className: `log-line ${l.level === "error" || l.level === "warn" ? "failed" : "success"}` },
        el("span", { className: "log-icon" }, "›"), el("span", {}, `[${l.level}] ${l.text}`)))
    );
    if (!logs.length) consoleBox.append(el("div", { className: "log-line skipped" }, "(no console output)"));
    if (error) $("#code-output").append(el("div", { className: "error-box" }, error));
    else $("#code-output").textContent = result;
  } catch (e) {
    $("#code-output").append(el("div", { className: "error-box" }, e.message));
  } finally {
    btn.disabled = false; btn.textContent = "▶ Run code";
  }
}

/* ============================ Secrets Manager ============================ */

function renderSecrets() {
  const body = $("#secrets-body");
  body.innerHTML = "";
  if (!secretsStore.vaultExists()) body.append(secretsCreateForm());
  else if (!secretsStore.isUnlocked()) body.append(secretsUnlockForm());
  else body.append(secretsPanel());
}

function secretsCreateForm() {
  const box = el("div", { className: "secrets-gate" });
  box.append(el("label", { className: "field-label", style: "margin-top:0;" }, "Create a master passphrase"));
  const pass = el("input", { type: "password", placeholder: "Master passphrase", autocomplete: "new-password" });
  const confirm = el("input", { type: "password", placeholder: "Confirm passphrase", autocomplete: "new-password", style: "margin-top:6px;" });
  const btn = el("button", { className: "btn small primary", textContent: "🔐 Create vault", style: "margin-top:10px;" });
  btn.onclick = async () => {
    if (pass.value.length < 6) { flash("Use at least 6 characters 🌷"); return; }
    if (pass.value !== confirm.value) { flash("Passphrases don't match"); return; }
    await secretsStore.createVault(pass.value);
    flash("Encrypted vault created 🔐");
    renderSecrets();
  };
  box.append(pass, confirm, btn,
    el("p", { className: "muted", style: "font-size:11px;margin-top:8px;" },
      "⚠️ There's no recovery — if you forget this passphrase, your secrets can't be decrypted."));
  return box;
}

function secretsUnlockForm() {
  const box = el("div", { className: "secrets-gate" });
  box.append(el("label", { className: "field-label", style: "margin-top:0;" }, "Unlock your secrets vault"));
  const pass = el("input", { type: "password", placeholder: "Master passphrase", autocomplete: "current-password" });
  const btn = el("button", { className: "btn small primary", textContent: "🔓 Unlock", style: "margin-top:10px;" });
  const tryUnlock = async () => {
    const ok = await secretsStore.unlock(pass.value);
    if (ok) { flash("Vault unlocked 🔓"); renderSecrets(); }
    else { flash("Wrong passphrase"); pass.value = ""; }
  };
  btn.onclick = tryUnlock;
  pass.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
  const forget = el("button", { className: "btn small", textContent: "🗑 Forget vault", style: "margin-top:10px;margin-left:6px;" });
  forget.onclick = () => {
    if (confirm("Delete the encrypted vault and ALL stored secrets from this device?")) {
      secretsStore.destroyVault();
      flash("Vault deleted");
      renderSecrets();
    }
  };
  box.append(pass, el("div", { className: "run-row" }, btn, forget));
  return box;
}

function secretsPanel() {
  const box = el("div", {});
  const head = el("div", { className: "secrets-head" });
  head.append(el("span", { className: "badge", textContent: "🔓 Unlocked" }));
  const lock = el("button", { className: "btn small", textContent: "🔒 Lock" });
  lock.onclick = () => { secretsStore.lock(); flash("Vault locked"); renderSecrets(); };
  head.append(lock);
  box.append(head);

  // Add form
  box.append(el("label", { className: "field-label" }, "Add a secret"));
  const nameIn = el("input", { type: "text", placeholder: "NAME (e.g. STRIPE_KEY)", spellcheck: false });
  const valIn = el("input", { type: "password", placeholder: "value", style: "margin-top:6px;", autocomplete: "off" });
  const addBtn = el("button", { className: "btn small primary", textContent: "💾 Save secret", style: "margin-top:8px;" });
  addBtn.onclick = async () => {
    const name = nameIn.value.trim().replace(/[^A-Za-z0-9_]/g, "_");
    if (!name) { flash("Give the secret a name"); return; }
    await secretsStore.setSecret(name, valIn.value);
    flash(`${name} encrypted & saved 🔐`);
    renderSecrets();
  };
  box.append(nameIn, valIn, addBtn);

  // List
  const names = secretsStore.listNames();
  box.append(el("label", { className: "field-label" }, `Stored secrets (${names.length})`));
  if (!names.length) {
    box.append(el("p", { className: "muted", style: "font-size:11.5px;" }, "No secrets yet."));
  } else {
    const list = el("div", { className: "secrets-list" });
    names.forEach((name) => list.append(secretRow(name)));
    box.append(list);
  }

  const destroy = el("button", { className: "btn small", textContent: "🗑 Delete vault", style: "margin-top:14px;" });
  destroy.onclick = () => {
    if (confirm("Delete the encrypted vault and ALL secrets from this device?")) {
      secretsStore.destroyVault();
      flash("Vault deleted");
      renderSecrets();
    }
  };
  box.append(destroy);
  return box;
}

function secretRow(name) {
  const row = el("div", { className: "secret-row" });
  row.append(el("span", { className: "secret-name", textContent: name }));
  const val = el("span", { className: "secret-val", textContent: "••••••••" });
  row.append(val);
  let shown = false;
  const reveal = el("button", { className: "icon-btn", title: "Show / hide", textContent: "👁" });
  reveal.onclick = () => { shown = !shown; val.textContent = shown ? secretsStore.getSecret(name) : "••••••••"; };
  const copy = el("button", { className: "icon-btn", title: "Copy", textContent: "📋" });
  copy.onclick = async () => { await navigator.clipboard.writeText(secretsStore.getSecret(name)); flash("Copied 📋"); };
  const del = el("button", { className: "icon-btn", title: "Delete", textContent: "🗑" });
  del.onclick = async () => { await secretsStore.deleteSecret(name); flash(`${name} deleted`); renderSecrets(); };
  row.append(el("div", { className: "vault-move" }, reveal, copy, del));
  return row;
}

/* ============================ Pipeline Builder ============================ */

let currentPipeId = null;
let pipeController = null;

function getCurrent() { return pipes.getPipeline(currentPipeId); }
function saveCurrent(p) { pipes.upsertPipeline(p); }

function refreshPipelineSelect() {
  let map = pipes.loadPipelines();
  if (Object.keys(map).length === 0) {
    const p = pipes.newPipeline("My first pipeline");
    pipes.upsertPipeline(p);
    map = pipes.loadPipelines();
  }
  if (!currentPipeId || !map[currentPipeId]) currentPipeId = Object.keys(map)[0];
  const sel = $("#pipe-select");
  sel.innerHTML = "";
  Object.values(map).forEach((p) =>
    sel.append(el("option", { value: p.id, textContent: p.name, selected: p.id === currentPipeId })));
}

function renderPipelineEditor() {
  const wrap = $("#pipe-editor");
  wrap.innerHTML = "";
  const p = getCurrent();
  if (!p) return;

  wrap.append(el("label", { className: "field-label", style: "margin-top:6px;" }, "Pipeline name"));
  const nameInput = el("input", { type: "text", value: p.name });
  nameInput.onchange = () => {
    p.name = nameInput.value.trim() || "Untitled";
    saveCurrent(p); refreshPipelineSelect(); refreshDeploySelect();
  };
  wrap.append(nameInput);

  const stepsBox = el("div", { className: "steps-box" });
  p.steps.forEach((step, i) => stepsBox.append(renderStepCard(p, step, i)));
  wrap.append(stepsBox);

  // Add step
  const addRow = el("div", { className: "run-row" });
  const addSel = el("select", { style: "width:auto;flex:1;" });
  [["ai", "🤖 AI prompt"], ["http", "🌐 HTTP request"], ["code", "💻 Code"]]
    .forEach(([v, t]) => addSel.append(el("option", { value: v, textContent: t })));
  const addBtn = el("button", { className: "btn small", textContent: "＋ Add step" });
  addBtn.onclick = () => { p.steps.push(pipes.newStep(addSel.value)); saveCurrent(p); renderPipelineEditor(); };
  addRow.append(addSel, addBtn);
  wrap.append(addRow);

  // Run + schedule controls
  const runRow = el("div", { className: "run-row", style: "margin-top:14px;" });
  const runBtn = el("button", { id: "pipe-run", className: "btn primary", textContent: "▶ Run pipeline" });
  runBtn.onclick = runCurrentPipeline;
  const cancelBtn = el("button", { className: "btn small", textContent: "Cancel" });
  cancelBtn.onclick = () => pipeController?.abort();
  runRow.append(runBtn, cancelBtn);
  wrap.append(runRow);

  const schedRow = el("div", { className: "sched-row" });
  const chk = el("input", { type: "checkbox", id: "pipe-sched", checked: pipes.isScheduled(p.id) });
  const interval = el("input", { type: "number", min: "5", value: String(p.schedule?.intervalSec || 300), style: "width:80px;" });
  interval.onchange = () => {
    p.schedule = { ...(p.schedule || {}), intervalSec: Math.max(5, Number(interval.value) || 300) };
    saveCurrent(p);
    if (pipes.isScheduled(p.id)) pipes.startSchedule(p, scheduledTick); // restart with new interval
  };
  chk.onchange = () => {
    p.schedule = { ...(p.schedule || {}), enabled: chk.checked };
    saveCurrent(p);
    if (chk.checked) { pipes.startSchedule(p, scheduledTick); flash(`Scheduled every ${p.schedule.intervalSec}s ⏰`); }
    else { pipes.stopSchedule(p.id); flash("Schedule stopped"); }
  };
  schedRow.append(chk, el("span", {}, "Run automatically every"), interval, el("span", {}, "seconds (while tab open)"));
  wrap.append(schedRow);

  const notifyRow = el("div", { className: "sched-row" });
  const notifyChk = el("input", { type: "checkbox", id: "pipe-notify", checked: !!p.notify });
  notifyChk.onchange = () => {
    p.notify = notifyChk.checked;
    saveCurrent(p);
    if (p.notify && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
  };
  notifyRow.append(notifyChk, el("span", {}, "Notify me when a run fails"));
  wrap.append(notifyRow);

  wrap.append(el("div", { id: "pipe-log", className: "run-log", style: "display:none;margin-top:12px;" }));
  wrap.append(el("label", { className: "field-label" }, "Final output"));
  wrap.append(el("pre", { id: "pipe-output", className: "output" }));
}

function renderStepCard(p, step, i) {
  const card = el("div", { className: "step-card" });
  const head = el("div", { className: "step-head" });
  head.append(el("span", { className: "step-num", textContent: `Step ${i + 1}` }));

  const typeSel = el("select", { style: "width:auto;flex:1;" });
  [["ai", "🤖 AI prompt"], ["http", "🌐 HTTP"], ["code", "💻 Code"]]
    .forEach(([v, t]) => typeSel.append(el("option", { value: v, textContent: t, selected: step.type === v })));
  typeSel.onchange = () => {
    step.type = typeSel.value;
    step.config = pipes.newStep(typeSel.value).config;
    saveCurrent(p); renderPipelineEditor();
  };
  head.append(typeSel);

  const up = el("button", { className: "icon-btn", textContent: "▲", title: "Move up", disabled: i === 0 });
  const down = el("button", { className: "icon-btn", textContent: "▼", title: "Move down", disabled: i === p.steps.length - 1 });
  up.onclick = () => { [p.steps[i - 1], p.steps[i]] = [p.steps[i], p.steps[i - 1]]; saveCurrent(p); renderPipelineEditor(); };
  down.onclick = () => { [p.steps[i + 1], p.steps[i]] = [p.steps[i], p.steps[i + 1]]; saveCurrent(p); renderPipelineEditor(); };
  const del = el("button", { className: "icon-btn", textContent: "🗑", title: "Delete step" });
  del.onclick = () => { p.steps.splice(i, 1); if (!p.steps.length) p.steps.push(pipes.newStep("ai")); saveCurrent(p); renderPipelineEditor(); };
  head.append(el("div", { className: "vault-move" }, up, down, del));
  card.append(head);

  const bindField = (node, key) => {
    const handler = () => { step.config[key] = node.value; saveCurrent(p); };
    node.oninput = handler;
    return node;
  };

  if (step.type === "ai") {
    card.append(el("div", { className: "step-hint" }, "Prompt — use {{input}} for the previous step, {{SECRET}} for vault values."));
    card.append(bindField(el("textarea", { rows: 3, value: step.config.prompt || "" }), "prompt"));
  } else if (step.type === "http") {
    const methodSel = el("select", { style: "width:auto;" });
    ["GET", "POST", "PUT", "PATCH", "DELETE"].forEach((m) =>
      methodSel.append(el("option", { value: m, textContent: m, selected: step.config.method === m })));
    methodSel.onchange = () => { step.config.method = methodSel.value; saveCurrent(p); };
    card.append(el("div", { className: "step-row" }, methodSel, bindField(el("input", { type: "text", placeholder: "https://api.example.com/…", value: step.config.url || "" }), "url")));
    card.append(el("div", { className: "step-hint" }, "Headers (JSON, optional)"));
    card.append(bindField(el("textarea", { rows: 2, placeholder: '{"Authorization":"Bearer {{API_KEY}}"}', value: step.config.headers || "" }), "headers"));
    card.append(el("div", { className: "step-hint" }, "Body (optional)"));
    card.append(bindField(el("textarea", { rows: 2, placeholder: "{{input}}", value: step.config.body || "" }), "body"));
  } else if (step.type === "code") {
    card.append(el("div", { className: "step-hint" }, "JavaScript — `input` = previous output, `secrets` = vault. Return the step's output."));
    card.append(bindField(el("textarea", { rows: 4, className: "code-field", value: step.config.code || "" }), "code"));
  }

  const retryRow = el("div", { className: "step-row" });
  const retryIn = el("input", { type: "number", min: "0", max: "5", value: String(step.retries || 0), style: "width:70px;" });
  retryIn.onchange = () => { step.retries = Math.max(0, Number(retryIn.value) || 0); saveCurrent(p); };
  retryRow.append(el("span", { className: "step-hint", style: "margin:0;" }, "Retries on failure"), retryIn);
  card.append(retryRow);

  card.append(el("div", { className: "step-hint" }, "Run only if (JS, optional) — e.g. input.length > 0. Sees `input` & `secrets`."));
  const condIn = el("input", { type: "text", placeholder: "always runs if blank", value: step.condition || "" });
  condIn.oninput = () => { step.condition = condIn.value; saveCurrent(p); };
  card.append(condIn);
  return card;
}

function logPipeStep({ index, step, status, detail, output }) {
  const log = $("#pipe-log");
  if (!log) return;
  log.style.display = "block";
  const map = {
    running: ["…", `step ${index + 1} (${step.type})${detail ? " — " + detail : ""}`],
    ok: ["✓", `step ${index + 1} ok${detail ? " — " + detail : ""}`],
    skipped: ["↷", `step ${index + 1} skipped — ${detail}`],
    error: ["✕", `step ${index + 1} failed: ${detail}`],
  };
  const [icon, text] = map[status] || ["•", `${status}`];
  const cls = status === "ok" ? "success" : status === "error" ? "failed" : status === "skipped" ? "skipped" : "trying";
  log.append(el("div", { className: `log-line ${cls}` }, el("span", { className: "log-icon" }, icon), el("span", {}, "> " + text)));
  log.scrollTop = log.scrollHeight;
}

async function runCurrentPipeline() {
  const p = getCurrent();
  if (!p) return;
  if (p.steps.some((s) => s.type === "ai") && !loadOrder().some((id) => hasKey(id))) {
    flash("AI steps need a key — opening Token Vault 🔑");
    openWin("vault");
    return;
  }
  const log = $("#pipe-log");
  log.style.display = "block"; log.innerHTML = "";
  $("#pipe-output").textContent = "";
  const btn = $("#pipe-run");
  if (btn) { btn.disabled = true; btn.textContent = "Running…"; }
  pipeController = new AbortController();
  try {
    const { finalOutput } = await pipes.runFlow(p, { onStep: logPipeStep, signal: pipeController.signal });
    $("#pipe-output").textContent = typeof finalOutput === "string" ? finalOutput : JSON.stringify(finalOutput, null, 2);
  } catch (e) {
    if (e.name === "AbortError") flash("Pipeline cancelled");
    else { $("#pipe-output").append(el("div", { className: "error-box" }, e.message)); notifyFailure(p, e); }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "▶ Run pipeline"; }
    pipeController = null;
  }
}

// Background tick for scheduled pipelines.
async function scheduledTick(p) {
  try {
    const { finalOutput } = await pipes.runFlow(p, {});
    flash(`⏰ ${p.name} ran`);
    if (currentPipeId === p.id) {
      const out = $("#pipe-output");
      if (out) out.textContent = typeof finalOutput === "string" ? finalOutput : JSON.stringify(finalOutput, null, 2);
    }
  } catch (e) {
    flash(`⏰ ${p.name} failed: ${e.message}`);
    notifyFailure(p, e);
  }
}

// Failure notification — desktop notification if the user opted in & granted
// permission, otherwise a taskbar flash. Never includes secret values.
function notifyFailure(p, err) {
  if (!p?.notify) return;
  const body = `${p.name} failed: ${err.message}`;
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification("🌸 Blossom pipeline failed", { body }); return; } catch {}
  }
  flash("⚠️ " + body);
}

/* ============================ Deploy & Share ============================ */

function refreshDeploySelect() {
  const map = pipes.loadPipelines();
  const sel = $("#deploy-select");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";
  Object.values(map).forEach((p) =>
    sel.append(el("option", { value: p.id, textContent: p.name, selected: p.id === prev })));
}

function selectedDeployPipeline() {
  const id = $("#deploy-select").value;
  return pipes.getPipeline(id);
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

  // Code editor
  $("#code-run").onclick = runCodeEditor;
  $("#code-clear").onclick = () => {
    $("#code-console").innerHTML = ""; $("#code-console").style.display = "none";
    $("#code-output").textContent = "";
  };
  $("#editor-lang").onchange = (e) => setEditorMode(e.target.value);

  // Pipelines
  $("#pipe-select").onchange = (e) => { currentPipeId = e.target.value; renderPipelineEditor(); };
  $("#pipe-new").onclick = () => {
    const name = prompt("Name this pipeline:", "New pipeline");
    if (name === null) return;
    const p = pipes.newPipeline(name.trim() || "New pipeline");
    pipes.upsertPipeline(p);
    currentPipeId = p.id;
    refreshPipelineSelect(); renderPipelineEditor(); refreshDeploySelect();
  };
  $("#pipe-del").onclick = () => {
    const p = getCurrent();
    if (!p) return;
    if (confirm(`Delete pipeline "${p.name}"?`)) {
      pipes.stopSchedule(p.id);
      pipes.deletePipeline(p.id);
      currentPipeId = null;
      refreshPipelineSelect(); renderPipelineEditor(); refreshDeploySelect();
    }
  };

  // Deploy & share
  $("#deploy-link-btn").onclick = () => {
    const p = selectedDeployPipeline();
    if (!p) return;
    $("#deploy-link").value = deploy.encodeShareLink(p);
    flash("Link ready — copy & share 🔗");
  };
  $("#deploy-copy").onclick = async () => {
    const v = $("#deploy-link").value;
    if (!v) { flash("Make a link first"); return; }
    await navigator.clipboard.writeText(v);
    flash("Copied 📋");
  };
  $("#deploy-standalone").onclick = () => {
    const p = selectedDeployPipeline();
    if (!p) return;
    const safe = p.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    deploy.downloadFile(`${safe}.html`, deploy.buildStandaloneHtml(p), "text/html");
    flash("Standalone HTML downloaded ⬇");
  };
  $("#deploy-json").onclick = () => {
    const p = selectedDeployPipeline();
    if (!p) return;
    const safe = p.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    deploy.downloadFile(`${safe}.json`, JSON.stringify(p, null, 2), "application/json");
    flash("Config exported ⬇");
  };

  // Import a shared pipeline from the URL hash (#p=…)
  const shared = deploy.readShareLink();
  if (shared) {
    shared.id = pipes.uid("pipe");
    shared.name = (shared.name || "Shared pipeline") + " (imported)";
    pipes.upsertPipeline(shared);
    currentPipeId = shared.id;
    deploy.clearShareLink();
    flash("Imported a shared pipeline 🌸");
    openWin("pipelines");
  }

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
