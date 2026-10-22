/** CARX — catalog access: server-first with bundled fallback (offline-capable). */

import { getJSON } from "../api/client.js";
import { VEHICLES, PAINTS, WHEELS, ROOFS, TRIMS, SHOWROOMS, FX_FALLBACK, priceForConfig, configKey } from "/shared/catalog.mjs";

let catalog = null;
let source = "fallback";

export const catalogSource = () => source;

export async function loadCatalog(slug = "bmw-m5-e34-touring") {
  try {
    const j = await getJSON(`/api/vehicles/${slug}`, { timeout: 6000 });
    if (j?.vehicle?.paints?.length) {
      catalog = j.vehicle;
      source = "server";
      return catalog;
    }
  } catch { /* offline → fallback */ }
  catalog = {
    ...VEHICLES[0],
    paints: PAINTS, wheels: WHEELS, roofs: ROOFS, trims: TRIMS,
    showrooms: SHOWROOMS,
  };
  source = "fallback";
  return catalog;
}

export const vehicle = () => catalog;
export const paints = () => catalog?.paints || PAINTS;
export const wheels = () => catalog?.wheels || WHEELS;
export const roofs = () => catalog?.roofs || ROOFS;
export const trims = () => catalog?.trims || TRIMS;
export const showrooms = () => catalog?.showrooms || SHOWROOMS;
export const fxFallback = () => FX_FALLBACK;

const byId = (arr, id) => arr().find((o) => o.id === id) || null;
export const paintById = (id) => byId(paints, id);
export const wheelById = (id) => byId(wheels, id);
export const roofById = (id) => byId(roofs, id);
export const trimById = (id) => byId(trims, id);

/** Resolve a full option set for a config, falling back to defaults. */
export function resolveCfg(cfg) {
  const v = catalog || VEHICLES[0];
  const def = (arr, id) => arr.find((o) => o.id === id) || arr.find((o) => o.isDefault) || arr[0];
  return {
    vehicle: v,
    paint: def(paints(), cfg.paint),
    wheels: def(wheels(), cfg.wheels),
    roof: def(roofs(), cfg.roof),
    trim: def(trims(), cfg.trim),
  };
}

export function priceFor(cfg) {
  const r = resolveCfg(cfg);
  return priceForConfig(r.vehicle, r.paint, r.wheels, r.roof, r.trim);
}

export function keyFor(cfg) {
  const r = resolveCfg(cfg);
  return configKey(r.vehicle, r.paint, r.wheels, r.roof, r.trim);
}

export function knownIds() {
  return {
    paint: new Set(paints().map((o) => o.id)),
    wheels: new Set(wheels().map((o) => o.id)),
    roof: new Set(roofs().map((o) => o.id)),
    trim: new Set(trims().map((o) => o.id)),
  };
}
