// Blossom 🌸 — Sandboxed code runner
//
// Runs user JavaScript inside a sandboxed <iframe> (sandbox="allow-scripts",
// no same-origin) so it cannot touch the Blossom page, localStorage, or your
// secrets store. The code receives an `input` value and a read-only `secrets`
// object, can use async/await and fetch, and we capture its console output
// and return value.

const RUNNER_SRCDOC = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script>
(function () {
  function serialize(value) {
    if (typeof value === "string") return value;
    if (value === undefined) return "undefined";
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }
  window.addEventListener("message", async function (e) {
    var data = e.data || {};
    if (data.type !== "blossom-run") return;
    var logs = [];
    var origin = e.origin;
    var src = e.source;
    ["log", "info", "warn", "error"].forEach(function (level) {
      console[level] = function () {
        logs.push({ level: level, text: Array.prototype.map.call(arguments, serialize).join(" ") });
      };
    });
    var result, error = null;
    try {
      var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      var fn = new AsyncFunction("input", "secrets", data.code);
      result = await fn(data.input, data.secrets || {});
    } catch (err) {
      error = (err && err.stack) ? err.stack : String(err);
    }
    src.postMessage({
      type: "blossom-result", id: data.id,
      logs: logs, result: serialize(result), error: error,
    }, origin === "null" ? "*" : origin);
  });
})();
<\/script>
</body></html>`;

let frame = null;
let framePromise = null;

function getFrame() {
  if (framePromise) return framePromise;
  framePromise = new Promise((resolve) => {
    frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.style.display = "none";
    frame.srcdoc = RUNNER_SRCDOC;
    frame.onload = () => resolve(frame);
    document.body.appendChild(frame);
  });
  return framePromise;
}

let nextId = 1;

// Run JS code in the sandbox.
//   { code, input, secrets, timeout }
// Returns { logs: [{level,text}], result: string, error: string|null }.
export async function runCode({ code, input = null, secrets = {}, timeout = 15000 } = {}) {
  const f = await getFrame();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error(`Code timed out after ${timeout / 1000}s`));
    }, timeout);

    function onMessage(e) {
      const data = e.data || {};
      if (data.type !== "blossom-result" || data.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve({ logs: data.logs || [], result: data.result, error: data.error });
    }

    window.addEventListener("message", onMessage);
    f.contentWindow.postMessage({ type: "blossom-run", id, code, input, secrets }, "*");
  });
}
