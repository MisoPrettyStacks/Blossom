// Blossom 🌸 — Pipeline Builder engine
//
// A pipeline is an ordered list of steps. Each step receives the previous
// step's output as `input` and produces a new output. Steps can be:
//   - ai   : run a prompt through the free-tier failover chain
//   - http : make an HTTP request
//   - code : run JavaScript in the sandbox
//
// String fields support {{SECRET_NAME}} injection from the encrypted secrets
// vault and {{input}} for the previous step's output.
//
// Pipelines are stored (without secret values) in localStorage and can be run
// on demand or on a repeating schedule while the tab is open.

import { runPipeline } from "./pipeline.js";
import { runCode } from "./runner.js";
import { injectSecrets, snapshot } from "./secrets.js";

const STORAGE = "blossom.pipelines";

export function loadPipelines() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE)) || {};
  } catch {
    return {};
  }
}

export function savePipelines(map) {
  localStorage.setItem(STORAGE, JSON.stringify(map));
}

export function getPipeline(id) {
  return loadPipelines()[id] || null;
}

export function upsertPipeline(pipeline) {
  const map = loadPipelines();
  map[pipeline.id] = pipeline;
  savePipelines(map);
}

export function deletePipeline(id) {
  const map = loadPipelines();
  delete map[id];
  savePipelines(map);
}

export function uid(prefix = "p") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

export function newPipeline(name = "Untitled pipeline") {
  return {
    id: uid("pipe"),
    name,
    schedule: { enabled: false, intervalSec: 300 },
    steps: [newStep("ai")],
  };
}

export function newStep(type = "ai") {
  const base = { id: uid("step"), type, name: "", retries: 0 };
  if (type === "ai") return { ...base, config: { prompt: "{{input}}" } };
  if (type === "http") return { ...base, config: { method: "GET", url: "", headers: "", body: "" } };
  if (type === "code") return { ...base, config: { code: "// `input` = previous output, `secrets` = your vault\nreturn input;" } };
  return base;
}

// Replace {{input}} then {{SECRET}} tokens.
function fill(text, input) {
  if (typeof text !== "string") return text;
  const withInput = text.replace(/\{\{\s*input\s*\}\}/g, input == null ? "" : String(input));
  return injectSecrets(withInput);
}

async function runStep(step, input, signal) {
  if (step.type === "ai") {
    const prompt = fill(step.config.prompt || "", input);
    const messages = [{ role: "user", content: prompt }];
    const { text, provider } = await runPipeline({ messages, signal });
    return { output: text, meta: `via ${provider.label}` };
  }

  if (step.type === "http") {
    const url = fill(step.config.url || "", input).trim();
    if (!url) throw new Error("HTTP step has no URL");
    const method = (step.config.method || "GET").toUpperCase();
    let headers = {};
    const rawHeaders = fill(step.config.headers || "", input).trim();
    if (rawHeaders) {
      try { headers = JSON.parse(rawHeaders); }
      catch { throw new Error("HTTP headers must be valid JSON"); }
    }
    const init = { method, headers, signal };
    if (method !== "GET" && method !== "HEAD") {
      const body = fill(step.config.body || "", input);
      if (body) init.body = body;
    }
    const res = await fetch(url, init);
    const textBody = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${textBody.slice(0, 200)}`);
    return { output: textBody, meta: `HTTP ${res.status}` };
  }

  if (step.type === "code") {
    const { logs, result, error } = await runCode({
      code: step.config.code || "", input, secrets: snapshot(),
    });
    if (error) throw new Error(error);
    const logText = logs.map((l) => `[${l.level}] ${l.text}`).join("\n");
    return { output: result, meta: logText };
  }

  throw new Error(`Unknown step type: ${step.type}`);
}

// Run a whole pipeline. onStep({ index, step, status, detail, output }).
// status: "running" | "ok" | "error".
export async function runFlow(pipeline, { onStep, signal } = {}) {
  let input = null;
  const outputs = [];
  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];
    onStep?.({ index: i, step, status: "running" });
    const maxTries = (step.retries || 0) + 1;
    let lastErr = null;
    let done = false;
    for (let attempt = 1; attempt <= maxTries && !done; attempt++) {
      try {
        const { output, meta } = await runStep(step, input, signal);
        input = output;
        outputs.push(output);
        onStep?.({ index: i, step, status: "ok", detail: meta, output });
        done = true;
      } catch (err) {
        if (err.name === "AbortError") throw err;
        lastErr = err;
        if (attempt < maxTries) {
          onStep?.({ index: i, step, status: "running", detail: `retry ${attempt}/${maxTries - 1}: ${err.message}` });
        }
      }
    }
    if (!done) {
      onStep?.({ index: i, step, status: "error", detail: lastErr?.message || "failed" });
      throw new Error(`Step ${i + 1} (${step.type}) failed: ${lastErr?.message || "unknown error"}`);
    }
  }
  return { outputs, finalOutput: input };
}

/* ===== Scheduling (runs while the tab is open) ===== */

const timers = new Map(); // pipelineId → intervalId

export function isScheduled(id) {
  return timers.has(id);
}

export function startSchedule(pipeline, tick) {
  stopSchedule(pipeline.id);
  const ms = Math.max(5, pipeline.schedule?.intervalSec || 300) * 1000;
  const handle = setInterval(() => tick(pipeline), ms);
  timers.set(pipeline.id, handle);
}

export function stopSchedule(id) {
  const handle = timers.get(id);
  if (handle) { clearInterval(handle); timers.delete(id); }
}
