/**
 * CARX ATELIER — FX rates: server-side cache (6h TTL) with static fallback.
 */
import { FX_FALLBACK, CURRENCIES } from "../shared/catalog.mjs";

const TTL_MS = 6 * 3600 * 1000;
let cache = { rates: { ...FX_FALLBACK }, fetchedAt: 0, source: "fallback" };
let inflight = null;

async function fetchRates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal });
    const json = await res.json();
    const rates = {};
    for (const c of CURRENCIES) {
      const v = json?.rates?.[c];
      if (typeof v === "number" && v > 0) rates[c] = v;
    }
    if (rates.USD && Object.keys(rates).length >= 2) {
      cache = { rates: { ...FX_FALLBACK, ...rates }, fetchedAt: Date.now(), source: "live" };
    }
  } catch {
    /* keep previous / fallback */
  } finally {
    clearTimeout(timer);
  }
}

export function getFx() {
  const stale = Date.now() - cache.fetchedAt > TTL_MS;
  if (stale && !inflight) inflight = fetchRates().finally(() => (inflight = null));
  return { rates: cache.rates, fetchedAt: cache.fetchedAt, source: cache.source };
}

export function rateFor(currency) {
  const r = getFx().rates[currency];
  return typeof r === "number" && r > 0 ? r : 1;
}
