/** CARX — toast notifications. */

import { elNew, esc } from "../core/utils.js";

export function toast(msg, kind = "") {
  const box = document.getElementById("toasts");
  if (!box) return;
  const n = elNew("div", "toast" + (kind ? " " + kind : ""), `<i class="tdot"></i><span>${esc(msg)}</span>`);
  box.appendChild(n);
  requestAnimationFrame(() => n.classList.add("on"));
  setTimeout(() => {
    n.classList.remove("on");
    setTimeout(() => n.remove(), 400);
  }, 2600);
  while (box.children.length > 4) box.firstChild.remove();
}
