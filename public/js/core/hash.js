/** CARX — shareable configuration state in the URL hash. */

import { state, DEF_CFG } from "./state.js";

const KEYS = ["paint", "wheels", "roof", "trim"];

/** Read config from location.hash; returns true when a valid config was applied. */
export function applyHash(knownIds) {
  const h = (location.hash || "").replace(/^#/, "");
  if (!h.includes("=")) return false;
  const p = new URLSearchParams(h);
  const patch = {};
  for (const k of KEYS) {
    const v = p.get(k);
    if (v && (!knownIds || knownIds[k]?.has(v))) patch[k] = v;
  }
  if (!Object.keys(patch).length) return false;
  state.cfg = { ...DEF_CFG, ...state.cfg, ...patch };
  return true;
}

/** Write the current config into the URL without scrolling. */
export function syncHash() {
  const c = state.cfg;
  const p = new URLSearchParams({ paint: c.paint, wheels: c.wheels, roof: c.roof, trim: c.trim });
  const h = "#" + p.toString();
  if (location.hash !== h) history.replaceState(null, "", location.pathname + location.search + h);
}

export function shareURL() {
  return location.origin + location.pathname + location.search + "#" +
    new URLSearchParams(state.cfg).toString();
}
