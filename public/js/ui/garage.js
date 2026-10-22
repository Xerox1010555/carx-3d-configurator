/** CARX — garage: save/load/compare/delete builds (localStorage, max 12). */

import { $, esc, hex2css } from "../core/utils.js";
import { state, saveGarage } from "../core/state.js";
import { t } from "../core/i18n.js";
import { fmtUSD } from "../core/fx.js";
import { resolveCfg, priceFor, keyFor } from "../core/catalog.js";
import { modalOpen, modalClose } from "./cart.js";
import { selectOption } from "./configurator.js";
import { toast } from "./toast.js";
import { track } from "../analytics.js";

export function saveBuild() {
  if (state.garage.length >= 12) state.garage.shift();
  const r = resolveCfg(state.cfg);
  state.garage.unshift({
    id: "b_" + Date.now().toString(36),
    name: `${r.paint.nameEn} · ${r.wheels.nameEn}`,
    cfg: { ...state.cfg },
    t: Date.now(),
  });
  saveGarage();
  track("garage_save", keyFor(state.cfg));
  toast(t("garageSaved"), "ok");
}

export function loadBuild(g) {
  state.cfg = { ...state.cfg, ...g.cfg };
  // re-apply each kind through the normal path so the 3D + hash stay in sync
  for (const kind of ["paint", "wheels", "roof", "trim"]) {
    if (state.cfg[kind]) selectOption(kind, state.cfg[kind], { silent: true });
  }
  modalClose();
  toast(t("garageLoad") + ": " + g.name, "ok");
}

function rowHTML(g, cmp = false) {
  const r = resolveCfg(g.cfg);
  const hex = hex2css(r.paint.hex);
  return `
    <div class="g-row">
      <i class="g-swatch" style="background:${hex}"></i>
      <div class="g-meta">
        <b>${esc(g.name)}</b>
        <span>${esc(r.paint.nameEn)} · ${esc(r.wheels.nameEn)} · ${esc(r.roof.nameEn)} · ${esc(r.trim.nameEn)} — ${esc(fmtUSD(priceFor(g.cfg)))}</span>
      </div>
      ${cmp ? "" : `
      <div class="g-acts">
        <button class="icobtn" data-g-load="${esc(g.id)}" title="${esc(t("garageLoad"))}">
          <svg viewBox="0 0 24 24"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14"/></svg>
        </button>
        <button class="icobtn" data-g-del="${esc(g.id)}" title="${esc(t("garageDel"))}">
          <svg viewBox="0 0 24 24"><path d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12"/></svg>
        </button>
      </div>`}
    </div>`;
}

export function openGarage(compare = false) {
  const list = compare ? state.garage.slice(0, 2) : state.garage;
  const body = state.garage.length
    ? (compare && list.length < 2
        ? `<p class="g-empty">—</p>`
        : `<div class="${compare ? "g-compare" : "g-table"}">${list.map((g) => rowHTML(g, compare)).join("")}</div>`)
    : `<p class="g-empty">${esc(t("garageEmpty"))}</p>`;
  modalOpen(`
    <div class="m-box">
      <div class="m-head"><h3>${esc(t("garageT"))}</h3>
        <button class="icobtn x" data-act="closeModal" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
      </div>
      ${body}
      <div class="cta-row" style="margin-top:14px">
        <button class="btn btn-p" data-g-save>${esc(t("garageSave"))}</button>
        <button class="btn btn-ghost" data-g-cmp>${esc(t("garageCmp"))}</button>
      </div>
    </div>`);
}

export function bindGarage() {
  $("#garageBtn")?.addEventListener("click", () => openGarage(false));
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-act],[data-g-load],[data-g-del],[data-g-save],[data-g-cmp]");
    if (!btn) return;
    if (btn.hasAttribute("data-act") && btn.getAttribute("data-act") === "saveGarage") { saveBuild(); return; }
    if (btn.hasAttribute("data-g-save")) { saveBuild(); openGarage(false); return; }
    if (btn.hasAttribute("data-g-cmp")) { openGarage(true); return; }
    const loadId = btn.getAttribute("data-g-load");
    if (loadId) {
      const g = state.garage.find((x) => x.id === loadId);
      if (g) loadBuild(g);
      return;
    }
    const delId = btn.getAttribute("data-g-del");
    if (delId) {
      state.garage = state.garage.filter((x) => x.id !== delId);
      saveGarage();
      openGarage(false);
    }
  });
}
