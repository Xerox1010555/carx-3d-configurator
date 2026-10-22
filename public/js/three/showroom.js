/** CARX — indoor showroom environment: walls, glossy floor, turntable platform, ceiling lights. */

import * as THREE from "/vendor/three/three.module.js";
import { report } from "../core/errors.js";

export const showroom = {
  group: null,
  floor: null,
  platform: null,
  rim: null,
  strips: [],
  brandWall: null,
  built: false,
};

const THEME = {
  dark: {
    // maps carry the tone already — keep base colours bright so they don't double-darken
    floor: 0xffffff, floorRough: 0.26, floorMetal: 0.7,
    wall: 0xffffff, platform: 0x2a3038, strip: 0xfff3dd, rim: 0xd4a853,
  },
  light: {
    floor: 0xd8d9dc, floorRough: 0.35, floorMetal: 0.5,
    wall: 0xe7e6e3, platform: 0xcfd1d5, strip: 0xffffff, rim: 0xb8892e,
  },
};

function floorTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const cx = cv.getContext("2d");
  const g = cx.createRadialGradient(256, 256, 30, 256, 256, 360);
  g.addColorStop(0, "#2a3038");
  g.addColorStop(0.55, "#1c2027");
  g.addColorStop(1, "#101318");
  cx.fillStyle = g;
  cx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wallTexture() {
  const cv = document.createElement("canvas");
  cv.width = 2048; cv.height = 512;
  const cx = cv.getContext("2d");
  cx.fillStyle = "#262b33";
  cx.fillRect(0, 0, 2048, 512);
  // panel seams
  cx.strokeStyle = "rgba(255,255,255,0.05)";
  cx.lineWidth = 2;
  for (let x = 0; x < 2048; x += 128) {
    cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, 512); cx.stroke();
  }
  cx.strokeStyle = "rgba(212,168,83,0.25)";
  cx.beginPath(); cx.moveTo(0, 372); cx.lineTo(2048, 372); cx.stroke();
  // brand (drawn twice so it reads from both sides of the room)
  const draw = (cxPos) => {
    cx.textAlign = "center";
    cx.fillStyle = "rgba(240,242,245,0.92)";
    cx.font = "700 96px ui-monospace, monospace";
    cx.fillText("CARX ATELIER", cxPos, 250);
    cx.fillStyle = "rgba(212,168,83,0.9)";
    cx.font = "600 34px ui-monospace, monospace";
    cx.fillText("BMW M5 E34 — DEMO STUDIO", cxPos, 320);
  };
  draw(1024 / 2 + 0); draw(1024 + 1024 / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  // seen from inside a BackSide cylinder → flip horizontally so text reads correctly
  tex.repeat.x = -1;
  tex.offset.x = 1;
  return tex;
}

export function buildShowroom(scene) {
  try {
    const g = new THREE.Group();
    g.name = "showroom";

    /* ---- glossy floor ---- */
    const floorMat = new THREE.MeshStandardMaterial({
      color: THEME.dark.floor, roughness: THEME.dark.floorRough,
      metalness: THEME.dark.floorMetal, envMapIntensity: 1.35,
      map: floorTexture(),
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(26, 72), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.22;
    floor.receiveShadow = true;
    g.add(floor);

    /* ---- turntable platform ---- */
    const platMat = new THREE.MeshStandardMaterial({
      color: THEME.dark.platform, roughness: 0.32, metalness: 0.6, envMapIntensity: 1.1,
    });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 4.8, 0.16, 72), platMat);
    platform.position.y = -1.22 - 0.08 + 0.02;   // top 2cm above the floor
    platform.receiveShadow = true;
    g.add(platform);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(4.74, 0.035, 12, 96),
      new THREE.MeshBasicMaterial({ color: THEME.dark.rim })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.22 + 0.015;
    g.add(rim);

    /* ---- surrounding wall with brand + light strips ---- */
    const wallTex = wallTexture();
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(21, 21, 10, 64, 1, true),
      new THREE.MeshStandardMaterial({
        color: THEME.dark.wall, map: wallTex, emissive: 0xffffff,
        emissiveMap: wallTex, emissiveIntensity: 0.5,
        side: THREE.BackSide, roughness: 0.9, metalness: 0.05,
      })
    );
    wall.position.y = 3.6;
    g.add(wall);
    showroom.brandWall = wall;

    const strips = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const gold = i % 4 === 0;
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 6.4, 0.16),
        new THREE.MeshBasicMaterial({ color: gold ? 0xd4a853 : 0xfff3dd })
      );
      strip.position.set(Math.sin(a) * 20.3, 2.6, Math.cos(a) * 20.3);
      g.add(strip);
      strips.push(strip);
    }
    showroom.strips = strips;

    /* ---- ceiling light bars + halo ring ---- */
    const barMat = new THREE.MeshBasicMaterial({ color: 0xfff6e6 });
    for (let i = -1; i <= 1; i += 2) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(14, 0.09, 0.42), barMat);
      bar.position.set(0, 7.4, i * 3.4);
      g.add(bar);
    }
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.05, 10, 80),
      new THREE.MeshBasicMaterial({ color: 0xd4a853 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 7.1;
    g.add(halo);

    /* ---- columns around the platform ---- */
    const colMat = new THREE.MeshStandardMaterial({ color: 0x12151a, roughness: 0.55, metalness: 0.4 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 9.4, 18), colMat);
      col.position.set(Math.sin(a) * 12.5, 3.4, Math.cos(a) * 12.5);
      col.castShadow = true;
      g.add(col);
    }

    scene.add(g);
    showroom.group = g;
    showroom.floor = floor;
    showroom.platform = platform;
    showroom.rim = rim;
    showroom.built = true;
    return g;
  } catch (e) {
    report("showroom", e);
    return null;
  }
}

/** Move floor + platform + rim so the car stands exactly on the ground. */
export function setGroundY(y) {
  if (!showroom.built) return;
  showroom.floor.position.y = y;
  showroom.platform.position.y = y - 0.08 + 0.012;
  showroom.rim.position.y = y + 0.015;
}

export function applyShowroomTheme(theme) {
  if (!showroom.built) return;
  const t = THEME[theme === "light" ? "light" : "dark"];
  const f = showroom.floor.material;
  f.color.set(t.floor); f.roughness = t.floorRough; f.metalness = t.floorMetal;
  showroom.platform.material.color.set(t.platform);
  showroom.rim.material.color.set(t.rim);
  showroom.brandWall.material.color.set(t.wall);
  showroom.brandWall.material.emissiveIntensity = theme === "light" ? 0.12 : 0.5;
  for (const s of showroom.strips) {
    // keep the gold accents gold in both themes
    s.material.color.set(s.material.color.getHex() === 0xd4a853 || s.material.color.getHex() === 0xb8892e
      ? t.rim : t.strip);
  }
}
