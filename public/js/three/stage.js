/** CARX — Three.js stage: renderer, camera rig, studio lighting, floor, dust, theme. */

import * as THREE from "/vendor/three/three.module.js";
import { clamp, lerp } from "../core/utils.js";
import { report } from "../core/errors.js";

export const view = {
  ry: -0.62, ryT: -0.62, rx: -0.02, rxT: -0.02,
  dist: 8.6, distT: 8.6, xT: 0, yT: -0.62,
  userYaw: 0, userYawT: 0,   // drag offset layered on choreography
  autoRotate: false,
};

export const G = {
  renderer: null, scene: null, cam: null, spin: null, dust: null,
  pmrem: null, ready: false, reduce: false, dpr: 1, fpsSlow: 0, onFrame: null,
};

export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

export function initStage(canvas) {
  try {
    G.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: "high-performance",
      preserveDrawingBuffer: true,  // needed for screenshot export
    });
    G.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    renderer.setPixelRatio(G.dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    cam.position.set(0, 0.5, 8.6);

    const spin = new THREE.Group();
    scene.add(spin);

    buildEnvironment(scene, renderer);
    buildLights(scene);
    buildFloor(scene);
    G.dust = buildDust(scene);

    G.renderer = renderer; G.scene = scene; G.cam = cam; G.spin = spin; G.pmrem = renderer;

    // context loss / restore — recover without a page reload
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      report("webgl", new Error("context lost"));
    });
    canvas.addEventListener("webglcontextrestored", () => {
      try { applyThemeToScene(document.documentElement.dataset.theme); } catch (err) { report("webgl-restore", err); }
    });

    onResize();
    window.addEventListener("resize", onResize);
    G.ready = true;
    startLoop();
    return true;
  } catch (e) {
    report("three-init", e);
    G.ready = false;
    return false;
  }
}

function buildEnvironment(scene, renderer) {
  try {
    // Procedural studio environment (no external HDR): emissive light cards → PMREM.
    const es = new THREE.Scene();
    const mk = (color, w, h, x, y, z, ry, rx, intensity) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
      );
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, 0);
      es.add(m);
    };
    mk(0xffffff, 8, 4, 0, 5.5, 0, 0, Math.PI / 2, 3.2);      // top softbox
    mk(0xbfd4ff, 6, 3, -6, 2.5, 0, Math.PI / 2, 0, 1.4);     // cool left
    mk(0xffe3c0, 6, 3, 6, 2.5, 0, -Math.PI / 2, 0, 1.2);     // warm right
    mk(0x9fb6d8, 6, 3, 0, 2.5, -6, 0, 0, 0.8);               // back fill
    const bounce = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: 0x1a1408 })
    );
    bounce.rotation.x = -Math.PI / 2;
    bounce.position.y = -1.2;
    es.add(bounce);
    const rt = new THREE.PMREMGenerator(renderer);
    const envTex = rt.fromScene(es, 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.9;
    rt.dispose();
    es.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  } catch (e) { report("env", e); }
}

function buildLights(scene) {
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xcfe0ff, 1.5);
  rim.position.set(-5, 3.5, -5.5);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xfff1dd, 0.55);
  fill.position.set(-3, 2, 4);
  scene.add(fill);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x141008, 0.5));
}

let floorMesh = null;
function buildFloor(scene) {
  const geo = new THREE.CircleGeometry(14, 64);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.92, metalness: 0.05 });
  floorMesh = new THREE.Mesh(geo, mat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -1.22;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // contact shadow blob
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const cx = cv.getContext("2d");
  const gr = cx.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(0,0,0,0.62)");
  gr.addColorStop(0.55, "rgba(0,0,0,0.28)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = gr;
  cx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 3.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = -1.21;
  blob.renderOrder = 1;
  scene.add(blob);
}

function buildDust(scene) {
  const N = 200;
  const pos = new Float32Array(N * 3);
  const speeds = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 1] = Math.random() * 5 - 1;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    speeds.push(0.05 + Math.random() * 0.12);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xcbb688, size: 0.02, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  dust.userData.speeds = speeds;
  scene.add(dust);
  return dust;
}

export function applyThemeToScene(theme) {
  if (!G.scene) return;
  const dark = theme !== "light";
  if (floorMesh) {
    floorMesh.material.color.set(dark ? 0x0a0c0f : 0xe9eaec);
    floorMesh.material.roughness = dark ? 0.92 : 0.8;
  }
  if (G.dust) G.dust.material.opacity = dark ? 0.5 : 0.16;
  G.renderer.toneMappingExposure = dark ? 1.08 : 0.98;
}

function onResize() {
  if (!G.renderer) return;
  const w = window.innerWidth, h = window.innerHeight;
  G.renderer.setSize(w, h, false);
  G.cam.aspect = w / h;
  G.cam.updateProjectionMatrix();
}

/* ---- the single rAF loop: choreography + inertia + render ---- */
let last = performance.now();
let slowFrames = 0;

function startLoop() {
  const tick = () => {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = clamp((now - last) / 1000, 0.001, 0.06);
    last = now;
    try {
      advance(dt);
      if (G.onFrame) G.onFrame(dt, now);
      G.renderer.render(G.scene, G.cam);
      // adaptive quality: sustained slow frames → drop DPR once
      if (dt > 0.034) { slowFrames++; } else { slowFrames = Math.max(0, slowFrames - 1); }
      if (slowFrames > 90 && G.dpr > 1) {
        G.dpr = 1; G.renderer.setPixelRatio(1); slowFrames = 0;
      }
    } catch (e) {
      report("frame", e);
    }
  };
  requestAnimationFrame(tick);
}

function advance(dt) {
  const kDamp = 1 - Math.pow(0.0016, dt);
  view.ry = lerp(view.ry, view.ryT + view.userYaw, kDamp);
  view.rx = lerp(view.rx, view.rxT, kDamp);
  view.dist = lerp(view.dist, view.distT, kDamp);
  if (view.autoRotate && !G.reduce) view.userYawT += dt * 0.35;
  view.userYaw = lerp(view.userYaw, view.userYawT, kDamp);

  const bob = G.reduce ? 0 : Math.sin(performance.now() * 0.00042) * 0.02;
  const cam = G.cam;
  const rx = clamp(view.rx, -1.2, 0.5);
  cam.position.x = view.xT + Math.sin(view.ry) * Math.cos(rx) * view.dist;
  cam.position.z = Math.cos(view.ry) * Math.cos(rx) * view.dist;
  cam.position.y = view.yT - Math.sin(rx) * view.dist + 0.62 + bob;
  cam.lookAt(view.xT * 0.9, -0.12, 0);

  if (G.dust && !G.reduce) {
    const arr = G.dust.geometry.attributes.position.array;
    const sp = G.dust.userData.speeds;
    for (let i = 0; i < sp.length; i++) {
      arr[i * 3 + 1] += sp[i] * dt;
      if (arr[i * 3 + 1] > 4.2) arr[i * 3 + 1] = -1.1;
    }
    G.dust.geometry.attributes.position.needsUpdate = true;
  }
}
