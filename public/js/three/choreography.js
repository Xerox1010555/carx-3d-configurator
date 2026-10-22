/** CARX — scroll choreography: one defined car pose per section + gallery override. */

import { view, G } from "./stage.js";
import { applyReveal } from "./car.js";
import { clamp, lerp } from "../core/utils.js";

/* Every section owns a pose. The car's nose points to −Z, so orbit angle ry means:
   ry 0 = tail, ry π = face, ry π/2 = side profile. tx/ty/tz = lookAt target,
   co = extra camera height, fov = field of view (wider for interior),
   light = cabin light (only the interior pose turns it on). */
const POSES = [
  { id: "hero",         x: 0.95,  ry: 2.45,      rx: -0.02, dist: 8.3, y: -0.62, tx: 0, ty: -0.12, tz: -0.35, co: 0.62, fov: 34, light: 0 },  // front three-quarter
  { id: "story",        x: 0.0,   ry: 2.9,       rx: -0.3,  dist: 6.9, y: -0.35, tx: 0, ty: -0.10, tz: 0,     co: 0.55, fov: 36, light: 0 },  // elevated front, reveal
  { id: "collection",   x: -1.05, ry: Math.PI / 2, rx: -0.02, dist: 9.2, y: -0.55, tx: 0, ty: -0.15, tz: 0,    co: 0.30, fov: 30, light: 0 },  // pure side profile
  { id: "configurator", x: -0.9,  ry: 3.7,       rx: 0.0,   dist: 8.3, y: -0.66, tx: 0, ty: -0.14, tz: -0.2,  co: 0.62, fov: 33, light: 0 },  // front three-quarter, far side
  { id: "gallery",      x: 0.0,   ry: Math.PI,   rx: -0.06, dist: 8.0, y: -0.6,  tx: 0, ty: -0.12, tz: 0,     co: 0.62, fov: 34, light: 0 },  // face-on; gallery module takes over
  { id: "performance",  x: 0.6,   ry: 0.35,      rx: -0.08, dist: 8.6, y: -0.6,  tx: 0, ty: -0.15, tz: 0.6,   co: 0.75, fov: 33, light: 0 },  // the tail / quad exhaust
  { id: "engineering",  x: 0.8,   ry: 5.7,       rx: -1.05, dist: 8.2, y: -0.2,  tx: 0, ty: -0.30, tz: 0,     co: 0.2,  fov: 36, light: 0 },  // top-down blueprint
  { id: "showrooms",    x: -0.8,  ry: -0.7,      rx: -0.05, dist: 9.6, y: -0.55, tx: 0, ty: -0.12, tz: 0.3,   co: 0.55, fov: 32, light: 0 },  // rear three-quarter
  { id: "newsletter",   x: 0.0,   ry: 2.7,       rx: -0.02, dist: 10.6, y: -0.5, tx: 0, ty: -0.12, tz: 0,     co: 0.5,  fov: 30, light: 0 },  // distant front
];

let cKeys = [];
let storyEl = null, storySteps = [], coEls = [], railDots = [], navEl = null, lastStoryStep = -1;
let override = null;          // gallery-owned pose { ry, rx, dist, tx, ty, co, fov, y }

/** When the gallery owns the camera (view pick / 360), scroll stops steering it. */
export function setPoseOverride(pose) { override = pose; }
export const poseOverride = () => override;

export function initChoreography() {
  storyEl = document.getElementById("story");
  storySteps = Array.from(document.querySelectorAll(".story-step"));
  coEls = Array.from(document.querySelectorAll(".co"));
  railDots = Array.from(document.querySelectorAll("#rail .rail-dot"));
  navEl = document.getElementById("nav");
  layoutKeys();
  window.addEventListener("resize", layoutKeys);
  // Section offsets move once fonts/images settle — re-measure so pose keys stay in sync
  window.addEventListener("load", layoutKeys, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutKeys);
  setTimeout(layoutKeys, 1200);
}

export function layoutKeys() {
  cKeys = POSES.map((p, i) => {
    const sec = document.getElementById(p.id);
    const top = sec ? sec.offsetTop : i * 800;
    const enter = sec ? top - window.innerHeight * 0.85 : i * 700;
    const settle = sec
      ? (p.id === "story" ? top + sec.offsetHeight - window.innerHeight : top + window.innerHeight * 0.15)
      : i * 700 + 500;
    return { a: enter, b: settle };
  });
  // Short sections settle past the NEXT section's enter — without this their pose
  // would only ever be a fraction of the blend (e.g. performance never reaches the tail).
  const hold = window.innerHeight * 0.15;
  for (let i = 0; i < cKeys.length - 1; i++) {
    cKeys[i].b = Math.max(cKeys[i].a, Math.min(cKeys[i].b, cKeys[i + 1].a));
    cKeys[i + 1].a = Math.max(cKeys[i + 1].a, cKeys[i].b + hold); // hold each pose briefly
  }
}

