/** CARX — currency formatting with server-first FX rates. */

import { state, savePrefs, emit } from "./state.js";
import { fmtNum } from "./utils.js";
import { getJSON } from "../api/client.js";
import { lsSet } from "./storage.js";

export const CURRENCIES = ["USD", "EGP", "AED", "SAR"];
const SYM = {
  en: { USD: "$", EGP: "E£", AED: "AED ", SAR: "SAR " },
  ar: { USD: "$", EGP: "ج.م", AED: "د.إ ", SAR: "ر.س " },
};

export async function refreshRates() {
  try {
    const j = await getJSON("/api/fx", { timeout: 5000 });
    if (j?.rates?.USD) {
      state.fx = { rates: j.rates, source: j.source || "live" };
      lsSet("fx", state.fx);
      emit("fx");
    }
  } catch { /* keep cached/fallback */ }
}

export function fmtUSD(usd, opts = {}) {
  const { lang = state.prefs.lang, currency = state.prefs.currency, showCode = false } = opts;
  const rate = state.fx.rates[currency];
  const r = Number.isFinite(rate) && rate > 0 ? rate : 1;
  const value = Math.max(0, Math.round(usd * r));
  const sym = (SYM[lang] || SYM.en)[currency] || "$";
  return sym + fmtNum(value, lang) + (showCode ? " " + currency : "");
}

export function setCurrency(cur) {
  state.prefs.currency = CURRENCIES.includes(cur) ? cur : "USD";
  savePrefs();
  emit("fx");
}
