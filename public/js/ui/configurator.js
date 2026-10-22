/** CARX — configurator UI: collection grid, panel, option groups, telemetry, showrooms. */

import { $, elNew, esc, hex2css } from "../core/utils.js";
import { state, saveCfg, on } from "../core/state.js";
import { t } from "../core/i18n.js";
import { fmtUSD } from "../core/fx.js";
import { syncHash } from "../core/hash.js";
import {
  vehicle, paints, wheels, roofs, trims, showrooms,
  paintById, wheelById, roofById, trimById, resolveCfg, priceFor, keyFor,
} from "../core/catalog.js";
import { applyPaint, applyWheels, applyTrim, applyRoof } from "../three/car.js";
import { track } from "../analytics.js";
import { toast } from "./toast.js";
import { postJSON } from "../api/client.js";

const KIND_EVENT = { paint: "select_paint", wheels: "select_wheel", roof: "select_roof", trim: "select_trim" };

/* ---------- selection ---------- */

export function applyCfgLive(changed) {
  const r = resolveCfg(state.cfg);
  if (!changed || changed === "paint") applyPaint(r.paint);
  if (!changed || changed === "wheels") applyWheels(r.wheels);
  if (!changed || changed === "trim") applyTrim(r.trim);
  if (!changed || changed === "roof") applyRoof(r.roof);
}

export function selectOption(kind, id, { silent } = {}) {
  const before = JSON.stringify(state.cfg);
  const next = { ...state.cfg, [kind]: id };
  state.cfg = normalize(next);
  if (JSON.stringify(state.cfg) === before) { syncHash(); return; }
  saveCfg();
  applyCfgLive(kind);
  syncHash();
  renderPanel(); renderGroups(); renderCarGrid(); renderPerf(true);
  track(KIND_EVENT[kind] || "select_paint", id);
  if (!silent) toast(`${t(kind === "paint" ? "plPaint" : kind === "wheels" ? "plWheels" : kind === "roof" ? "plRoof" : "plTrim")}: ${labelFor(kind, id)}`, "ok");
}

function normalize(cfg) {
  const r = resolveCfg(cfg);
  return { paint: r.paint.id, wheels: r.wheels.id, roof: r.roof.id, trim: r.trim.id };
}

function labelFor(kind, id) {
  const o = { paint: paintById(id), wheels: wheelById(id), roof: roofById(id), trim: trimById(id) }[kind];
  const lang = state.prefs.lang;
  return esc(o ? (o.nameAr && lang === "ar" ? o.nameAr : o.nameEn) : id);
}

/* ---------- collection grid ---------- */

function carlineSVG(hex) {
  return `<svg viewBox="0 0 240 96" class="carline-svg" aria-hidden="true">
    <path d="M14 66h212M22 66c-6 0-8-4-8-9l4-14c1-4 4-6 8-6l38-2 22-14c4-3 9-4 14-4h52c6 0 11 2 15 6l16 14 36 4c6 1 9 4 9 9l1 12"
      fill="none" stroke="${hex}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="70" cy="68" r="13" fill="none" stroke="${hex}" stroke-width="4"/>
    <circle cx="176" cy="68" r="13" fill="none" stroke="${hex}" stroke-width="4"/>
  </svg>`;
}

export function renderCarGrid() {
  const box = $("#carGrid");
  const v = vehicle();
  if (!box || !v) return;
  const paint = paintById(state.cfg.paint) || paints()[0];
  const pc = hex2css(paint.hex);
  const sp = v.specs || {};
  const spec = [
    `${sp.rangeKm ?? "-"} km`, `${Number(sp.sprintSec ?? 0).toFixed(1)} s`,
    `${sp.topSpeedKmh ?? "-"} km/h`, `${Math.round((sp.powerKw ?? 0) * 1.36)} PS`,
  ];
  const card = elNew("div", "c-card on");
  card.innerHTML = `
    <div class="c-top">
      <span class="c-code">${esc(v.brand)}·M5</span>
      <span class="c-kind">${esc(t("kindW"))}</span>
    </div>
    <div class="c-line">${carlineSVG(pc)}</div>
    <h3>${esc(v.model)}</h3>
    <ul class="c-spec">${spec.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    <div class="c-foot">
      <b>${fmtUSD(priceFor(state.cfg))}</b>
      <button class="btn btn-p c-add" data-goto="configurator">${esc(t("cardCta"))}</button>
    </div>`;
  box.innerHTML = "";
  box.appendChild(card);
}

