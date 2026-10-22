/** CARX — pointer/touch input: drag to orbit, pinch/wheel to zoom. */

import { view, G } from "./stage.js";
import { clamp } from "../core/utils.js";

export function bindInput(zones) {
  const active = new Map();
  let pinchD0 = 0, pinchDist0 = 0, twoFinger = false;

  const localPointers = new Map(); // per-zone pointer bookkeeping

  for (const zone of zones) {
    if (!zone) continue;
    zone.style.touchAction = "none";

    zone.addEventListener("pointerdown", (e) => {
      if (!G.ready) return;
      zone.setPointerCapture?.(e.pointerId);
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size === 2) {
        twoFinger = true;
        const [a, b] = Array.from(active.values());
        pinchD0 = Math.hypot(a.x - b.x, a.y - b.y);
        pinchDist0 = view.distT;
      }
    });

    zone.addEventListener("pointermove", (e) => {
      if (!G.ready) return;
      const prev = active.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      prev.x = e.clientX; prev.y = e.clientY;
      if (active.size === 1) {
        view.userYawT += dx * 0.0062;
        view.rxT = clamp(view.rxT + dy * 0.0032, -1.1, 0.42);
      } else if (active.size >= 2 && twoFinger) {
        const [a, b] = Array.from(active.values());
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchD0 > 0) view.distT = clamp(pinchDist0 * (pinchD0 / d), 4.4, 13);
      }
    });

    const up = (e) => {
      active.delete(e.pointerId);
      if (active.size < 2) { twoFinger = false; pinchD0 = 0; }
    };
    zone.addEventListener("pointerup", up);
    zone.addEventListener("pointercancel", up);
    zone.addEventListener("lostpointercapture", up);
  }

  // wheel zoom over the hero stage
  const heroZone = zones[0];
  if (heroZone) {
    heroZone.addEventListener("wheel", (e) => {
      if (!G.ready) return;
      e.preventDefault();
      view.distT = clamp(view.distT + e.deltaY * 0.0032, 4.4, 13);
    }, { passive: false });
  }
}
