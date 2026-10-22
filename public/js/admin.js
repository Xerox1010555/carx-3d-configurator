/** CARX — admin console (JWT-protected API). */

import { getJSON, postJSON, ApiError } from "./api/client.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
let token = sessionStorage.getItem("carx:adminToken") || "";

async function api(path, opts = {}) {
  return getJSON(path, { ...opts, token: undefined });
}

function authHeaders() { return { Authorization: `Bearer ${token}` }; }

async function authedFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders(), ...(opts.headers || {}) },
  });
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json);
  return json;
}

/* ---------- login ---------- */
$("#loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = $("#loginNote");
  try {
    const res = await postJSON("/api/admin/login", {
      email: $("#loginEmail").value.trim(),
      password: $("#loginPw").value,
    }, { timeout: 8000 });
    token = res.token;
    sessionStorage.setItem("carx:adminToken", token);
    await showConsole();
  } catch (err) {
    if (note) note.textContent = err?.status === 401 ? "Invalid credentials." : "Server unreachable.";
  }
});

$("#logout")?.addEventListener("click", (e) => {
  e.preventDefault();
  token = "";
  sessionStorage.removeItem("carx:adminToken");
  $("#consoleView").hidden = true;
  $("#loginView").hidden = false;
});

/* ---------- console ---------- */
async function showConsole() {
  try {
    await loadAll();
    $("#loginView").hidden = true;
    $("#consoleView").hidden = false;
  } catch (err) {
    if (err?.status === 401) {
      $("#consoleView").hidden = true;
      $("#loginView").hidden = false;
      if ($("#loginNote")) $("#loginNote").textContent = "Session expired — sign in again.";
    }
  }
}

async function loadAll() {
  const [stats, orders, leads, catalog] = await Promise.all([
    authedFetch("/api/admin/stats"),
    authedFetch("/api/admin/orders?limit=50"),
    authedFetch("/api/admin/leads?limit=50"),
    authedFetch("/api/admin/catalog"),
  ]);

  $("#whoami").textContent = `signed in · ${stats.totals.orders} orders`;

  $("#statsBox").innerHTML = [
    ["Orders", stats.totals.orders],
    ["Leads", stats.totals.leads],
    ["Revenue (USD)", "$" + fmt(stats.totals.revenueUSD)],
    ["Paint taps", stats.heatmap30d.select_paint],
    ["Wheel taps", stats.heatmap30d.select_wheel],
    ["Roof taps", stats.heatmap30d.select_roof],
    ["Trim taps", stats.heatmap30d.select_trim],
    ["Add to cart", stats.heatmap30d.add_cart],
  ].map(([l, v]) => `<div class="admin-stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("");

  const oRows = orders.orders.map((o) => `
    <tr>
      <td><code>#${esc(o.code)}</code></td>
      <td>${esc(o.name)}${o.phone ? "<br><small>" + esc(o.phone) + "</small>" : ""}</td>
      <td>${esc(o.currency)} ${fmt(o.totalCharged)}</td>
      <td>${o.items.map((it) => `<small>${esc(it.config_key)} ×${it.qty}</small>`).join("<br>")}</td>
      <td><span class="badge-status ${esc(o.status)}">${esc(o.status)}</span></td>
      <td>${new Date(o.createdAt || o.created_at).toLocaleString()}</td>
      <td>
        <select data-order-status="${esc(o.id)}">
          ${["demo", "pending", "paid", "fulfilled", "cancelled"].map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
    </tr>`).join("");
  $("#ordersTable").innerHTML = `
    <thead><tr><th>Code</th><th>Customer</th><th>Total</th><th>Items</th><th>Status</th><th>When</th><th></th></tr></thead>
    <tbody>${oRows || '<tr><td colspan="7">No orders yet.</td></tr>'}</tbody>`;

  $("#ordersTable")?.querySelectorAll("[data-order-status]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      try {
        await authedFetch(`/api/admin/orders/${sel.getAttribute("data-order-status")}/status`, {
          method: "PATCH", body: JSON.stringify({ status: sel.value }),
        });
      } catch { sel.value = "demo"; }
    });
  });

  const lRows = leads.leads.map((l) => `
    <tr>
      <td>${esc(l.name || "—")}</td>
      <td>${esc(l.phone || "—")}</td>
      <td>${esc(l.email || "—")}</td>
      <td>${esc(l.source || "")}</td>
      <td><code>${esc(l.configKey || l.config_key || "")}</code></td>
      <td>${new Date(l.createdAt || l.created_at).toLocaleString()}</td>
    </tr>`).join("");
  $("#leadsTable").innerHTML = `
    <thead><tr><th>Name</th><th>Phone</th><th>E-mail</th><th>Source</th><th>Build</th><th>When</th></tr></thead>
    <tbody>${lRows || '<tr><td colspan="6">No leads yet.</td></tr>'}</tbody>`;

  const priceRow = (table, o, label) => `
    <tr>
      <td>${esc(label)}</td>
      <td>${esc(o.nameEn)} <small>(${esc(o.id)})</small></td>
      <td><input class="price-edit" type="number" min="0" value="${Number(o.priceUSD) || 0}" data-price-table="${table}" data-price-id="${esc(o.id)}"></td>
      <td><button class="btn btn-ghost" data-price-save>Save</button></td>
    </tr>`;
  $("#priceTable").innerHTML = `
    <thead><tr><th>Kind</th><th>Option</th><th>USD</th><th></th></tr></thead>
    <tbody>
      ${catalog.paints.map((o) => priceRow("paints", o, "Paint")).join("")}
      ${catalog.wheels.map((o) => priceRow("wheels", o, "Wheels")).join("")}
      ${catalog.roofs.map((o) => priceRow("roofs", o, "Roof")).join("")}
      ${catalog.trims.map((o) => priceRow("trims", o, "Trim")).join("")}
    </tbody>`;

  $("#priceTable")?.querySelectorAll("[data-price-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const inp = row.querySelector(".price-edit");
      try {
        await authedFetch(`/api/admin/options/${inp.getAttribute("data-price-table")}/${inp.getAttribute("data-price-id")}`, {
          method: "PATCH", body: JSON.stringify({ priceUSD: Number(inp.value) }),
        });
        btn.textContent = "Saved ✓";
        setTimeout(() => (btn.textContent = "Save"), 1200);
      } catch {
        btn.textContent = "Error";
        setTimeout(() => (btn.textContent = "Save"), 1200);
      }
    });
  });
}

if (token) showConsole().catch(() => {});
