/** CARX — cart drawer + checkout (server-priced order) + order lookup. */

import { $, elNew, esc, hex2css } from "../core/utils.js";
import { state, saveCart } from "../core/state.js";
import { t } from "../core/i18n.js";
import { fmtUSD } from "../core/fx.js";
import { resolveCfg, priceFor, keyFor } from "../core/catalog.js";
import { postJSON, getJSON } from "../api/client.js";
import { toast } from "./toast.js";
import { track } from "../analytics.js";

/* ---------- overlays ---------- */

export function openDrawer(open) {
  const d = $("#drawer"), scr = $("#scrim");
  if (!d || !scr) return;
  if (open) {
    renderCartDrawer();
    d.hidden = false; scr.hidden = false;
    requestAnimationFrame(() => { d.classList.add("open"); scr.classList.add("on"); });
  } else {
    d.classList.remove("open"); scr.classList.remove("on");
    setTimeout(() => { if (!d.classList.contains("open")) { d.hidden = true; scr.hidden = true; } }, 380);
  }
}

export function modalOpen(html) {
  const mo = $("#modal"), scr = $("#scrim");
  if (!mo || !scr) return;
  mo.innerHTML = html;
  mo.hidden = false; scr.hidden = false;
  requestAnimationFrame(() => { mo.classList.add("open"); scr.classList.add("on"); });
}

export function modalClose() {
  const mo = $("#modal"), scr = $("#scrim"), d = $("#drawer");
  if (!mo) return;
  mo.classList.remove("open");
  if (scr) scr.classList.remove("on");
  setTimeout(() => {
    if (!mo.classList.contains("open")) { mo.hidden = true; mo.innerHTML = ""; }
    if (scr && !d?.classList.contains("open")) scr.hidden = true;
  }, 380);
}

/* ---------- cart ---------- */

export function cartAdd(cfg) {
  const k = keyFor(cfg);
  const found = state.cart.find((it) => it.k === k);
  if (found) found.q = Math.min(5, found.q + 1);
  else state.cart.push({ k, cfg: { ...cfg }, q: 1 });
  saveCart();
  track("add_cart", k);
  renderCartDrawer();
}

export function cartRemove(k) {
  state.cart = state.cart.filter((it) => it.k !== k);
  saveCart();
  renderCartDrawer();
}

export function cartQty(k, d) {
  const it = state.cart.find((x) => x.k === k);
  if (!it) return;
  it.q = Math.min(5, Math.max(1, it.q + d));
  saveCart();
  renderCartDrawer();
}

export function cartClear() {
  state.cart = [];
  saveCart();
  renderCartDrawer();
}

export const cartTotalUSD = () => state.cart.reduce((s, it) => s + priceFor(it.cfg) * it.q, 0);

export function cartBadgeUpdate() {
  const b = $("#cartBadge");
  if (!b) return;
  const q = state.cart.reduce((s, it) => s + it.q, 0);
  b.textContent = String(q);
  b.classList.toggle("on", q > 0);
}

export function renderCartDrawer() {
  const d = $("#drawer");
  if (!d) return;
  const rows = state.cart.map((it) => {
    const r = resolveCfg(it.cfg);
    const hex = hex2css(r.paint.hex);
    const nm = state.prefs.lang === "ar" && r.vehicle.nameAr ? r.vehicle.nameAr : r.vehicle.model;
    return `
      <div class="cart-row">
        <i class="g-swatch" style="background:${hex}"></i>
        <div class="cart-meta">
          <b>${esc(nm)}</b>
          <span>${esc(r.paint.nameEn)} · ${esc(r.wheels.nameEn)} · ${esc(r.roof.nameEn)} · ${esc(r.trim.nameEn)}</span>
        </div>
        <div class="cart-qty">
          <button class="icobtn" data-act="qty" data-k="${esc(it.k)}" data-d="-1">${t("minus")}</button>
          <b>${it.q}</b>
          <button class="icobtn" data-act="qty" data-k="${esc(it.k)}" data-d="1">+</button>
          <button class="icobtn" data-act="rm" data-k="${esc(it.k)}" aria-label="${esc(t("remove"))}">×</button>
        </div>
        <b class="cart-price">${esc(fmtUSD(priceFor(it.cfg) * it.q))}</b>
      </div>`;
  }).join("");

  d.innerHTML = `
    <div class="m-head">
      <h3>${esc(t("cartT"))}</h3>
      <button class="icobtn x" data-act="closeDrawer" aria-label="Close">
        <svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>
      </button>
    </div>
    ${state.cart.length ? rows : `<p class="g-empty">${esc(t("cartEmpty"))}</p>`}
    <div class="cart-total">
      <span>${esc(t("subT"))}</span>
      <b>${esc(fmtUSD(cartTotalUSD()))}</b>
    </div>
    <div class="cta-row">
      <button class="btn btn-p" data-act="checkout" ${state.cart.length ? "" : "disabled"}>${esc(t("checkout"))}</button>
      <button class="btn btn-ghost" data-act="clear">${esc(t("clear"))}</button>
    </div>`;
  cartBadgeUpdate();
}

/* ---------- checkout ---------- */

