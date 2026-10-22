/** CARX — safe localStorage wrapper (private-mode proof). */

const NS = "carx:";

export function lsGet(k, dflt = null) {
  try {
    const v = localStorage.getItem(NS + k);
    return v == null ? dflt : JSON.parse(v);
  } catch { return dflt; }
}

export function lsSet(k, v) {
  try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch { /* private mode */ }
}

export function lsDel(k) {
  try { localStorage.removeItem(NS + k); } catch { /* noop */ }
}
