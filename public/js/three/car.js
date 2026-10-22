/** CARX — the real GLB car: material registry, live paint/rims/calipers, procedural roof skin. */

import * as THREE from "/vendor/three/three.module.js";
import { GLTFLoader } from "/vendor/three/loaders/GLTFLoader.js";
import { DRACOLoader } from "/vendor/three/loaders/DRACOLoader.js";
import { G, view } from "./stage.js";
import { report } from "../core/errors.js";
import { lerp } from "../core/utils.js";

/**
 * Explicit material allowlists taken from the GLB's actual material table.
 * NOTE: M34_BLACKBODY / E34_BLACKBODY_TRANSL are deliberately excluded from
 * paint tinting (they are black trim/glass, not body paint).
 */
const PAINT_MATERIALS = ["E34_CAR_PAINT"];
const RIM_MATERIALS = ["RIM_CHROME", "ext_rim_metal"];
const CALIPER_MATERIALS = ["CAR_PinzaFreni"];
const TIRE_MATERIALS = ["TIRE"];
const DISC_MATERIALS = ["CAR_DiscoFreni"];

export const car = {
  root: null,           // normalized model root (child of G.spin)
  mats: { paint: [], rim: [], caliper: [], tire: [], disc: [] },
  roofSkins: {},        // variantCode -> THREE.Mesh
  roofVariant: "fixed",
  loading: false,
  ready: false,
};

const transitions = []; // { mats, prop, from(THREE.Color|number), to, t0, dur }

function scheduleTransition(mats, prop, target, dur = 420) {
  const now = performance.now();
  for (const m of mats) {
    const current = prop === "color" ? m[prop].clone() : m[prop];
    // drop older pending transitions for the same material+prop
    const idx = transitions.findIndex((tr) => tr.mat === m && tr.prop === prop);
    if (idx >= 0) transitions.splice(idx, 1);
    transitions.push({ mat: m, prop, from: current, to: target, t0: now, dur });
  }
}

export function tickTransitions(now) {
  for (let i = transitions.length - 1; i >= 0; i--) {
    const tr = transitions[i];
    const p = Math.min(1, (now - tr.t0) / tr.dur);
    const e = 1 - Math.pow(1 - p, 3);
    if (tr.prop === "color") {
      tr.mat.color.copy(tr.from).lerp(tr.to, e);
    } else {
      tr.mat[tr.prop] = lerp(tr.from, tr.to, e);
    }
    if (p >= 1) transitions.splice(i, 1);
  }
}

/* ---------------- loading ---------------- */

export function loadCar(url, { onProgress, onDone, onError } = {}) {
  if (!G.ready) { onError?.(new Error("no-webgl")); return; }
  car.loading = true;
  disposeCar();

  const manager = new THREE.LoadingManager();
  manager.onProgress = (u, loaded, total) => onProgress?.(loaded / Math.max(1, total), u);
  const loader = new GLTFLoader(manager);
  const draco = new DRACOLoader(manager);
  draco.setDecoderPath("/vendor/three/libs/");
  loader.setDRACOLoader(draco);

  loader.load(url, (gltf) => {
    try {
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 4.5 / maxDim;
      root.position.set(-center.x * scale, -center.y * scale - 0.35, -center.z * scale);
      root.scale.setScalar(scale);
      root.rotation.y = Math.PI;

      car.mats = { paint: [], rim: [], caliper: [], tire: [], disc: [] };
      const seen = new Set();
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (!m || seen.has(m.uuid)) continue;
          seen.add(m.uuid);
          const nm = m.name || "";
          if (PAINT_MATERIALS.includes(nm)) {
            m.userData.home = { color: m.color.clone(), metalness: m.metalness, roughness: m.roughness };
            car.mats.paint.push(m);
          } else if (RIM_MATERIALS.includes(nm)) {
            m.userData.home = { color: m.color.clone(), metalness: m.metalness, roughness: m.roughness };
            car.mats.rim.push(m);
          } else if (CALIPER_MATERIALS.includes(nm)) {
            m.userData.home = { color: m.color.clone() };
            car.mats.caliper.push(m);
          } else if (TIRE_MATERIALS.includes(nm)) {
            car.mats.tire.push(m);
          } else if (DISC_MATERIALS.includes(nm)) {
            car.mats.disc.push(m);
          }
        }
      });

      car.root = root;
      car.root.userData.homeY = root.position.y;
      G.spin.add(root);
      car.ready = true;
      car.loading = false;
      onDone?.(root);
    } catch (e) {
      car.loading = false;
      report("car-setup", e);
      onError?.(e);
    }
  }, undefined, (e) => {
    car.loading = false;
    report("gltf", e);
    onError?.(e);
  });
}

export function disposeCar() {
  car.ready = false;
  car.roofSkins = {};
  if (car.root) {
    G.spin.remove(car.root);
    car.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    car.root = null;
  }
  car.mats = { paint: [], rim: [], caliper: [], tire: [], disc: [] };
}

/* ---------------- live configuration ---------------- */

export function applyPaint(paint) {
  if (!car.mats.paint.length) return;
  const color = new THREE.Color(paint.hex);
  scheduleTransition(car.mats.paint, "color", color);
  if (paint.metalness != null) scheduleTransition(car.mats.paint, "metalness", paint.metalness);
  if (paint.roughness != null) scheduleTransition(car.mats.paint, "roughness", paint.roughness);
}

