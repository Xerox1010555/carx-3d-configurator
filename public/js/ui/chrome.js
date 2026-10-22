/** CARX — page chrome: nav, menu, theme, language, cursor, preloader, reveals, offline. */

import { $, $$, elNew } from "../core/utils.js";
import { state, savePrefs, on } from "../core/state.js";
import { applyLang, toggleLang, t } from "../core/i18n.js";
import { applyThemeToScene, G } from "../three/stage.js";
import { scrollSec } from "../three/choreography.js";
import { toast } from "./toast.js";

/* ---------- theme ---------- */
export function applyThemeGlobal(th) {
  state.prefs.theme = th === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = state.prefs.theme;
  savePrefs();
  if (G.ready) applyThemeToScene(state.prefs.theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", state.prefs.theme === "light" ? "#f5f3f0" : "#060809");
}

/* ---------- custom cursor ---------- */
function initCursor() {
  if (!window.matchMedia("(pointer:fine)").matches) return;
  const dot = $(".cur"), ring = $(".cur-ring");
  if (!dot || !ring) return;
  document.body.classList.add("has-cursor");
  let x = -100, y = -100, rx = -100, ry = -100;
  document.addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    const hot = !!(e.target.closest && e.target.closest("button,a,.chip,.c-card,.c-add"));
    document.body.classList.toggle("cur-hot", hot);
  }, { passive: true });
  (function loop() {
    requestAnimationFrame(loop);
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
  })();
}

/* ---------- reveals ---------- */
export function initReveals() {
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { threshold: 0.12 });
  $$(".rv").forEach((n) => io.observe(n));
}

/* ---------- preloader with REAL progress ---------- */
const progress = { assets: 0, ready: false };

export function setAssetProgress(p) { progress.assets = Math.max(progress.assets, Math.min(1, p)); }
export function markReady() { progress.ready = true; }

export function runPreloader() {
  const pl = $("#pl"), bar = $("#plBar"), num = $("#plNum");
  if (!pl) return;
  const t0 = performance.now();
  const tick = () => {
    const elapsed = performance.now() - t0;
    // real progress: asset loading dominates; time cap only for min display
    const byAssets = 12 + progress.assets * 88;
    const byTime = Math.min(96, elapsed / 18);
    let p = progress.ready ? 100 : Math.min(byAssets, byTime, 96);
    if (bar) bar.style.width = p + "%";
    if (num) num.textContent = Math.round(p) + "%";
    if (p >= 100 && elapsed > 650) {
      pl.classList.add("pl-out");
      setTimeout(() => pl.remove(), 800);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- chrome bindings ---------- */
export function bindChrome() {
  // anchor navigation (nav links + menu links + footer links)
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href^='#']");
    if (!a) return;
    const id = (a.getAttribute("href") || "").slice(1);
    if (!id) return;
    e.preventDefault();
    menuClose();
    scrollSec(id);
  });

  // CTA buttons
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-goto],[data-scrollto]");
    if (!b) return;
    e.preventDefault();
    scrollSec(b.getAttribute("data-goto") || b.getAttribute("data-scrollto"));
  });

  // theme
  const toggle = () => { applyThemeGlobal(state.prefs.theme === "dark" ? "light" : "dark"); toast(t("themeL")); };
  $("#themeBtn")?.addEventListener("click", toggle);
  $("#menuTheme")?.addEventListener("click", toggle);

  // language
  $("#langSel")?.addEventListener("change", (e) => { toggleLang(); e.target.value = state.prefs.lang; });
  $("#menuLang")?.addEventListener("click", () => toggleLang());
  document.addEventListener("carx:lang", () => {
    // re-render dynamic surfaces after language switch
    document.dispatchEvent(new CustomEvent("carx:rerender"));
  });

  // burger menu
  $("#burger")?.addEventListener("click", () => menuOpen());
  $("#scrim")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("carx:closeOverlays"));
    menuClose();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { menuClose(); document.dispatchEvent(new CustomEvent("carx:closeOverlays")); }
  });

  initCursor();
}

export function menuOpen() {
  const mn = $("#menu");
  if (mn) { mn.hidden = false; requestAnimationFrame(() => mn.classList.add("open")); }
}

export function menuClose() {
  const mn = $("#menu");
  if (mn && !mn.hidden) {
    mn.classList.remove("open");
    setTimeout(() => { if (!mn.classList.contains("open")) mn.hidden = true; }, 320);
  }
}

/* ---------- offline awareness ---------- */
export function initOffline() {
  const update = () => {
    state.online = navigator.onLine;
    let banner = $(".offline-banner");
    if (!state.online && !banner) {
      banner = elNew("div", "offline-banner", t("offline"));
      document.body.appendChild(banner);
    } else if (state.online && banner) {
      banner.remove();
    }
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

/* ---------- service worker ---------- */
export function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  const doRegister = () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline-first is best-effort */ });
  };
  // boot() may reach this point after the load event already fired (catalog fetch awaits),
  // so register immediately when the document is already complete.
  if (document.readyState === "complete") doRegister();
  else window.addEventListener("load", doRegister, { once: true });
}

export { applyLang };
export const _on = on;
