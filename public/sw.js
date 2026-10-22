/* CARX ATELIER — service worker: offline-first shell, cache-first immutable assets. */

const VERSION = "carx-v2";
const SHELL_CACHE = VERSION + "-shell";
const ASSET_CACHE = VERSION + "-assets";
const API_CACHE = VERSION + "-api";

const SHELL = [
  "/",
  "/css/studio.css",
  "/css/features.css",
  "/js/main.js",
  "/js/core/state.js", "/js/core/utils.js", "/js/core/storage.js", "/js/core/i18n.js",
  "/js/core/fx.js", "/js/core/hash.js", "/js/core/errors.js", "/js/core/catalog.js",
  "/js/api/client.js", "/js/analytics.js",
  "/js/three/stage.js", "/js/three/car.js", "/js/three/input.js", "/js/three/choreography.js",
  "/js/ui/chrome.js", "/js/ui/configurator.js", "/js/ui/cart.js", "/js/ui/garage.js",
  "/js/ui/screenshot.js", "/js/ui/kiosk.js", "/js/ui/newsletter.js", "/js/ui/toast.js",
  "/vendor/three/three.module.js",
  "/vendor/three/three.core.js",
  "/manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // 1) immutable big assets (GLB, vendor libs) → cache-first
  if (url.pathname.endsWith(".glb") || url.pathname.startsWith("/vendor/")) {
    e.respondWith(
      caches.open(ASSET_CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // 2) API: network-first with short cache (FX + catalog survive offline)
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && (url.pathname.endsWith("/fx") || url.pathname.startsWith("/api/vehicles"))) {
            const c = caches.open(API_CACHE);
            c.then((cc) => cc.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 3) shell/navigation: network-first, cached fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && url.origin === location.origin) {
          const c = caches.open(SHELL_CACHE);
          c.then((cc) => cc.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(async () => (await caches.match(e.request)) || (e.request.mode === "navigate" ? caches.match("/") : Response.error()))
  );
});
