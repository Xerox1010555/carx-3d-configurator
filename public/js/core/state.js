/** CARX — central state store with change subscriptions. */

import { lsGet, lsSet } from "./storage.js";

export const DEF_CFG = { paint: "glacier", wheels: "aero5", roof: "fixed", trim: "standard" };

export const state = {
  catalog: null,          // { vehicle, paints, wheels, roofs, trims } (server or fallback)
  cfg: { ...DEF_CFG },
  cart: [],               // [{ k, vehicleId, cfg, q }]
  garage: [],             // [{ id, name, cfg, t }]
  prefs: { currency: "USD", lang: "en", theme: "dark" },
  fx: { rates: { USD: 1 }, source: "fallback" },
  online: true,
  lastOrder: null,
};

const subs = new Map(); // key -> Set<fn>; key "" = any change

export function on(key, fn) {
  if (!subs.has(key)) subs.set(key, new Set());
  subs.get(key).add(fn);
  return () => subs.get(key).delete(fn);
}

export function emit(key) {
  for (const [k, set] of subs) {
    if (k === "" || k === key) for (const fn of set) { try { fn(key); } catch (e) { console.error(e); } }
  }
}

export function loadPersisted() {
  const prefs = lsGet("prefs", null);
  if (prefs && typeof prefs === "object") {
    state.prefs = {
      currency: ["USD", "EGP", "AED", "SAR"].includes(prefs.currency) ? prefs.currency : "USD",
      lang: prefs.lang === "ar" ? "ar" : "en",
      theme: prefs.theme === "light" ? "light" : "dark",
    };
  }
  const cfg = lsGet("cfg", null);
  if (cfg && typeof cfg === "object") state.cfg = { ...DEF_CFG, ...cfg };
  const cart = lsGet("cart", []);
  state.cart = Array.isArray(cart) ? cart.filter((it) => it && it.k && it.cfg) : [];
  const garage = lsGet("garage", []);
  state.garage = Array.isArray(garage) ? garage.filter((g) => g && g.cfg).slice(0, 12) : [];
  const fx = lsGet("fx", null);
  if (fx && fx.rates) state.fx = fx;
}

export function savePrefs() { lsSet("prefs", state.prefs); emit("prefs"); }
export function saveCfg() { lsSet("cfg", state.cfg); emit("cfg"); }
export function saveCart() { lsSet("cart", state.cart); emit("cart"); }
export function saveGarage() { lsSet("garage", state.garage); emit("garage"); }
