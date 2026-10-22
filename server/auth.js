/**
 * CARX ATELIER — auth: scrypt password hashing + minimal HMAC-JWT (no external deps).
 */
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

const SECRET = process.env.CARX_JWT_SECRET || "carx-dev-secret-change-in-production";
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const fromB64u = (s) => Buffer.from(s, "base64url").toString("utf8");

export function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const calc = scryptSync(pw, salt, 64);
  const expect = Buffer.from(hash, "hex");
  return calc.length === expect.length && timingSafeEqual(calc, expect);
}

export function signToken(payload, ttlMs = 8 * 3600 * 1000) {
  const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + ttlMs }));
  const sig = b64u(createHmac("sha256", SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expect = b64u(createHmac("sha256", SECRET).update(`${header}.${body}`).digest());
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64u(body));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Express middleware guarding /api/admin/* (except login). */
export function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.admin = payload;
  next();
}
