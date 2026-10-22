# CARX ATELIER — API Reference

Base URL: `/api` · JSON in/out · rate-limited on write endpoints (429 + `Retry-After`).

## Public

### `GET /health` → `200 { ok, ts }`

### `GET /vehicles` → `{ vehicles: [{ id, slug, brand, model, yearFrom, yearTo, basePriceUSD, glbPath, specs }] }`

### `GET /vehicles/:slug` → `{ vehicle: { …, paints[], wheels[], roofs[], trims[] } }`

### `GET /vehicles/:slug/price?paint=&wheels=&roof=&trim=`
Server-authoritative price for a configuration.

```json
{ "totalUSD": 119600,
  "key": "bmw-m5-e34-touring|obsidian|carbon|carbon|sport",
  "parts": { "base": 98000, "paint": 6800, "wheels": 6400, "roof": 5200, "trim": 3200 } }
```
Unknown ids → defaults; no valid vehicle → `404`, no options at all → `422`.

### `GET /showrooms` → `{ showrooms: [{ id, cityEn, cityAr, hallEn, hallAr, address, phone, lat, lng, hours }] }`

### `GET /fx` → `{ rates: { USD, EGP, AED, SAR }, fetchedAt, source: "live"|"fallback" }`
Server cache, 6-hour TTL, static fallback when the upstream API is unreachable.

### `POST /orders`
Demo order; **prices are recomputed server-side**. Rate-limited 30/min/IP.

```json
{ "name": "…", "phone": "…", "city": "…", "email": "…", "currency": "EGP",
  "items": [ { "vehicleSlug": "bmw-m5-e34-touring", "paintId": "emerald",
               "wheelId": "carbon", "roofId": "carbon", "trimId": "sport", "qty": 1 } ] }
```
→ `201 { code: "CRX-123456", currency, fxRate, subtotalUSD, totalCharged, status: "demo" }`

Errors: `422 invalid_name | empty_cart | unknown_vehicle | invalid_option`, `429 rate_limited`.

### `GET /orders/:code` → `{ order: { code, currency, subtotalUsd, totalCharged, status, items[] } }` · `404` if unknown.

### `POST /leads` — `{ name?, phone?|email?, city?, source?, configKey? }` → `201 { ok }` (phone or email required).

### `POST /newsletter` — `{ email, locale }` → `201 { ok, unsubscribeToken }`
### `DELETE /newsletter/:token` → `{ ok }` · `404` unknown token.

### `POST /events` — privacy-light analytics
Kinds: `select_paint | select_wheel | select_roof | select_trim | add_cart | share | screenshot | garage_save | client_error` → `204`.

## Admin (`Authorization: Bearer <JWT>`)

### `POST /admin/login` — `{ email, password }` → `{ token }` (8h) · `401` bad credentials · `429` 8/min.

### `GET /admin/orders?limit=` → `{ orders: [{ id, code, name, phone, city, currency, subtotalUsd, totalCharged, status, createdAt, items[] }] }`
### `PATCH /admin/orders/:id/status` — `{ status: pending|demo|paid|fulfilled|cancelled }`
### `GET /admin/leads?limit=` → `{ leads: [...] }`
### `GET /admin/subscribers` → `{ subscribers: [...] }`
### `GET /admin/catalog` → full option catalog (for pricing edits)
### `PATCH /admin/options/:table/:id` — table ∈ `paints|wheels|roofs|trims`, `{ priceUSD }`
### `GET /admin/stats`
```json
{ "totals": { "orders", "leads", "revenueUSD" },
  "heatmap30d": { "select_paint", "select_wheel", "select_roof", "select_trim", "add_cart", "share" },
  "topPaints": [{ "id", "c" }], "topWheels": [], "topRoofs": [], "topTrims": [],
  "recentEvents": [{ "kind", "payloadJson", "createdAt" }] }
```

## Security posture

- Helmet-style headers, strict CSP (no inline scripts), `X-Frame-Options: DENY`,
  `nosniff`, locked CORS (same-origin), 64 kB JSON body cap.
- Passwords: `scrypt` (16-byte salt, 64-byte key) with `timingSafeEqual` compare.
- Tokens: HS256 JWT built/verified with `node:crypto` (constant-time compare).
- All inputs length-capped and sanitized; no SQL string concatenation (bound params).
- No card data is ever accepted or stored — checkout is explicitly a demo.
