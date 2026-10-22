/** CARX — error collector + privacy-light reporting to the studio API. */

export const errs = [];

export function report(scope, err) {
  const msg = `${scope}:${err?.message || err?.type || err || "unknown"}`;
  errs.push({ msg, t: Date.now() });
  if (errs.length > 60) errs.shift();
  console.error("[carx]", msg);
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "client_error", id: msg.slice(0, 40), lang: document.documentElement.lang }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* noop */ }
}

export function installGlobalHandlers() {
  window.addEventListener("error", (e) => report("js", e));
  window.addEventListener("unhandledrejection", (e) => report("promise", e.reason));
}
