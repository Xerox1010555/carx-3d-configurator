/** CARX — Three.js stage: renderer, camera rig, showroom environment, lights, single rAF loop. */

import * as THREE from "/vendor/three/three.module.js";
import { clamp, lerp } from "../core/utils.js";
import { report } from "../core/errors.js";
import { buildShowroom, applyShowroomTheme, setGroundY, showroom } from "./showroom.js";

/* view = the camera rig state. `*T` fields are targets written by choreography/
   gallery; the plain fields are damped currents used by advance() — so every
   pose change animates instead of snapping. tz = lookAt depth along the car's
   length axis (nose/tail/cabin), light = cabin light intensity. */
export const view = {
  ry: -0.62, ryT: -0.62, rx: -0.02, rxT: -0.02,
  dist: 8.6, distT: 8.6,
  xT: 0, xTT: 0,              // orbit centre X (target + current)
  yT: -0.62, yTT: -0.62,      // orbit centre Y (= camera base height)
  tx: 0, txT: 0, ty: -0.12, tyT: -0.12, tz: 0, tzT: 0,  // lookAt target
  camYOffset: 0.62, camYOffsetT: 0.62,
  fov: 34, fovT: 34,          // wider fov for interior / close-ups
  light: 0, lightT: 0,        // cabin light intensity target
  userYaw: 0, userYawT: 0,    // drag offset layered on choreography
  autoRotate: false,
};

export const G = {
  renderer: null, scene: null, cam: null, spin: null, dust: null,
  interiorLight: null,
  ready: false, reduce: false, dpr: 1, onFrame: null,
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
      canvas, antialias: true, alpha: false, powerPreference: "high-performance",
      preserveDrawingBuffer: true,  // needed for screenshot export
    });
    G.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    renderer.setPixelRatio(G.dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060c);
    const cam = new THREE.PerspectiveCamera(34, 1, 0.02, 160);
    cam.position.set(0, 0.5, 8.6);

    const spin = new THREE.Group();
    scene.add(spin);

    // showroom first — it feeds the environment map
    buildShowroom(scene);
    buildEnvironment(scene, renderer);
    buildLights(scene);
    buildDustBlob(scene);
    G.dust = buildDust(scene);
    buildInteriorLight(scene);

    G.renderer = renderer; G.scene = scene; G.cam = cam; G.spin = spin;

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

/* PMREM environment built FROM the showroom room → glass/paint reflect the hall. */
function buildEnvironment(scene, renderer) {
  try {
    const rt = new THREE.PMREMGenerator(renderer);
    const envTex = rt.fromScene(scene, 0.06).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 1.25;
    rt.dispose();
  } catch (e) { report("env", e); }
}

function buildLights(scene) {
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xcfe0ff, 1.9);
  rim.position.set(-5, 3.5, -5.5);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xfff1dd, 0.9);
  fill.position.set(-3, 2, 4);
  scene.add(fill);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a160e, 0.75));

  // ceiling spots: light the platform like a real showroom rig
  const spot1 = new THREE.SpotLight(0xfff6e6, 260, 24, 0.55, 0.55, 1.6);
  spot1.position.set(3.4, 7.2, 2.6);
  spot1.target.position.set(0, -1, 0);
  scene.add(spot1, spot1.target);
  const spot2 = new THREE.SpotLight(0xeaf1ff, 180, 24, 0.6, 0.6, 1.6);
  spot2.position.set(-3.6, 7.2, -2.4);
  spot2.target.position.set(0, -1, 0);
  scene.add(spot2, spot2.target);
}

/* soft contact shadow blob (the showroom floor already receives real shadows) */
let blobMesh = null;
function buildDustBlob(scene) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const cx = cv.getContext("2d");
  const gr = cx.createRadialGradient(128, 128, 8, 128, 128, 126);
  gr.addColorStop(0, "rgba(0,0,0,0.55)");
  gr.addColorStop(0.55, "rgba(0,0,0,0.22)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = gr;
  cx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  blobMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 3.2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  blobMesh.rotation.x = -Math.PI / 2;
  blobMesh.position.y = -1.21;
  blobMesh.renderOrder = 1;
  scene.add(blobMesh);
}

