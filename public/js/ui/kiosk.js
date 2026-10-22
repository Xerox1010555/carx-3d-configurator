/** CARX — kiosk mode: auto-rotate, hidden chrome, idle reset (for showroom screens). */

import { state } from "../core/state.js";
import { setAutoRotate } from "../three/car.js";
import { t } from "../core/i18n.js";
import { elNew } from "../core/utils.js";
import { scrollSec } from "../three/choreography.js";

let exitHint = null;
let idleTimer = null;

export function kioskActive() {
  return new URLSearchParams(location.search).has("kiosk") || document.body.classList.contains("kiosk");
}

export function setKiosk(on) {
  document.body.classList.toggle("kiosk", on);
  setAutoRotate(on);
  if (on) {
    if (!exitHint) {
      exitHint = elNew("button", "kiosk-exit", t("kioskExit"));
      exitHint.addEventListener("click", () => setKiosk(false));
      document.body.appendChild(exitHint);
    }
    armIdleReset();
    document.addEventListener("pointerdown", armIdleReset);
  } else {
    exitHint?.remove();
    exitHint = null;
    clearTimeout(idleTimer);
    document.removeEventListener("pointerdown", armIdleReset);
    scrollSec("hero");
  }
}

/* in kiosk mode: after 90s of no interaction, drift back to the hero */
function armIdleReset() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (document.body.classList.contains("kiosk")) scrollSec("hero");
  }, 90_000);
}

export function bindKiosk() {
  document.getElementById("menuKiosk")?.addEventListener("click", () => setKiosk(true));
  if (new URLSearchParams(location.search).has("kiosk")) setKiosk(true);
}
