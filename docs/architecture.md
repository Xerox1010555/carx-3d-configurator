# CARX ATELIER — Architecture

> Interactive 3D configurator studio for the BMW M5 E34.
> Version 2.0 — rebuilt from the original single-file demo (archived in `legacy/`).

## High-level

```
Browser (static SPA, ES modules, no bundler)
  ├─ 3D stage .......... Three.js r186 (self-hosted in /vendor, no CDN)
  ├─ Configurator UI ... vanilla ES modules under public/js/
  ├─ PWA ............... manifest + service worker (offline shell + cached GLB)
  └─ API client ........ fetch wrapper w/ timeout, server-first w/ local fallback
          │  /api/* (JSON, strict CSP, rate-limited)
Node.js (Express 5)
  ├─ routes/catalog .... vehicles, options, server-authoritative price, showrooms, FX
  ├─ routes/shop ....… -- orders, leads, newsletter, analytics events
  ├─ routes/admin ...... JWT login, orders/leads/stats, live option pricing
  ├─ auth .............. scrypt password hashing + HMAC-JWT (hand-rolled, no deps)
  └─ SQLite (node:sqlite) — schema + seed in server/db.js, server/seed.js
```

## Key design decisions

1. **One load, live mutation.** The GLB (Draco-compressed, 27 MB → 4.5 MB) is loaded
   once. Every configurator choice mutates materials/nodes in place — there are no
   model reloads on selection.
2. **Explicit material allowlists** (`public/js/three/car.js`):
   - paint → `E34_CAR_PAINT` (blackbody/glass/tyre materials are deliberately excluded)
   - rims → `RIM_CHROME`, `ext_rim_metal`
   - calipers → `CAR_PinzaFreni`
   - roof → procedural skin built by raycasting the roof surface from above
     (carbon weave canvas texture / dark panorama glass), cached per variant.
3. **Server-authoritative pricing.** The client displays prices from the same
   catalog the server prices orders from; the server recomputes totals on
   `POST /api/orders` and never trusts client numbers.
4. **Single rAF loop.** Stage render, material transitions and scroll
   choreography run in one animation frame loop (`stage.js` → `G.onFrame`).
   A `setTimeout` fallback poller only exists when WebGL is unavailable.
5. **Strict CSP** (header + meta): `script-src 'self' 'wasm-unsafe-eval'` (Draco WASM),
   `connect-src 'self' blob:` (GLTF texture blobs), `worker-src 'self' blob:`
   (GLTF parser worker), `img-src 'self' data: blob:`. No `unsafe-inline` scripts —
   Three.js vendor files are patched to use direct relative imports instead of an
   import map (import maps would require an inline script).
6. **Privacy-light analytics.** Whitelisted events only (choice heatmap, shares,
   screenshots) with no IPs or fingerprints, stored in the `events` table.
7. **Offline-first.** The service worker precaches the shell, cache-first for the
   GLB + vendor libs, network-first with cache fallback for FX/catalog APIs.
   The catalog also has a bundled fallback (`shared/catalog.mjs`) so the
   configurator remains fully usable with zero network.

## State & persistence

| Data | Where |
|---|---|
| prefs (currency/lang/theme), cfg, cart, garage | `localStorage` (`carx:*`) |
| orders, leads, subscribers, events, pricing | SQLite (`data/carx.db`) |
| shareable build state | URL hash `#paint=…&wheels=…&roof=…&trim=…` |
| FX rates | server memory (6h TTL) + `localStorage` mirror |

## Frontend module map

```
public/js/
  main.js            boot orchestrator + debug API (window.CARX)
  core/              state, storage, i18n (EN/AR + RTL), fx, hash, errors, catalog
  api/client.js      fetch w/ timeout + ApiError
  three/             stage (renderer/lights/loop), car (GLB + materials),
                     input (drag/pinch), choreography (8 scroll poses + story)
  ui/                chrome (nav/menu/theme/cursor/preloader/SW), configurator,
                     cart+checkout, garage, screenshot, kiosk, newsletter, toast
  analytics.js       batched heatmap events
  admin.js           admin console
```

## Scripts

| npm script | Purpose |
|---|---|
| `npm start` | run server (port 4173, `PORT` to override) |
| `npm run dev` | run with `node --watch` |
| `npm run seed` | idempotent catalog + admin seed |
| `npm run optimize-assets` | re-compress `assets-src/bmw_m5_e34.glb` → `public/assets/models/` |
| `npm run smoke` | API smoke tests against a running server |

## Deployment notes

- Set `CARX_JWT_SECRET`, `CARX_ADMIN_EMAIL`, `CARX_ADMIN_PASSWORD` in production.
- Put the Node server behind TLS (service workers require HTTPS outside localhost).
- Static assets under `/vendor` and the GLB are served immutable for a year;
  bump `VERSION` in `public/sw.js` when publishing shell changes.
