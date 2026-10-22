# CARX ATELIER — BMW M5 E34 Studio

Interactive 3D car configurator studio: a real GLB model of the BMW M5 E34,
live paint/rim/caliper/roof customisation, shareable builds, a garage,
demo checkout with a real order book, and an admin console.

**Version 2.0** — full-stack rebuild (the original single-file demo is archived in `legacy/`).

## Quick start

```bash
npm install
npm run seed          # optional — the server also seeds itself on boot
npm start             # → http://localhost:4173
```

- Studio: http://localhost:4173
- Admin console: http://localhost:4173/admin — `admin@carx.local` / `carx-admin-2026`
  (override with `CARX_ADMIN_EMAIL` / `CARX_ADMIN_PASSWORD`)

```bash
npm run dev           # node --watch
npm run smoke         # API smoke tests (server must be running)
npm run optimize-assets   # re-compress the source GLB (27 MB → ~4.5 MB)
```

## What's inside

| Layer | Tech |
|---|---|
| Frontend | Vanilla ES modules (no bundler), Three.js **r186 self-hosted** (no CDN), strict CSP |
| 3D | Draco-compressed GLB, PMREM studio lighting, single rAF loop, scroll choreography (8 poses), procedural roof skins (raycast), live material transitions |
| Backend | Node 24 + Express 5, JWT (HMAC) admin auth, scrypt passwords, rate limiting |
| Database | SQLite via built-in `node:sqlite` (`data/carx.db`), zero native deps |
| FX | Server-cached `open.er-api.com` rates (6 h TTL) with static fallback |
| PWA | manifest + service worker: offline shell, cached GLB, network-first APIs |
| i18n | English + Arabic (full RTL), dark/light themes |
| Tests | `scripts/smoke.mjs` — 10 API checks incl. server-side pricing assertions |

## Feature checklist

- [x] Real 3D model — loaded **once**, patched live (paint `E34_CAR_PAINT`, rims, calipers)
- [x] Procedural roof variants (carbon weave / panorama glass) generated from the real roof surface
- [x] Shareable builds (URL hash) · garage (save / load / compare / delete)
- [x] Cart → demo checkout → **server-priced** order with `CRX-` code + lookup
- [x] Lead capture ("call me back") → admin leads
- [x] Newsletter with token unsubscribe · showrooms from DB
- [x] Analytics heatmap (privacy-light) + stats in admin · live option pricing in admin
- [x] Screenshot export with watermark · kiosk mode (`?kiosk=1`) for showroom screens
- [x] PWA offline support · error reporting endpoint · offline banner
- [x] Accessibility: skip link, focus rings, aria-live toasts, reduced-motion support
- [x] Fallback path: no WebGL → static car illustration + fully working configurator

## Project layout

```
server/          Express app, routes, DB, auth, FX, seed
public/          SPA: index.html, css/, js/ (core · three · ui), vendor/three/, sw.js, admin.html
shared/          catalog.mjs — canonical vehicle/option data (server seed + client fallback)
scripts/         optimize-glb.mjs (asset pipeline), smoke.mjs (API tests)
assets-src/      original uncompressed GLB
data/            SQLite database (created on first run — git-ignored)
docs/            architecture.md, api.md
legacy/          v1 single-file demo + GLB inspection dump
```

## Configuration

| Env var | Default |
|---|---|
| `PORT` | `4173` |
| `CARX_JWT_SECRET` | dev secret — **change in production** |
| `CARX_ADMIN_EMAIL` | `admin@carx.local` |
| `CARX_ADMIN_PASSWORD` | `carx-admin-2026` |

All prices, vehicles and orders are demonstrative fiction — no real vehicles are sold.
