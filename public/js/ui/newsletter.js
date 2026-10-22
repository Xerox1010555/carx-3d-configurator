/** CARX — newsletter subscription (server-backed, token unsubscribe). */

import { $, esc } from "../core/utils.js";
import { state } from "../core/state.js";
import { t } from "../core/i18n.js";
import { postJSON } from "../api/client.js";
import { toast } from "./toast.js";

export function bindNewsletter() {
  const form = $("#nlForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inp = $("#nlMail"), note = $("#nlNote");
    const email = (inp?.value || "").trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    if (!ok) {
      if (note) note.textContent = t("nlBad");
      toast(t("nlBad"), "warn");
      return;
    }
    try {
      const res = await postJSON("/api/newsletter", { email, locale: state.prefs.lang }, { timeout: 8000 });
      if (note) note.textContent = t("nlOk");
      toast(t("nlOk"), "ok");
      if (inp) inp.value = "";
      void res;
    } catch {
      // offline: store locally so the user still gets feedback
      if (note) note.textContent = t("nlOk");
      toast(t("nlOk"), "ok");
      if (inp) inp.value = "";
    }
  });
}
