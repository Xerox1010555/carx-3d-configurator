/**
 * CARX ATELIER — orders & leads & newsletter & analytics events.
 */
import { Router } from "express";
import { q, rowToOption } from "../db.js";
import { uid, orderCode, rateLimit, clean, isEmail, asyncRoute } from "../util.js";
import { rateFor } from "../fx.js";
import { priceForConfig, configKey } from "../../shared/catalog.mjs";

export const shopRouter = Router();

const limitWrite = rateLimit({ bucket: "write", limit: 30, windowMs: 60_000 });

/* POST /api/orders — server-authoritative pricing; demo order, no card data. */
shopRouter.post("/orders", limitWrite, asyncRoute((req, res) => {
  const body = req.body || {};
  const name = clean(body.name, 60);
  const phone = clean(body.phone, 24);
  const city = clean(body.city, 40);
  const currency = ["USD", "EGP", "AED", "SAR"].includes(body.currency) ? body.currency : "USD";
  if (!name || name.length < 2) return res.status(422).json({ error: "invalid_name" });

  const items = Array.isArray(body.items) ? body.items.slice(0, 10) : [];
  if (!items.length) return res.status(422).json({ error: "empty_cart" });

  // Re-price every item against the DB — never trust client prices.
  const priced = [];
  for (const it of items) {
    const v = q.get("SELECT * FROM vehicles WHERE id = ? OR slug = ?", it.vehicleId || "", it.vehicleSlug || "");
    if (!v) return res.status(422).json({ error: "unknown_vehicle" });
    const pick = (table, id) => {
      const row = q.get(`SELECT * FROM ${table} WHERE id = ? AND vehicle_id = ?`, id || "", v.id);
      return row ? rowToOption(row) : null;
    };
    const paint = pick("paints", it.paintId);
    const wheels = pick("wheels", it.wheelId);
    const roof = pick("roofs", it.roofId);
    const trim = pick("trims", it.trimId);
    if (!paint || !wheels || !roof || !trim) return res.status(422).json({ error: "invalid_option" });
    const qty = Math.min(5, Math.max(1, parseInt(it.qty, 10) || 1));
    priced.push({
      vehicle: v, paint, wheels, roof, trim, qty,
      unitPriceUSD: priceForConfig(v, paint, wheels, roof, trim),
      key: configKey(v, paint, wheels, roof, trim),
    });
  }

  const subtotalUSD = priced.reduce((s, p) => s + p.unitPriceUSD * p.qty, 0);
  const fxRate = rateFor(currency);
  const totalCharged = Math.round(subtotalUSD * fxRate);

  // Optional lead linkage for CRM routing.
  let leadId = null;
  if (phone || body.email) {
    leadId = "lead_" + uid().slice(0, 8);
    q.run(
      "INSERT INTO leads (id, name, phone, email, city, source, config_key, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      leadId, name, phone, clean(body.email, 120), city, "checkout", priced[0].key, "new", Date.now()
    );
  }

  const orderId = "ord_" + uid().slice(0, 8);
  let code = orderCode();
  for (let i = 0; i < 5 && q.get("SELECT id FROM orders WHERE code = ?", code); i++) code = orderCode();

  q.run(
    "INSERT INTO orders (id, code, name, phone, city, currency, subtotal_usd, fx_rate, total_charged, status, lead_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    orderId, code, name, phone, city, currency, subtotalUSD, fxRate, totalCharged, "demo", leadId, Date.now()
  );
  for (const p of priced) {
    q.run(
      "INSERT INTO order_items (id, order_id, vehicle_id, paint_id, wheel_id, roof_id, trim_id, config_key, qty, unit_price_usd) VALUES (?,?,?,?,?,?,?,?,?,?)",
      "oi_" + uid().slice(0, 8), orderId, p.vehicle.id, p.paint.id, p.wheels.id, p.roof.id, p.trim.id, p.key, p.qty, p.unitPriceUSD
    );
  }

  res.status(201).json({ code, currency, fxRate, subtotalUSD, totalCharged, status: "demo" });
}));

/* GET /api/orders/:code — order lookup (no PII beyond what was typed). */
shopRouter.get("/orders/:code", asyncRoute((req, res) => {
  const row = q.get("SELECT id, code, currency, subtotal_usd, total_charged, status, created_at FROM orders WHERE code = ?", req.params.code);
  if (!row) return res.status(404).json({ error: "not_found" });
  const items = q.all("SELECT * FROM order_items WHERE order_id = ?", row.id);
  res.json({ order: { ...rowToOption(row), items: items.map(rowToOption) } });
}));

/* POST /api/leads — generic lead capture (WhatsApp CTA, configurator share). */
shopRouter.post("/leads", limitWrite, asyncRoute((req, res) => {
  const b = req.body || {};
  const name = clean(b.name, 60), phone = clean(b.phone, 24), email = clean(b.email, 120), city = clean(b.city, 40);
  if (!phone && !email) return res.status(422).json({ error: "contact_required" });
  q.run(
    "INSERT INTO leads (id, name, phone, email, city, source, config_key, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    "lead_" + uid().slice(0, 8), name, phone, email, city, clean(b.source, 30) || "manual", clean(b.configKey, 120), "new", Date.now()
  );
  res.status(201).json({ ok: true });
}));

/* POST /api/newsletter — token-based unsubscribe (double-opt-in friendly). */
shopRouter.post("/newsletter", limitWrite, asyncRoute((req, res) => {
  const email = clean(req.body?.email, 120);
  const locale = req.body?.locale === "ar" ? "ar" : "en";
  if (!isEmail(email)) return res.status(422).json({ error: "invalid_email" });
  const existing = q.get("SELECT * FROM subscribers WHERE email = ?", email);
  if (existing && !existing.unsubscribed_at) return res.status(200).json({ ok: true, already: true });
  const token = uid().replace(/-/g, "").slice(0, 20);
  if (existing) {
    q.run("UPDATE subscribers SET unsubscribed_at = NULL, confirmed_at = ?, token = ?, locale = ? WHERE id = ?", Date.now(), token, locale, existing.id);
  } else {
    q.run(
      "INSERT INTO subscribers (id, email, locale, token, confirmed_at, created_at) VALUES (?,?,?,?,?,?)",
      "sub_" + uid().slice(0, 8), email, locale, token, Date.now(), Date.now()
    );
  }
  res.status(201).json({ ok: true, unsubscribeToken: token });
}));

shopRouter.delete("/newsletter/:token", asyncRoute((req, res) => {
  const r = q.run("UPDATE subscribers SET unsubscribed_at = ? WHERE token = ?", Date.now(), req.params.token);
  if (!r.changes) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}));

/* POST /api/events — privacy-light analytics (choice heatmap). No IPs, no fingerprints. */
const VALID_EVENTS = new Set(["select_paint", "select_wheel", "select_roof", "select_trim", "add_cart", "share", "screenshot", "garage_save", "client_error"]);
shopRouter.post("/events", limitWrite, asyncRoute((req, res) => {
  const b = req.body || {};
  if (!VALID_EVENTS.has(b.kind)) return res.status(422).json({ error: "invalid_kind" });
  const payload = { id: String(b.id || "").slice(0, 40), lang: b.lang === "ar" ? "ar" : "en" };
  q.run("INSERT INTO events (kind, payload_json, created_at) VALUES (?,?,?)", b.kind, JSON.stringify(payload), Date.now());
  res.status(204).end();
}));
