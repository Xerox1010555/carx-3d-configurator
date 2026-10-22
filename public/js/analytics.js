/** CARX — privacy-light analytics: choice heatmap events, no PII, no fingerprints. */

import { state } from "./core/state.js";
import { report } from "./core/errors.js";

const queue = [];
let flushTimer = null;

export function track(kind, id) {
  queue.push({ kind, id: String(id || "").slice(0, 40), lang: state.prefs.lang });
  if (queue.length >= 5) flush();
  else if (!flushTimer) flushTimer = setTimeout(flush, 4000);
}

function flush() {
  clearTimeout(flushTimer);
  flushTimer = null;
  while (queue.length) {
    const ev = queue.shift();
    try {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ev),
        keepalive: true,
      }).catch(() => {});
    } catch (e) { report("analytics", e); }
  }
}

document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
