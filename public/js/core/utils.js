/** CARX — tiny DOM/util helpers. */

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

export function elNew(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC_MAP[c]);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

export const rafThrottle = (fn) => {
  let queued = false, lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
  };
};

export const hex2css = (h) => {
  if (typeof h === "number") return "#" + h.toString(16).padStart(6, "0");
  return String(h || "#888");
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Number formatting per locale (Latin or Arabic-Indic digits). */
export function fmtNum(n, lang, digits = 0) {
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}
