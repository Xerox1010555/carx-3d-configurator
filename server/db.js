/**
 * CARX ATELIER — SQLite persistence (node:sqlite, zero native deps).
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDataDir() {
  if (process.env.CARX_DATA_DIR) return process.env.CARX_DATA_DIR;
  const local = path.join(__dirname, "..", "data");
  try {
    mkdirSync(local, { recursive: true });
    return local;
  } catch {
    // Read-only filesystem (e.g. Vercel serverless) → fall back to /tmp
    return "/tmp/carx-data";
  }
}

const DATA_DIR = resolveDataDir();
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "carx.db"));
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export function initSchema() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL,
    year_from INTEGER, year_to INTEGER, base_price_usd REAL NOT NULL, specs_json TEXT NOT NULL,
    glb_path TEXT, is_active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS paints (
    id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    name_en TEXT, name_ar TEXT, hex TEXT, metalness REAL DEFAULT .5, roughness REAL DEFAULT .3,
    price_usd REAL DEFAULT 0, is_default INTEGER DEFAULT 0, sort INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS wheels (
    id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    name_en TEXT, name_ar TEXT, spokes INTEGER, style_code TEXT, rim_hex TEXT,
    metalness REAL DEFAULT .9, roughness REAL DEFAULT .2, price_usd REAL DEFAULT 0,
    is_default INTEGER DEFAULT 0, sort INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS roofs (
    id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    name_en TEXT, name_ar TEXT, variant_code TEXT, price_usd REAL DEFAULT 0,
    is_default INTEGER DEFAULT 0, sort INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS trims (
    id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    name_en TEXT, name_ar TEXT, accent_hex TEXT, caliper_hex TEXT, price_usd REAL DEFAULT 0,
    is_default INTEGER DEFAULT 0, sort INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, phone TEXT, city TEXT,
    currency TEXT NOT NULL DEFAULT 'USD', subtotal_usd REAL NOT NULL, fx_rate REAL NOT NULL DEFAULT 1,
    total_charged REAL NOT NULL, status TEXT NOT NULL DEFAULT 'demo',
    lead_id TEXT, created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id),
    vehicle_id TEXT, paint_id TEXT, wheel_id TEXT, roof_id TEXT, trim_id TEXT,
    config_key TEXT, qty INTEGER NOT NULL DEFAULT 1, unit_price_usd REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, city TEXT,
    source TEXT, config_key TEXT, status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, locale TEXT DEFAULT 'en',
    token TEXT UNIQUE NOT NULL, confirmed_at INTEGER, unsubscribed_at INTEGER, created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS showrooms (
    id TEXT PRIMARY KEY, city_en TEXT, city_ar TEXT, hall_en TEXT, hall_ar TEXT,
    address TEXT, phone TEXT, lat REAL, lng REAL, hours_json TEXT
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, payload_json TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);
  `);
}

export const q = {
  get: (sql, ...args) => db.prepare(sql).get(...args),
  all: (sql, ...args) => db.prepare(sql).all(...args),
  run: (sql, ...args) => db.prepare(sql).run(...args),
  exec: (sql) => db.exec(sql),
};

/** Map a DB row to the camelCase catalog shape used across the app. */
export function rowToOption(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    // SQLite "price_usd" must land as "priceUSD" (catalog convention), not "priceUsd".
    out[camel === "priceUsd" ? "priceUSD" : camel] = v;
  }
  return out;
}