/* ---------- config panel ---------- */

const line = (lab, val, fp) =>
  `<div class="cfg-line"><span>${esc(lab)}</span><b>${val}${fp ? `<span class="fp">${esc(fp)}</span>` : ""}</b></div>`;

export function renderPanel() {
  const box = $("#cfgPanel");
  const r = resolveCfg(state.cfg);
  if (!box) return;
  const nmL = (o) => esc(state.prefs.lang === "ar" && o.nameAr ? o.nameAr : o.nameEn);
  const v = r.vehicle;
  const parts = [
    [t("baseP"), fmtUSD(v.basePriceUSD)],
    [t("plPaint"), fmtUSD(r.paint.priceUSD), r.paint.id],
    [t("plWheels"), fmtUSD(r.wheels.priceUSD), r.wheels.id],
    [t("plRoof"), fmtUSD(r.roof.priceUSD), r.roof.id],
    [t("plTrim"), fmtUSD(r.trim.priceUSD), r.trim.id],
  ];
  box.innerHTML = `
    <div class="cfg-head">
      <span class="c-code">${esc(v.brand)}·M5</span>
      <h3>${esc(v.model)}</h3>
    </div>
    ${parts.map(([l, val, fp]) => line(l, val, fp)).join("")}
    <div class="cfg-line total"><span>${esc(t("totalP"))}</span><b>${fmtUSD(priceFor(state.cfg))}</b></div>
    <div class="cfg-fp"><span>${esc(t("finger"))}</span><code>${esc(keyFor(state.cfg))}</code></div>
    <div class="cta-row" style="margin-top:16px">
      <button class="btn btn-p" data-act="add">${esc(t("addCart"))}</button>
      <button class="btn btn-ghost" data-act="share">${esc(t("share"))}</button>
      <button class="btn btn-ghost" data-act="saveGarage" title="${esc(t("garageSave"))}">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:-2px"><path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>
      </button>
    </div>
    <div class="lead-cta">
      <input id="leadPhone" inputmode="tel" maxlength="24" placeholder="${esc(t("fPhone"))}">
      <button class="btn btn-ghost" data-act="lead">${esc(t("leadCta"))}</button>
    </div>
    <p class="cfg-note">${esc(t("wheelLive"))} · ${esc(t("trimLive"))}</p>`;
}

/* ---------- option groups ---------- */

const chip = (kind, o, active, price) =>
  `<button class="chip${active ? " on" : ""}" data-kind="${kind}" data-id="${esc(o.id)}" role="radio" aria-checked="${active}">
     <i class="sw" style="background:${hex2css(o.hex || o.rimHex || o.accentHex || "#888")}"></i>
     <span>${esc(state.prefs.lang === "ar" && o.nameAr ? o.nameAr : o.nameEn)}</span>
     ${price > 0 ? `<i class="plus">${esc(fmtUSD(price))}</i>` : ""}
   </button>`;

export function renderGroups() {
  const box = $("#cfgGroups");
  if (!box) return;
  const c = state.cfg;
  const group = (title, inner) =>
    `<div class="cfg-group"><h4>${esc(title)}</h4><div class="chips" role="radiogroup">${inner}</div></div>`;
  box.innerHTML =
    group(t("plPaint"), paints().map((p) => chip("paint", p, c.paint === p.id, p.priceUSD)).join("")) +
    group(t("plWheels"), wheels().map((w) => chip("wheels", w, c.wheels === w.id, w.priceUSD)).join("")) +
    group(t("plRoof"), roofs().map((r) => chip("roof", r, c.roof === r.id, r.priceUSD)).join("")) +
    group(t("plTrim"), trims().map((tr) => chip("trim", tr, c.trim === tr.id, tr.priceUSD)).join(""));
}

