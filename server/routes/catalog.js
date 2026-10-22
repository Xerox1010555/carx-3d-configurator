/**
 * CARX ATELIER — public catalog routes: vehicles, options, price, showrooms, fx.
 */
import { Router } from "express";
import { q, rowToOption } from "../db.js";
import { getFx } from "../fx.js";
import { asyncRoute } from "../util.js";
import { priceForConfig, configKey } from "../../shared/catalog.mjs";

export const catalogRouter = Router();

function vehicleWithOptions(slug) {
  const v = q.get("SELECT * FROM vehicles WHERE slug = ? AND is_active = 1", slug) ||
            q.get("SELECT * FROM vehicles WHERE id = ? AND is_active = 1", slug);
  if (!v) return null;
  const pick = (table) =>
    q.all(`SELECT * FROM ${table} WHERE vehicle_id = ? ORDER BY sort, rowid`, v.id).map(rowToOption);
  const specs = (() => { try { return JSON.parse(v.specs_json); } catch { return {}; } })();
  return {
    id: v.id, slug: v.slug, brand: v.brand, model: v.model,
    yearFrom: v.year_from, yearTo: v.year_to, basePriceUSD: v.base_price_usd,
    glbPath: v.glb_path, isActive: !!v.is_active, sort: v.sort, specs,
    paints: pick("paints"), wheels: pick("wheels"), roofs: pick("roofs"), trims: pick("trims"),
  };
}

catalogRouter.get("/vehicles", asyncRoute((req, res) => {
  const rows = q.all("SELECT * FROM vehicles WHERE is_active = 1 ORDER BY sort, rowid");
  res.json({
    vehicles: rows.map((v) => {
      const full = vehicleWithOptions(v.slug);
      return { ...full, paints: undefined, wheels: undefined, roofs: undefined, trims: undefined };
    }),
  });
}));

catalogRouter.get("/vehicles/:slug", asyncRoute((req, res) => {
  const v = vehicleWithOptions(req.params.slug);
  if (!v) return res.status(404).json({ error: "not_found" });
  res.json({ vehicle: v });
}));

catalogRouter.get("/vehicles/:slug/price", asyncRoute((req, res) => {
  const v = vehicleWithOptions(req.params.slug);
  if (!v) return res.status(404).json({ error: "not_found" });
  const by = (arr, id) => arr.find((o) => o.id === id) || null;
  const paint = by(v.paints, req.query.paint) || v.paints.find((p) => p.isDefault) || v.paints[0];
  const wheels = by(v.wheels, req.query.wheels || req.query.wheel) || v.wheels.find((w) => w.isDefault) || v.wheels[0];
  const roof = by(v.roofs, req.query.roof) || v.roofs.find((r) => r.isDefault) || v.roofs[0];
  const trim = by(v.trims, req.query.trim) || v.trims.find((t) => t.isDefault) || v.trims[0];
  if (!paint || !wheels || !roof || !trim) return res.status(422).json({ error: "invalid_config" });
  const totalUSD = priceForConfig(v, paint, wheels, roof, trim);
  res.json({ totalUSD, key: configKey(v, paint, wheels, roof, trim), parts: {
    base: v.basePriceUSD, paint: paint.priceUSD, wheels: wheels.priceUSD, roof: roof.priceUSD, trim: trim.priceUSD,
  } });
}));

catalogRouter.get("/showrooms", asyncRoute((req, res) => {
  const rows = q.all("SELECT * FROM showrooms ORDER BY rowid").map((r) => {
    const o = rowToOption(r);
    try { o.hours = JSON.parse(o.hoursJson); } catch { o.hours = {}; }
    return o;
  });
  res.json({ showrooms: rows });
}));

catalogRouter.get("/fx", asyncRoute((req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  res.json(getFx());
}));
