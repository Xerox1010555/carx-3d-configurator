/** CARX — the showroom gallery: EXTERIOR/INTERIOR preview modes, 360° turntable,
    measured exterior views + measured cabin views (cockpit + rear bench). */

import { $, esc } from "../core/utils.js";
import { t } from "../core/i18n.js";
import { car } from "../three/car.js";
import { view, G, angleDeg } from "../three/stage.js";
import { setPoseOverride } from "../three/choreography.js";
import { track } from "../analytics.js";

/* Views are measured from the loaded model (car.anchors) so the camera always
   frames the real front / tail / wheel / cabin — never hard-coded guesses.
   The nose points to −Z: ry π sees the face, ry 0 sees the tail, ry ±π/2 the side.
   Every view carries a mode: "ext" (outside the glass) or "int" (inside the cabin). */
function buildViews() {
  const a = car.anchors;
  if (!a) return [];
  const d = a.dir;                      // −1 for this model (nose at −Z)
  const faceRy = d < 0 ? Math.PI : 0;   // camera in front of the nose
  const tailRy = d < 0 ? 0 : Math.PI;   // camera behind the tail
  const cabinRy = d < 0 ? 0 : Math.PI;  // camera in the seat, looking forward at the dash
  const wheelRy = Math.acos(Math.max(-1, Math.min(1, a.frontWheelZ / 2.6))); // camera beside the front wheel
  return [
    {
      id: "front", mode: "ext", labelKey: "gvFront", infoKey: "gvFrontP", specKey: "gvFrontS",
      pose: { x: 0, y: -0.6, ry: faceRy, rx: -0.05, dist: 6.2, tx: 0, ty: -0.15, tz: a.frontZ * 0.5, co: 0.55, fov: 34, light: 0 },
    },
    {
      id: "side", mode: "ext", labelKey: "gvSide", infoKey: "gvSideP", specKey: "gvSideS",
      pose: { x: 0, y: -0.55, ry: Math.PI / 2, rx: -0.02, dist: 9.4, tx: 0, ty: -0.15, tz: 0, co: 0.28, fov: 30, light: 0 },
    },
    {
      id: "rear", mode: "ext", labelKey: "gvRear", infoKey: "gvRearP", specKey: "gvRearS",
      pose: { x: 0, y: -0.6, ry: tailRy, rx: -0.05, dist: 6.4, tx: 0, ty: -0.15, tz: a.rearZ * 0.5, co: 0.55, fov: 34, light: 0 },
    },
    {
      id: "wheel", mode: "ext", labelKey: "gvWheel", infoKey: "gvWheelP", specKey: "gvWheelS",
      pose: { x: 0, y: -0.7, ry: wheelRy, rx: -0.1, dist: 2.6, tx: a.wheelX * 0.9, ty: a.wheelY, tz: a.frontWheelZ, co: 0.25, fov: 40, light: 0 },
    },
    {
      id: "top", mode: "ext", labelKey: "gvTop", infoKey: "gvTopP", specKey: "gvTopS",
      pose: { x: 0, y: -0.3, ry: -0.7, rx: -1.15, dist: 7.6, tx: 0, ty: -0.35, tz: 0, co: 0.1, fov: 36, light: 0 },
    },
    {
      id: "interior", mode: "int", labelKey: "gvInterior", infoKey: "gvInteriorP", specKey: "gvInteriorS",
      // driver POV: eye just ahead of the seat backrest (raycast-verified clear),
      // looking at the cluster/wheel with the lit dash beyond
      pose: { x: -0.3, y: a.cabinY, ry: cabinRy, rx: 0.03, dist: 0.05, tx: -0.05, ty: a.dashY + 0.1, tz: a.dashZ, co: 0.32, fov: 62, light: 1.6 },
    },
    {
      id: "cabin", mode: "int", labelKey: "gvCabin", infoKey: "gvCabinP", specKey: "gvCabinS",
      // rear bench POV: seated behind the driver at the measured seat line,
      // looking forward past the console toward the dash
      pose: { x: -0.28, y: a.cabinY - 0.06, ry: cabinRy, rx: 0.05, dist: 0.55, tx: -0.05, ty: a.dashY + 0.12, tz: a.dashZ, co: 0.3, fov: 66, light: 1.7 },
    },
  ];
}

let views = [];
let activeId = null;
let mode = "ext";       // "ext" | "int" — which side of the glass we preview
let rotating = false;
let degTimer = null;

/* ---------- render ---------- */

export function renderGallery() {
  const box = $("#galViews");
  if (!box) return;
  views = buildViews();
  const shown = views.filter((v) => v.mode === mode);
  box.innerHTML = shown
    .map((v) => `
      <button class="gal-view${v.id === activeId ? " on" : ""}" data-gview="${esc(v.id)}" role="radio" aria-checked="${v.id === activeId}">
        <i>${viewIcon(v.id)}</i><span>${esc(t(v.labelKey))}</span>
      </button>`)
    .join("");
  renderInfo();
}