/* ---------- telemetry ---------- */

let countersBound = false;
export function renderPerf(instant) {
  const box = $("#perfGrid");
  const v = vehicle();
  if (!box || !v) return;
  const sp = v.specs || {};
  const cells = [
    { label: t("pL1"), to: sp.rangeKm ?? 0, dec: 0 },
    { label: t("pL2"), to: sp.sprintSec ?? 0, dec: 1 },
    { label: t("pL3"), to: sp.topSpeedKmh ?? 0, dec: 0 },
    { label: t("pL4"), to: Math.round((sp.powerKw ?? 0) * 1.36), dec: 0 },
  ];
  box.innerHTML = cells
    .map((c) => `<div class="perf-cell"><b data-to="${c.to}" data-dec="${c.dec}">${instant ? c.to.toFixed(c.dec) : "0"}</b><span>${esc(c.label)}</span></div>`)
    .join("");
  if (!instant) bindCounters();
}

function bindCounters() {
  if (countersBound) return;
  countersBound = true;
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const b = e.target.querySelector("b[data-to]");
      if (!b) continue;
      const to = parseFloat(b.dataset.to || "0");
      const dec = parseInt(b.dataset.dec || "0", 10);
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 900);
        const eased = 1 - Math.pow(1 - p, 3);
        b.textContent = (to * eased).toFixed(dec);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.4 });
  const box = $("#perfGrid");
  if (box) io.observe(box);
}

/* ---------- showrooms ---------- */

export function renderShowrooms() {
  const box = $("#showGrid");
  if (!box) return;
  const lang = state.prefs.lang;
  box.innerHTML = showrooms()
    .map((s) => `
      <div class="sh-card">
        <b>${esc(lang === "ar" && s.cityAr ? s.cityAr : s.cityEn)}</b>
        <span>${esc(lang === "ar" && s.hallAr ? s.hallAr : s.hallEn)}</span>
        <p>${esc(s.address || "")} · ${esc(s.phone || "")}</p>
      </div>`)
    .join("");
}

/* ---------- lead CTA ---------- */

async function sendLead() {
  const inp = $("#leadPhone");
  const phone = inp?.value.trim() || "";
  if (!phone) { toast(t("leadBad"), "warn"); return; }
  try {
    await postJSON("/api/leads", {
      phone, source: "configurator", configKey: keyFor(state.cfg),
    }, { timeout: 6000 });
    toast(t("leadOk"), "ok");
    if (inp) inp.value = "";
  } catch {
    toast(t("leadBad"), "warn");
  }
}

/* ---------- wiring ---------- */

export function bindConfigurator() {
  // option chips (capture phase, matches original behaviour)
  document.addEventListener("click", (e) => {
    const chipEl = e.target.closest && e.target.closest(".chip[data-kind]");
    if (!chipEl) return;
    const kind = chipEl.getAttribute("data-kind");
    const id = chipEl.getAttribute("data-id");
    if (!id) return;
    selectOption(kind, id);
  }, true);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    if (act === "lead") { e.preventDefault(); sendLead(); }
  });

  on("cfg", () => { /* selection already re-renders */ });
  on("fx", () => { renderPanel(); renderCarGrid(); renderGroups(); renderPerf(true); document.dispatchEvent(new CustomEvent("cart:rerender")); });
  on("cart", () => document.dispatchEvent(new CustomEvent("cart:badge")));
  on("prefs", () => { renderPanel(); renderGroups(); renderCarGrid(); renderShowrooms(); renderPerf(true); });
}

export function renderAll() {
  renderCarGrid(); renderGroups(); renderPanel(); renderShowrooms(); renderPerf(true);
}