export function openCheckout() {
  if (!state.cart.length) { toast(t("cartEmpty"), "warn"); return; }
  const rows = state.cart.map((it) => {
    const r = resolveCfg(it.cfg);
    return `<div class="cfg-line"><span>${esc(r.vehicle.brand)} · ${it.q}×</span><b><span class="fp">${esc(fmtUSD(priceFor(it.cfg) * it.q))}</span></b></div>`;
  }).join("");
  const html = `
    <div class="m-box">
      <div class="m-head"><h3>${esc(t("modalT"))}</h3>
        <button class="icobtn x" data-act="closeModal" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
      </div>
      <p class="m-title">${esc(t("mTitle"))}</p>${rows}
      <form id="payForm" novalidate style="margin-top:14px">
        <div class="f-row">
          <label><span>${esc(t("fName"))}</span><input id="payName" required maxlength="60" autocomplete="name"></label>
          <label><span>${esc(t("fPhone"))}</span><input id="payPhone" inputmode="tel" maxlength="24" autocomplete="tel"></label>
        </div>
        <div class="f-row">
          <label><span>${esc(t("kCity"))}</span><input id="payCity" maxlength="40" autocomplete="address-level2"></label>
          <label><span>${esc(t("fEmail"))}</span><input id="payEmail" type="email" maxlength="120" autocomplete="email"></label>
        </div>
        <div class="pay-card">
          <div class="row1">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/></svg>
            <span>${esc(t("payT"))}</span>
          </div>
          <p>${esc(t("payP"))}</p>
          <div class="sim-lane" id="simLane"><i class="wheel"></i><span id="simTxt">${esc(t("sim1"))}</span></div>
        </div>
        <button class="btn btn-p" id="payGo" type="submit" style="width:100%">${esc(t("payGo"))}</button>
      </form>
    </div>`;
  modalOpen(html);

  const form = $("#payForm");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = ($("#payName")?.value.trim()) || "";
    if (name.length < 2) { $("#payName")?.focus(); return; }
    const go = $("#payGo");
    if (go) go.disabled = true;
    $("#simLane")?.classList.add("on");
    setTimeout(() => { const sx = $("#simTxt"); if (sx) sx.textContent = t("sim2"); }, 600);
    try {
      const res = await postJSON("/api/orders", {
        name,
        phone: $("#payPhone")?.value.trim() || "",
        city: $("#payCity")?.value.trim() || "",
        email: $("#payEmail")?.value.trim() || "",
        currency: state.prefs.currency,
        items: state.cart.map((it) => ({
          vehicleSlug: resolveCfg(it.cfg).vehicle.slug,
          paintId: it.cfg.paint, wheelId: it.cfg.wheels, roofId: it.cfg.roof, trimId: it.cfg.trim,
          qty: it.q,
        })),
      }, { timeout: 12000 });
      finishOrder(res);
    } catch (err) {
      // offline fallback: stamp locally so the flow never dead-ends
      const localId = "CRX-" + String(Math.floor(100000 + Math.random() * 900000));
      finishOrder({ code: localId, currency: state.prefs.currency, subtotalUSD: cartTotalUSD(), offline: true });
      console.warn("order fell back to local stamp", err);
    }
  });
}

function finishOrder(res) {
  state.lastOrder = { code: res.code, total: res.subtotalUSD };
  cartClear();
  const mo = $("#modal .m-box");
  if (mo) {
    mo.innerHTML = `
      <div class="success-view">
        <div class="ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg></div>
        <h4>${esc(t("doneT"))}</h4><p>${esc(t("doneP"))}</p>
        <p class="order-id">#${esc(res.code)}</p>
        <div class="order-lookup">
          <input id="orderCodeIn" maxlength="12" placeholder="CRX-XXXXXX">
          <button class="btn btn-ghost" id="orderLookupBtn">${esc(t("orderLookup"))}</button>
        </div>
        <p id="orderLookupNote" class="nl-note"></p>
        <button class="btn btn-p" data-act="closeModal">${esc(t("doneBtn"))}</button>
      </div>`;
    $("#orderLookupBtn")?.addEventListener("click", lookupOrder);
  }
  toast("#" + res.code, "ok");
}

async function lookupOrder() {
  const code = ($("#orderCodeIn")?.value || "").trim().toUpperCase();
  const note = $("#orderLookupNote");
  if (!code) return;
  try {
    const j = await getJSON(`/api/orders/${encodeURIComponent(code)}`, { timeout: 6000 });
    if (note) note.textContent = `${t("orderFound")}: #${j.order.code} — ${j.order.status}`;
  } catch {
    if (note) note.textContent = t("orderNotFound");
  }
}

/* ---------- wiring ---------- */

export function bindCart() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    switch (act) {
      case "add": cartAdd(state.cfg); toast(t("added"), "ok"); break;
      case "openCart": openDrawer(true); break;
      case "closeDrawer": openDrawer(false); break;
      case "checkout": openDrawer(false); openCheckout(); break;
      case "closeModal": modalClose(); break;
      case "clear": cartClear(); break;
      case "rm": cartRemove(btn.getAttribute("data-k")); break;
      case "qty": cartQty(btn.getAttribute("data-k"), parseInt(btn.getAttribute("data-d") || "1", 10)); break;
      case "share": shareLink(); break;
    }
  });
  $("#cartBtn")?.addEventListener("click", () => openDrawer(true));
  document.addEventListener("carx:closeOverlays", () => { openDrawer(false); modalClose(); });
  document.addEventListener("cart:badge", cartBadgeUpdate);
  document.addEventListener("cart:rerender", renderCartDrawer);
}

async function shareLink() {
  const url = location.origin + location.pathname + "#" +
    new URLSearchParams(state.cfg).toString();
  try {
    if (navigator.share) { await navigator.share({ title: "CARX ATELIER", url }); }
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); }
    else throw new Error("no clipboard");
    toast(t("copied"), "ok");
    track("share", keyFor(state.cfg));
  } catch {
    toast(t("copied"), "warn");
  }
}
