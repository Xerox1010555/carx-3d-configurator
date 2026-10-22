/** CARX — screenshot export: watermark + PNG download of the live 3D stage. */

import { G } from "../three/stage.js";
import { $ } from "../core/utils.js";
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { keyFor } from "../core/catalog.js";
import { toast } from "./toast.js";
import { track } from "../analytics.js";

export async function exportScreenshot() {
  if (!G.ready || !G.renderer) { toast(t("shotFail"), "warn"); return; }
  try {
    G.renderer.render(G.scene, G.cam); // fresh frame with preserveDrawingBuffer
    const src = G.renderer.domElement;
    const scale = 2;
    const cv = document.createElement("canvas");
    cv.width = src.width * scale;
    cv.height = src.height * scale;
    const cx = cv.getContext("2d");
    cx.fillStyle = state.prefs.theme === "light" ? "#f5f3f0" : "#060809";
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.drawImage(src, 0, 0, cv.width, cv.height);

    // watermark: brand + build key
    const dark = state.prefs.theme !== "light";
    cx.fillStyle = dark ? "rgba(240,242,245,.85)" : "rgba(26,22,16,.8)";
    cx.font = `700 ${Math.round(cv.width * 0.018)}px ui-monospace, monospace`;
    cx.fillText("CARX ATELIER", cv.width * 0.03, cv.height * 0.955);
    cx.font = `500 ${Math.round(cv.width * 0.011)}px ui-monospace, monospace`;
    cx.fillStyle = dark ? "rgba(212,168,83,.9)" : "rgba(184,137,46,.9)";
    cx.textAlign = "end";
    cx.fillText(keyFor(state.cfg).split("|").slice(1).join(" · "), cv.width * 0.97, cv.height * 0.955);

    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
    if (!blob) throw new Error("toBlob failed");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `carx-${Date.now().toString(36)}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);

    // shutter flash
    const f = document.createElement("div");
    f.className = "flash";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 520);

    track("screenshot", keyFor(state.cfg));
    toast(t("shotOk"), "ok");
  } catch (e) {
    console.error(e);
    toast(t("shotFail"), "warn");
  }
}

export function bindScreenshot() {
  $("#shotBtn")?.addEventListener("click", () => exportScreenshot());
}