function mixPose(A, B, p) {
  view.xTT = lerp(A.x ?? 0, B.x ?? 0, p);
  view.yTT = lerp(A.y ?? -0.6, B.y ?? -0.6, p);
  view.ryT = lerp(A.ry, B.ry, p);
  view.rxT = lerp(A.rx, B.rx, p);
  view.distT = lerp(A.dist, B.dist, p);
  view.txT = lerp(A.tx ?? 0, B.tx ?? 0, p);
  view.tyT = lerp(A.ty ?? -0.12, B.ty ?? -0.12, p);
  view.tzT = lerp(A.tz ?? 0, B.tz ?? 0, p);
  view.camYOffsetT = lerp(A.co ?? 0.62, B.co ?? 0.62, p);
  view.fovT = lerp(A.fov ?? 34, B.fov ?? 34, p);
  view.lightT = lerp(A.light ?? 0, B.light ?? 0, p);
}

function applyPose(p) {
  view.xTT = p.x ?? 0;
  view.yTT = p.y ?? -0.6;
  view.ryT = p.ry;
  view.rxT = p.rx;
  view.distT = p.dist;
  view.txT = p.tx ?? 0;
  view.tyT = p.ty ?? -0.12;
  view.tzT = p.tz ?? 0;
  view.camYOffsetT = p.co ?? 0.62;
  view.fovT = p.fov ?? 34;
  view.lightT = p.light ?? 0;
}

/** The pose POSES holds for a section id (used by the gallery as its base). */
export function poseFor(id) { return POSES.find((p) => p.id === id) || null; }

let lastGalDom = null;
export function scrollLogic() {
  const sc = window.scrollY || 0;

  // is the gallery section the dominant one on screen?
  const gal = document.getElementById("gallery");
  let galleryDominant = false;
  if (gal) {
    const r = gal.getBoundingClientRect();
    galleryDominant = r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight * 0.45;
  }
  if (galleryDominant !== lastGalDom) {
    lastGalDom = galleryDominant;
    document.dispatchEvent(new CustomEvent("carx:galleryDominant", { detail: galleryDominant }));
  }

  if (G.ready && cKeys.length) {
    if (override && galleryDominant) {
      applyPose(override);
    } else {
      let idx = 0, p = 0;
      for (let i = 0; i < cKeys.length; i++) {
        const k = cKeys[i];
        if (sc >= k.a) {
          idx = i;
          p = clamp((sc - k.a) / Math.max(1, k.b - k.a), 0, 1);
        }
      }
      const eased = p * p * (3 - 2 * p);
      const A = POSES[Math.max(0, idx - 1)] || POSES[0];
      const B = POSES[idx] || POSES[0];
      mixPose(A, B, eased);
    }
  }

  // story steps + callouts + reveal float
  if (storyEl) {
    const a = storyEl.offsetTop - window.innerHeight;
    const b = storyEl.offsetTop + storyEl.offsetHeight - window.innerHeight;
    const p = clamp((sc - a) / Math.max(1, b - a), 0, 1);
    const step = clamp(Math.floor(p * 4), 0, 3);
    if (step !== lastStoryStep) {
      lastStoryStep = step;
      storySteps.forEach((n, i) => { n.hidden = i !== step; });
      railDots.forEach((d, i) => d.classList.toggle("on", i === step));
    }
    coEls.forEach((n, i) => n.classList.toggle("in", p > 0.1 + i * 0.2 && p < 0.98));
    if (G.ready) applyReveal(Math.sin(clamp(p, 0, 1) * Math.PI));
  }

  if (navEl) navEl.classList.toggle("solid", sc > 34);
}

/** Fallback poller used only when WebGL is unavailable (no rAF loop exists). */
let fallbackTimer = null;
export function startStaticFallback() {
  if (fallbackTimer) return;
  const tick = () => { scrollLogic(); fallbackTimer = setTimeout(tick, 160); };
  tick();
}

/* smooth anchor scrolling (works with RTL, honors reduced motion) */
export function scrollSec(id) {
  const sec = document.getElementById(id);
  if (!sec) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const y0 = sec.getBoundingClientRect().top + window.scrollY - 40;
  if (reduce) { window.scrollTo(0, y0); return; }
  const s0 = window.scrollY, dy = y0 - s0, t0 = performance.now();
  const dur = clamp(Math.abs(dy) * 0.45, 350, 900);
  const step = (now) => {
    const p = clamp((now - t0) / dur, 0, 1);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    window.scrollTo(0, s0 + dy * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