function buildDust(scene) {
  const N = 160;
  const pos = new Float32Array(N * 3);
  const speeds = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = Math.random() * 5 - 1;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    speeds.push(0.05 + Math.random() * 0.12);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xcbb688, size: 0.02, transparent: true, opacity: 0.4,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  dust.userData.speeds = speeds;
  scene.add(dust);
  return dust;
}

/* warm cabin light for interior views — only lit when the camera is inside.
   Physical decay (2) over ~1.5 m needs a high raw intensity to read through
   dark interior materials, so advance() scales the view.light channel down. */
function buildInteriorLight(scene) {
  const light = new THREE.PointLight(0xffe2bd, 0, 6, 2);
  light.position.set(0, 0.1, 0);
  scene.add(light);
  G.interiorLight = light;
}

export function placeInteriorLight(x, y, z) {
  if (G.interiorLight) G.interiorLight.position.set(x, y, z);
}

/** Move floor + blob + platform so the car stands exactly on the ground. */
export function setGround(y) {
  setGroundY(y);
  if (blobMesh) blobMesh.position.y = y + 0.012;
}

export function applyThemeToScene(theme) {
  if (!G.scene) return;
  const dark = theme !== "light";
  applyShowroomTheme(theme);
  if (G.dust) G.dust.material.opacity = dark ? 0.4 : 0.14;
  G.renderer.toneMappingExposure = dark ? 1.28 : 1.05;
  G.scene.background = new THREE.Color(dark ? 0x04060c : 0xe9edf4);
}

/** Current turntable angle in degrees (0–360). */
export function angleDeg() {
  const a = (view.ry + view.userYaw) * 180 / Math.PI;
  return ((a % 360) + 360) % 360;
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

/** One damping step + camera solve — used by the loop and by renderNow() when rAF is suspended. */
export function step(dt) { advance(clamp(dt, 0.001, 0.06)); }

function advance(dt) {
  const kDamp = 1 - Math.pow(0.0016, dt);
  view.ry = lerp(view.ry, view.ryT + view.userYaw, kDamp);
  view.rx = lerp(view.rx, view.rxT, kDamp);
  view.dist = lerp(view.dist, view.distT, kDamp);
  view.fov = lerp(view.fov, view.fovT, kDamp);
  view.camYOffset = lerp(view.camYOffset, view.camYOffsetT, kDamp);
  // damped pose channels: every pose change eases instead of snapping
  view.xT = lerp(view.xT, view.xTT, kDamp);
  view.yT = lerp(view.yT, view.yTT, kDamp);
  view.tx = lerp(view.tx, view.txT, kDamp);
  view.ty = lerp(view.ty, view.tyT, kDamp);
  view.tz = lerp(view.tz, view.tzT, kDamp);
  view.light = lerp(view.light, view.lightT, kDamp);
  if (G.interiorLight) G.interiorLight.intensity = view.light * 30;
  if (view.autoRotate && !G.reduce) view.userYawT += dt * 0.5;
  view.userYaw = lerp(view.userYaw, view.userYawT, kDamp);

  const bob = G.reduce ? 0 : Math.sin(performance.now() * 0.00042) * 0.02;
  const cam = G.cam;
  const rx = clamp(view.rx, -1.35, 0.6);
  cam.position.x = view.xT + Math.sin(view.ry) * Math.cos(rx) * view.dist;
  cam.position.z = Math.cos(view.ry) * Math.cos(rx) * view.dist;
  cam.position.y = view.yT - Math.sin(rx) * view.dist + view.camYOffset + bob;
  cam.lookAt(view.tx, view.ty, view.tz);
  if (Math.abs(cam.fov - view.fov) > 0.05) {
    cam.fov = view.fov;
    cam.updateProjectionMatrix();
  }

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

export { showroom };
