/**
 * CARX ATELIER — admin API (JWT protected): orders, leads, stats, option pricing.
 */
import { Router } from "express";
import { q, rowToOption } from "../db.js";
import { signToken, verifyPassword, requireAdmin } from "../auth.js";
import { rateLimit, clean, asyncRoute } from "../util.js";

export const adminRouter = Router();

const limitLogin = rateLimit({ bucket: "login", limit: 8, windowMs: 60_000 });

adminRouter.post("/login", limitLogin, asyncRoute((req, res) => {
  const email = clean(req.body?.email, 120);
  const password = String(req.body?.password || "");
  const user = q.get("SELECT * FROM admin_users WHERE email = ?", email || "");
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  res.json({ token: signToken({ sub: user.id, email: user.email, role: user.role }) });
}));

/* Everything below requires a valid admin JWT. */
adminRouter.use(requireAdmin);

adminRouter.get("/orders", asyncRoute((req, res) => {
  const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
  const rows = q.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", limit);
  const orders = rows.map((r) => {
    const items = q.all("SELECT * FROM order_items WHERE order_id = ?", r.id).map(rowToOption);
    return { ...rowToOption(r), items };
  });
  res.json({ orders });
}));

adminRouter.patch("/orders/:id/status", asyncRoute((req, res) => {
  const status = ["pending", "demo", "paid", "fulfilled", "cancelled"].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(422).json({ error: "invalid_status" });
  const r = q.run("UPDATE orders SET status = ? WHERE id = ?", status, req.params.id);
  if (!r.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

adminRouter.get("/leads", asyncRoute((req, res) => {
  const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
  res.json({ leads: q.all("SELECT * FROM leads ORDER BY created_at DESC LIMIT ?", limit).map(rowToOption) });
}));

adminRouter.get("/subscribers", asyncRoute((req, res) => {
  res.json({
    subscribers: q.all("SELECT id, email, locale, created_at, unsubscribed_at FROM subscribers ORDER BY created_at DESC LIMIT 200").map(rowToOption),
  });
}));

adminRouter.get("/stats", asyncRoute((req, res) => {
  const day = 24 * 3600 * 1000;
  const since = Date.now() - 30 * day;
  const countEvents = (kind) =>
    q.get("SELECT COUNT(*) c FROM events WHERE kind = ? AND created_at > ?", kind, since).c;
  const top = (col) =>
    q.all(`SELECT ${col} id, COUNT(*) c FROM order_items WHERE ${col} IS NOT NULL GROUP BY ${col} ORDER BY c DESC LIMIT 5`);
  res.json({
    totals: {
      orders: q.get("SELECT COUNT(*) c FROM orders").c,
      leads: q.get("SELECT COUNT(*) c FROM leads").c,
      revenueUSD: q.get("SELECT COALESCE(SUM(subtotal_usd),0) s FROM orders").s,
    },
    heatmap30d: {
      select_paint: countEvents("select_paint"),
      select_wheel: countEvents("select_wheel"),
      select_roof: countEvents("select_roof"),
      select_trim: countEvents("select_trim"),
      add_cart: countEvents("add_cart"),
      share: countEvents("share"),
    },
    topPaints: top("paint_id"), topWheels: top("wheel_id"), topRoofs: top("roof_id"), topTrims: top("trim_id"),
    recentEvents: q.all("SELECT kind, payload_json, created_at FROM events ORDER BY id DESC LIMIT 30").map(rowToOption),
  });
}));

/* Update option pricing live (never retroactive). */
const OPTION_TABLES = { paints: "paints", wheels: "wheels", roofs: "roofs", trims: "trims" };
adminRouter.patch("/options/:table/:id", asyncRoute((req, res) => {
  const table = OPTION_TABLES[req.params.table];
  if (!table) return res.status(404).json({ error: "unknown_table" });
  const price = Number(req.body?.priceUSD);
  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) return res.status(422).json({ error: "invalid_price" });
  const r = q.run(`UPDATE ${table} SET price_usd = ? WHERE id = ?`, price, req.params.id);
  if (!r.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

adminRouter.get("/catalog", asyncRoute((req, res) => {
  const pick = (t) => q.all(`SELECT * FROM ${t} ORDER BY sort, rowid`).map(rowToOption);
  res.json({
    vehicles: q.all("SELECT * FROM vehicles ORDER BY sort").map(rowToOption),
    paints: pick("paints"), wheels: pick("wheels"), roofs: pick("roofs"), trims: pick("trims"),
  });
}));
