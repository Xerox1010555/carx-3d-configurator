/**
 * CARX ATELIER — seed the SQLite database from the canonical catalog.
 * Idempotent: safe to re-run (upserts by id).
 */
import { initSchema, q } from "./db.js";
import { hashPassword } from "./auth.js";
import { VEHICLES, PAINTS, WHEELS, ROOFS, TRIMS, SHOWROOMS } from "../shared/catalog.mjs";

initSchema();

const toSnake = (s) =>
  s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();

for (const v of VEHICLES) {
  q.run(
    `INSERT INTO vehicles (id, slug, brand, model, year_from, year_to, base_price_usd, specs_json, glb_path, is_active, sort)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, brand=excluded.brand, model=excluded.model,
       year_from=excluded.year_from, year_to=excluded.year_to, base_price_usd=excluded.base_price_usd,
       specs_json=excluded.specs_json, glb_path=excluded.glb_path, is_active=excluded.is_active, sort=excluded.sort`,
    v.id, v.slug, v.brand, v.model, v.yearFrom, v.yearTo, v.basePriceUSD,
    JSON.stringify(v.specs), v.glbPath, v.isActive ? 1 : 0, v.sort
  );
}

function upsertOption(table, o, cols) {
  const allCols = ["id", "vehicleId", ...cols];
  const setClause = cols
    .filter((c) => c !== "id")
    .map((c) => `${toSnake(c)}=excluded.${toSnake(c)}`)
    .join(", ");
  q.run(
    `INSERT INTO ${table} (${allCols.map(toSnake).join(",")})
     VALUES (${allCols.map(() => "?").join(",")})
     ON CONFLICT(id) DO UPDATE SET ${setClause}`,
    ...allCols.map((k) => (k === "vehicleId" ? o.vehicleId : o[k]))
  );
}

PAINTS.forEach((o, i) => {
  upsertOption("paints", o, ["nameEn", "nameAr", "hex", "metalness", "roughness", "priceUSD", "isDefault"]);
  q.run("UPDATE paints SET sort=? WHERE id=?", i, o.id);
});
WHEELS.forEach((o, i) => {
  upsertOption("wheels", o, ["nameEn", "nameAr", "spokes", "styleCode", "rimHex", "metalness", "roughness", "priceUSD", "isDefault"]);
  q.run("UPDATE wheels SET sort=? WHERE id=?", i, o.id);
});
ROOFS.forEach((o, i) => {
  upsertOption("roofs", o, ["nameEn", "nameAr", "variantCode", "priceUSD", "isDefault"]);
  q.run("UPDATE roofs SET sort=? WHERE id=?", i, o.id);
});
TRIMS.forEach((o, i) => {
  upsertOption("trims", o, ["nameEn", "nameAr", "accentHex", "caliperHex", "priceUSD", "isDefault"]);
  q.run("UPDATE trims SET sort=? WHERE id=?", i, o.id);
});

for (const s of SHOWROOMS) {
  q.run(
    `INSERT INTO showrooms (id, city_en, city_ar, hall_en, hall_ar, address, phone, lat, lng, hours_json)
     VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
       city_en=excluded.city_en, city_ar=excluded.city_ar, hall_en=excluded.hall_en, hall_ar=excluded.hall_ar,
       address=excluded.address, phone=excluded.phone, lat=excluded.lat, lng=excluded.lng, hours_json=excluded.hours_json`,
    s.id, s.cityEn, s.cityAr, s.hallEn, s.hallAr, s.address, s.phone, s.lat, s.lng, JSON.stringify(s.hoursJson)
  );
}

const adminEmail = process.env.CARX_ADMIN_EMAIL || "admin@carx.local";
const adminPw = process.env.CARX_ADMIN_PASSWORD || "carx-admin-2026";
if (!q.get("SELECT id FROM admin_users WHERE email = ?", adminEmail)) {
  q.run(
    "INSERT INTO admin_users (id, email, password_hash, role, created_at) VALUES (?,?,?,?,?)",
    "adm_" + Math.random().toString(36).slice(2, 10), adminEmail, hashPassword(adminPw), "admin", Date.now()
  );
  console.log(`seed: admin user created → ${adminEmail}`);
}

console.log("seed: catalog upserted:", {
  vehicles: q.get("SELECT COUNT(*) c FROM vehicles").c,
  paints: q.get("SELECT COUNT(*) c FROM paints").c,
  wheels: q.get("SELECT COUNT(*) c FROM wheels").c,
  roofs: q.get("SELECT COUNT(*) c FROM roofs").c,
  trims: q.get("SELECT COUNT(*) c FROM trims").c,
  showrooms: q.get("SELECT COUNT(*) c FROM showrooms").c,
});
