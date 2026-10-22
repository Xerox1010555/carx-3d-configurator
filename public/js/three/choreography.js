/** CARX — scroll choreography: 8 section poses, story steps, rail, nav state. */

import { view, G } from "./stage.js";
import { applyReveal } from "./car.js";
import { clamp, lerp } from "../core/utils.js";

const POSES = [
  { id: "hero",         x: 0.95, ry: -0.55, rx: -0.02, dist: 8.3, y: -0.62 },
  { id: "story",        x: 0.0,  ry: 2.9,   rx: -0.3,  dist: 6.9, y: -0.35 },
  { id: "collection",   x: -1.05, ry: 0.55, rx: -0.02, dist: 8.9, y: -0.6 },
  { id: "configurator", x: -0.9, ry: 0.35,  rx: 0.0,   dist: 8.3, y: -0.66 },
  { id: "performance",  x: 0.6,  ry: 4.9,   rx: -0.08, dist: 9.0, y: -0.6 },
  { id: "engineering",  x: 0.8,  ry: 5.7,   rx: -0.95, dist: 8.6, y: -0.45 },
  { id: "showrooms",    x: -0.8, ry: 6.9,   rx: -0.05, dist: 9.2, y: -0.6 },
  { id: "newsletter",   x: 0.0,  ry: 7.45,  rx: -0.02, dist: 10.2, y: -0.5 },
];

let cKeys = [];
let storyEl = null, storySteps = [], coEls = [], railDots = [], navEl = null, lastStoryStep = -1;

export function initChoreography() {
  storyEl = document.getElementById("story");
  storySteps = Array.from(document.querySelectorAll(".story-step"));
  coEls = Array.from(document.querySelectorAll(".co"));
  railDots = Array.from(document.querySelectorAll("#rail .rail-dot"));
  navEl = document.getElementById("nav");
  layoutKeys();
  window.addEventListener("resize", layoutKeys);
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
}

function mixPose(i, p) {
  const A = POSES[Math.max(0, i - 1)] || POSES[0];
  const B = POSES[i] || POSES[0];
  view.xT = lerp(A.x, B.x, p);
  view.yT = lerp(A.y, B.y, p);
  view.ryT = lerp(A.ry, B.ry, p);
  view.rxT = lerp(A.rx, B.rx, p);
  view.distT = lerp(A.dist, B.dist, p);
}

let fallbackTimer = null;

/** Called every frame when WebGL is on; or on a light timer when it is not. */
export function scrollLogic() {
  const sc = window.scrollY || 0;

  // pose interpolation
  if (G.ready && cKeys.length) {
    let idx = 0, p = 0;
    for (let i = 0; i < cKeys.length; i++) {
      const k = cKeys[i];
      if (sc >= k.a) {
        idx = i;
        p = clamp((sc - k.a) / Math.max(1, k.b - k.a), 0, 1);
      }
    }
    const eased = p * p * (3 - 2 * p);
    mixPose(idx, eased);
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

  // nav solid
  if (navEl) navEl.classList.toggle("solid", sc > 34);
}

/** Fallback poller used only when WebGL is unavailable (no rAF loop exists). */
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
