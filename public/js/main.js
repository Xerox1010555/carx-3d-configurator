/**
 * CARX ATELIER — boot orchestrator.
 * Order: state → catalog → FX → chrome → 3D stage → GLB (real progress) → UI → PWA.
 */

import { state, loadPersisted, on } from "./core/state.js";
import { loadCatalog, knownIds, vehicle } from "./core/catalog.js";
import { applyHash, syncHash } from "./core/hash.js";
import { applyLang, setLang } from "./core/i18n.js";
import { installGlobalHandlers, report } from "./core/errors.js";
import { refreshRates } from "./core/fx.js";
import { initStage, hasWebGL, G, view, applyThemeToScene, step } from "./three/stage.js";
import { loadCar, car, applyReveal, tickTransitions } from "./three/car.js";
import { bindInput } from "./three/input.js";
import { initChoreography, scrollLogic, startStaticFallback } from "./three/choreography.js";
import {
  bindChrome, applyThemeGlobal, initReveals, initOffline, registerSW,
  runPreloader, setAssetProgress, markReady,
} from "./ui/chrome.js";
import {
  bindConfigurator, renderAll, applyCfgLive,
} from "./ui/configurator.js";
import { bindCart, cartBadgeUpdate } from "./ui/cart.js";
import { bindGarage } from "./ui/garage.js";
import { bindScreenshot } from "./ui/screenshot.js";
import { bindKiosk } from "./ui/kiosk.js";
import { bindNewsletter } from "./ui/newsletter.js";
import { bindGallery, renderGallery, gallerySectionVisible } from "./ui/gallery.js";
import { toast } from "./ui/toast.js";
import { t } from "./core/i18n.js";

installGlobalHandlers();

async function boot() {
  try {
    loadPersisted();

    // catalog (server-first, bundled fallback) — needed before hash validation
    await loadCatalog();
    applyHash(knownIds());
    syncHash();

    // chrome + prefs
    applyThemeGlobal(state.prefs.theme);
    applyLang();
    bindChrome();
    bindConfigurator();
    bindCart();
    bindGarage();
    bindScreenshot();
    bindKiosk();
    bindNewsletter();
    bindGallery();
    initOffline();
    registerSW();
    renderAll();
    cartBadgeUpdate();
    initReveals();
    initChoreography();
    window.addEventListener("resize", () => import("./three/choreography.js").then((m) => m.layoutKeys()));

    // language switch re-renders dynamic surfaces
    document.addEventListener("carx:rerender", () => { renderAll(); applyReveal(0); });
    // turntable pauses when the gallery scrolls out of view
    document.addEventListener("carx:galleryDominant", (e) => gallerySectionVisible(!!e.detail));

    // 3D
    const glOk = hasWebGL();
    if (glOk && initStage(document.getElementById("gl"))) {
      G.onFrame = (dt, now) => {
        scrollLogic();
        tickTransitions(now);
      };
      bindInput([document.getElementById("dragzone"), document.getElementById("cfgStage"), document.getElementById("galStage")]);
      loadCar(vehicle().glbPath || "/assets/models/bmw_m5_e34.glb", {
        onProgress: (p) => setAssetProgress(p),
        onDone: () => {
          markReady();
          applyCfgLive();       // paint/rims/calipers/roof for saved cfg
          applyReveal(0);
          syncHash();
          renderGallery();      // gallery views are measured from the real model
          document.dispatchEvent(new CustomEvent("carx:carReady"));
        },
        onError: (e) => {
          report("car-load", e);
          markReady();
          showFallback();
        },
      });
      // safety: if nothing loaded after 25s (bad network), reveal anyway
      setTimeout(() => { if (!car.ready) markReady(); }, 25000);
    } else {
      markReady();
      showFallback();
    }

    startFX();
    runPreloader();

    // hero title reveal
    setTimeout(() => document.getElementById("heroTitle")?.classList.add("revealed"), 260);

    // debug/testing API (read-mostly)
    window.CARX = {
      version: "2.0.0",
      get state() { return state; },
      get catalog() { return vehicle(); },
      three: () => ({ ok: G.ready, scene: G.scene, cam: G.cam, view }),
      car: () => car.root,
      errors: () => [],
      /** Jump the camera to its targets instantly (testing aid — rAF may be suspended). */
      snapView: () => {
        view.ry = view.ryT + view.userYaw;
        view.rx = view.rxT;
        view.dist = view.distT;
        view.fov = view.fovT;
        view.camYOffset = view.camYOffsetT;
        view.xT = view.xTT;
        view.yT = view.yTT;
        view.tx = view.txT;
        view.ty = view.tyT;
        view.tz = view.tzT;
        view.light = view.lightT;
        if (G.interiorLight) G.interiorLight.intensity = view.light;
      },
      setCfg: (patch) => {
        for (const [kind, id] of Object.entries(patch)) {
          import("./ui/configurator.js").then((m) => m.selectOption(kind, id, { silent: true }));
        }
      },
      explode: (v) => applyReveal(v),
      /** Force one frame: applies pending material transitions + renders once (testing/occluded-window aid). */
      renderNow: () => {
        scrollLogic();
        // rAF may be suspended (occluded window) — solve the camera explicitly
        for (let i = 0; i < 30; i++) step(1 / 60);
        tickTransitions(performance.now());
        if (G.renderer && G.scene && G.cam) G.renderer.render(G.scene, G.cam);
      },
    };
  } catch (e) {
    report("boot", e);
    markReady();
  }
}

function showFallback() {
  document.body.classList.add("no-webgl");
  document.getElementById("fbCar")?.removeAttribute("hidden");
  document.getElementById("cfgFallback")?.removeAttribute("hidden");
  startStaticFallback();
  toast(t("toastWebgl"), "warn");
}

async function startFX() {
  await refreshRates();
  // re-render everything once rates land
  renderAll();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
