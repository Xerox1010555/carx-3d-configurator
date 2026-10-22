/**
 * CARX — API smoke test (run against a live server).
 * Usage: npm run smoke   (server must be running, or set CARX_URL)
 */

const BASE = process.env.CARX_URL || "http://localhost:4173";
let failures = 0;

async function check(name, fn) {
  try {
    const out = await fn();
    console.log(`  ✓ ${name}${out ? " → " + JSON.stringify(out).slice(0, 90) : ""}`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${name} → ${e.message}`);
  }
}

const getJSON = async (url, opts) => {
  const res = await fetch(BASE + url, opts);
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(body)}`);
  return body;
};
const postJSON = (url, body, opts) =>
  getJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    body: JSON.stringify(body),
    ...opts,
  });

console.log(`CARX smoke → ${BASE}`);

await check("health", () => getJSON("/api/health"));
const veh = await check("catalog", async () => (await getJSON("/api/vehicles/bmw-m5-e34-touring")).vehicle);
await check("price (server-authoritative)", async () => {
  const j = await getJSON("/api/vehicles/bmw-m5-e34-touring/price?paint=obsidian&wheels=carbon&roof=carbon&trim=sport");
  if (j.totalUSD !== 119600) throw new Error(`expected 119600, got ${j.totalUSD}`);
  return { totalUSD: j.totalUSD };
});
await check("order + FX", async () => {
  const j = await postJSON("/api/orders", {
    name: "Smoke Bot", phone: "+10000000000", currency: "EGP",
    items: [{ vehicleSlug: veh?.slug || "bmw-m5-e34-touring", paintId: "emerald", wheelId: "aero5", roofId: "fixed", trimId: "standard", qty: 1 }],
  });
  if (!/^CRX-\d{6}$/.test(j.code)) throw new Error("bad order code");
  return { code: j.code, totalCharged: j.totalCharged };
});
await check("order lookup", () => getJSON("/api/orders/CRX-000000").then(() => { throw new Error("expected 404"); }, () => ({ notFound: true })));
await check("newsletter + unsubscribe", async () => {
  const j = await postJSON("/api/newsletter", { email: "smoke@example.com", locale: "en" });
  await fetch(`${BASE}/api/newsletter/${j.unsubscribeToken}`, { method: "DELETE" });
  return { token: j.unsubscribeToken?.slice(0, 6) + "…" };
});
await check("events (heatmap)", () => postJSON("/api/events", { kind: "select_paint", id: "glacier", lang: "en" }));
await check("admin login + stats", async () => {
  const l = await postJSON("/api/admin/login", { email: process.env.CARX_ADMIN_EMAIL || "admin@carx.local", password: process.env.CARX_ADMIN_PASSWORD || "carx-admin-2026" });
  const stats = await getJSON("/api/admin/stats", { headers: { Authorization: `Bearer ${l.token}` } });
  return { orders: stats.totals.orders };
});
await check("admin rejects bad token", async () => {
  const res = await fetch(BASE + "/api/admin/stats", { headers: { Authorization: "Bearer bogus" } });
  if (res.status !== 401) throw new Error("expected 401");
  return { ok: true };
});
await check("static shell served", async () => {
  const res = await fetch(BASE + "/");
  if (!res.ok) throw new Error("index missing");
  return { csp: res.headers.get("content-security-policy")?.includes("script-src 'self'") };
});

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
