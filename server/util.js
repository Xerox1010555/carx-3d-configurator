/**
 * CARX ATELIER — server utilities: ids, rate limiting, validation.
 */
import { randomUUID, randomInt } from "node:crypto";

export const uid = () => randomUUID();

/** Order codes: CRX-XXXXXX (6 digits). */
export const orderCode = () => "CRX-" + String(randomInt(100000, 999999));

/** Simple in-memory sliding-window rate limiter per IP+bucket. */
const buckets = new Map();
export function rateLimit({ bucket, limit, windowMs }) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "anon";
    const key = `${bucket}:${ip}`;
    const now = Date.now();
    let hits = buckets.get(key) || [];
    hits = hits.filter((t) => now - t < windowMs);
    if (hits.length >= limit) {
      res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: "rate_limited" });
    }
    hits.push(now);
    buckets.set(key, hits);
    next();
  };
}

/** Periodically prune bucket memory. */
setInterval(() => {
  const now = Date.now();
  for (const [k, hits] of buckets) {
    if (!hits.length || now - hits[0] > 10 * 60 * 1000) buckets.delete(k);
  }
}, 5 * 60 * 1000).unref?.();

export const clean = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : null);
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ""));

export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