export function applyWheels(wheel) {
  if (!car.mats.rim.length) return;
  const color = new THREE.Color(wheel.rimHex);
  scheduleTransition(car.mats.rim, "color", color);
  if (wheel.metalness != null) scheduleTransition(car.mats.rim, "metalness", wheel.metalness);
  if (wheel.roughness != null) scheduleTransition(car.mats.rim, "roughness", wheel.roughness);
  // carbon rims also de-chrome the tyre shine a touch
  for (const m of car.mats.tire) m.roughness = wheel.styleCode === "carbon" ? 0.95 : 0.85;
}

export function applyTrim(trim) {
  if (!car.mats.caliper.length) return;
  scheduleTransition(car.mats.caliper, "color", new THREE.Color(trim.caliperHex || trim.accentHex));
}

/* ---------------- procedural roof skin (raycast from above) ---------------- */

function carbonTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const cx = cv.getContext("2d");
  cx.fillStyle = "#17191d";
  cx.fillRect(0, 0, 256, 256);
  const cell = 16;
  for (let y = 0; y < 256; y += cell) {
    for (let x = 0; x < 256; x += cell) {
      const alt = ((x + y) / cell) % 2 === 0;
      const g = cx.createLinearGradient(x, y, x + cell, y + cell);
      if (alt) { g.addColorStop(0, "#2b2f36"); g.addColorStop(0.5, "#101216"); g.addColorStop(1, "#2b2f36"); }
      else { g.addColorStop(0, "#101216"); g.addColorStop(0.5, "#2b2f36"); g.addColorStop(1, "#101216"); }
      cx.fillStyle = g;
      cx.fillRect(x, y, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRoofSkin(variant) {
  if (!car.root) return null;
  const ray = new THREE.Raycaster();
  ray.far = 50;
  const box = new THREE.Box3().setFromObject(car.root);
  const size = box.getSize(new THREE.Vector3());
  const minX = box.min.x, minZ = box.min.z;
  const roofThresh = box.min.y + size.y * 0.62;   // top of the car only

  const NX = 42, NZ = 26;
  const stepX = size.x / NX, stepZ = size.z / NZ;
  const pts = [];        // NX+1 x NZ+1 grid of Vector3|null (world space)
  const nrm = [];
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, -1, 0);
  for (let i = 0; i <= NX; i++) {
    pts.push([]); nrm.push([]);
    for (let j = 0; j <= NZ; j++) {
      origin.set(minX + i * stepX, box.max.y + 1.5, minZ + j * stepZ);
      ray.set(origin, dir);
      const hits = ray.intersectObject(car.root, true);
      const hit = hits.find((h) => h.point.y >= roofThresh && h.face && h.face.normal);
      if (hit) {
        // world normal → account for object rotation
        const wn = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        if (wn.y > 0.72) { pts[i].push(hit.point.clone()); nrm[i].push(wn); continue; }
      }
      pts[i].push(null); nrm[i].push(null);
    }
  }

  const positions = [];
  const uvs = [];
  const pushQuad = (a, b, c, d, na, wa) => {
    // a-b-c-d counter-clockwise, offset along normal
    const off = 0.006;
    const A = a.clone().addScaledVector(na, off);
    const B = b.clone().addScaledVector(na, off);
    const C = c.clone().addScaledVector(na, off);
    const D = d.clone().addScaledVector(na, off);
    const tri = (p1, p2, p3, uv1, uv2, uv3) => {
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
      uvs.push(...uv1, ...uv2, ...uv3);
    };
    tri(A, B, C, [0, 0], [1, 0], [1, 1]);
    tri(A, C, D, [0, 0], [1, 1], [0, 1]);
  };

  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const p00 = pts[i][j], p10 = pts[i + 1][j], p11 = pts[i + 1][j + 1], p01 = pts[i][j + 1];
      if (p00 && p10 && p11 && p01) {
        const n = nrm[i][j];
        pushQuad(p00, p10, p11, p01, n, [i / NX, j / NZ]);
      }
    }
  }

  if (positions.length < 900) return null; // too small — roof not found, fail honestly

  const geo = new THREE.BufferGeometry();
  const local = [];
  for (let i = 0; i < positions.length; i += 3) {
    const v = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
    car.root.worldToLocal(v);
    local.push(v.x, v.y, v.z);
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(local, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  let mat;
  if (variant === "carbon") {
    mat = new THREE.MeshPhysicalMaterial({
      map: carbonTexture(), metalness: 0.55, roughness: 0.38,
      clearcoat: 0.8, clearcoatRoughness: 0.25, envMapIntensity: 1.1,
    });
  } else { // panorama
    mat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0d12, metalness: 0.2, roughness: 0.08,
      transparent: true, opacity: 0.94, clearcoat: 1, clearcoatRoughness: 0.06,
      envMapIntensity: 1.4,
    });
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.name = `roofskin_${variant}`;
  car.root.add(mesh);
  return mesh;
}

export function applyRoof(roof) {
  const variant = roof?.variantCode || "fixed";
  car.roofVariant = variant;
  for (const [k, mesh] of Object.entries(car.roofSkins)) mesh.visible = k === variant;
  if (variant !== "fixed" && !car.roofSkins[variant]) {
    try {
      const mesh = buildRoofSkin(variant);
      if (mesh) {
        car.roofSkins[variant] = mesh;
      } else {
        report("roof", new Error("roof surface not found for skin"));
      }
    } catch (e) { report("roof", e); }
  }
}

/* ---------------- story reveal float ---------------- */

export function applyReveal(v) {
  if (!car.root) return;
  const lift = Math.max(0, Math.min(1, v)) * 1.05;
  car.root.position.y = (car.root.userData.homeY || 0) + lift;
}

export function setAutoRotate(on) { view.autoRotate = !!on; }