function viewIcon(id) {
  const p = {
    front: '<path d="M12 3l9 7v3h-2.5a2.5 2.5 0 1 1-5 0h-3a2.5 2.5 0 1 1-5 0H3v-3z"/>',
    side: '<path d="M3 15h18M4.5 15l1.8-5.4A2 2 0 0 1 8.2 8.2h7.6a2 2 0 0 1 1.9 1.4L19.5 15"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/>',
    rear: '<path d="M4 12h16M6 12V8.5A1.5 1.5 0 0 1 7.5 7h9A1.5 1.5 0 0 1 18 8.5V12M7 16h2m6 0h2"/>',
    interior: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3.5v6m-7 3h5.6m8.8 0H18"/>',
    cabin: '<path d="M7 20v-4a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4M7 13V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6"/><path d="M5 20h14"/>',
    wheel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5V9m0 6v5.5M4.4 12h5.2m8.8 0h-5.2"/>',
    top: '<rect x="4.5" y="4.5" width="15" height="15" rx="3"/><path d="M4.5 10h15M10 4.5v15"/>',
  }[id] || '<circle cx="12" cy="12" r="8"/>';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

function renderInfo() {
  const box = $("#galInfo");
  if (!box) return;
  const v = views.find((x) => x.id === activeId);
  if (!v) {
    box.innerHTML = `<p class="gal-idle">${esc(t(mode === "int" ? "galIdleIn" : "galIdle"))}</p>`;
    return;
  }
  box.innerHTML = `
    <h4>${esc(t(v.labelKey))}</h4>
    <p>${esc(t(v.infoKey))}</p>
    <span class="gal-spec">${esc(t(v.specKey))}</span>`;
}

/* ---------- mode switch (EXTERIOR / INTERIOR) ---------- */

function setMode(next) {
  const m = next === "int" ? "int" : "ext";
  if (m === mode) return;
  mode = m;
  const sec = $("#gallery");
  if (sec) sec.classList.toggle("interior", mode === "int");
  document.querySelectorAll("[data-gmode]").forEach((b) => {
    const on = b.getAttribute("data-gmode") === mode;
    b.classList.toggle("on", on);
    b.setAttribute("aria-checked", String(on));
  });
  // the turntable lives outside the glass — stop it when we step in
  if (mode === "int" && rotating) setRotating(false);
  const v = views.find((x) => x.id === activeId);
  if (!v || v.mode !== mode) {
    activeId = null;
    setPoseOverride(null);
    view.lightT = 0;
  }
  renderGallery();
  track("gallery_mode", mode);
}

/* ---------- view selection ---------- */

export function selectView(id, { silent } = {}) {
  const v = views.find((x) => x.id === id);
  if (!v || !G.ready) return;
  activeId = id;
  if (v.mode !== mode) setMode(v.mode);
  setRotating(false);
  setPoseOverride({ ...v.pose });
  // cabin light rides the pose channel (advance() applies view.light → interiorLight)
  view.lightT = v.pose.light ?? 0;
  renderGallery();
  if (!silent) track("gallery_view", id);
}

export function clearView() {
  activeId = null;
  setPoseOverride(null);
  view.lightT = 0;
  renderGallery();
}

function stepView(delta) {
  const shown = views.filter((v) => v.mode === mode);
  if (!shown.length) return;
  const i = shown.findIndex((x) => x.id === activeId);
  const next = shown[(i + delta + shown.length) % shown.length];
  selectView(next.id);
}

/* ---------- 360° turntable (exterior only) ---------- */

function setRotating(on) {
  rotating = !!on && mode === "ext";
  view.autoRotate = rotating && !G.reduce;
  const st = $("#galRotState");
  if (st) st.textContent = rotating ? "●" : "";
  $("#gal360")?.classList.toggle("on", rotating);
  if (rotating) {
    clearViewRotationGuard();
  }
}

/* leaving 360-mode keeps the camera where the user stopped it */
function clearViewRotationGuard() { /* reserved: pause on drag handled in bind */ }

function updateDial() {
  const deg = angleDeg();
  const num = $("#galDeg");
  if (num) num.textContent = Math.round(deg) + "°";
  const needle = $("#galNeedle");
  if (needle) needle.style.transform = `rotate(${deg}deg)`;
}

/* ---------- wiring ---------- */

export function bindGallery() {
  document.addEventListener("click", (e) => {
    const mb = e.target.closest && e.target.closest("[data-gmode]");
    if (mb) { setMode(mb.getAttribute("data-gmode")); return; }
    const vb = e.target.closest && e.target.closest("[data-gview]");
    if (vb) { selectView(vb.getAttribute("data-gview")); return; }
    const act = e.target.closest && e.target.closest("[data-gact]");
    if (!act) return;
    switch (act.getAttribute("data-gact")) {
      case "360":
        if (rotating) { setRotating(false); clearView(); }
        else { clearView(); setRotating(true); }
        break;
      case "reset":
        setRotating(false);
        clearView();
        break;
      case "prev": stepView(-1); break;
      case "next": stepView(1); break;
    }
  });

  // turning the wheel / dragging while rotating pauses the turntable
  $("#galStage")?.addEventListener("pointerdown", () => {
    if (rotating) setRotating(false);
  });

  // degree dial ticks with a light timer (works even when the rAF is throttled)
  degTimer = setInterval(() => {
    if ($("#galDeg")) updateDial();
  }, 120);

  // re-localise on language switch
  document.addEventListener("carx:rerender", () => renderGallery());
  document.addEventListener("carx:carReady", () => renderGallery());
}

export function gallerySectionVisible(on) {
  if (!on && rotating) setRotating(false);
}
