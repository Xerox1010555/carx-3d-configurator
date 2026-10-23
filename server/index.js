/**
 * CARX ATELIER — server entry point.
 * Serves the static studio (/), the admin console (/admin) and the JSON API (/api/*).
 */
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initSchema } from "./db.js";
import "./seed.js"; // idempotent seed on boot
import { catalogRouter } from "./routes/catalog.js";
import { shopRouter } from "./routes/shop.js";
import { adminRouter } from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SHARED_DIR = path.join(__dirname, "..", "shared");
const PORT = Number(process.env.PORT) || 4173;

initSchema();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

/* ---- security headers (CSP without unsafe-inline for scripts) ---- */
app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' blob:",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-Frame-Options": "DENY",
  });
  next();
});

app.use(express.json({ limit: "64kb" }));

/* ---- API ---- */
app.use("/api", catalogRouter);
app.use("/api", shopRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api", (req, res) => res.status(404).json({ error: "not_found" }));

/* ---- static ---- */
app.use("/shared", express.static(SHARED_DIR, { immutable: true, maxAge: "7d" }));
app.use(express.static(PUBLIC_DIR, {
  index: false,
  setHeaders(res, filePath) {
    if (filePath.includes(`${path.sep}vendor${path.sep}`) || filePath.endsWith(".glb")) {
      res.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (filePath.endsWith(".woff2")) {
      res.set("Cache-Control", "public, max-age=604800");   // 7d — fonts are stable per family version
    } else if (/\.(js|css)$/.test(filePath)) {
      res.set("Cache-Control", "public, max-age=300");
    }
  },
}));

app.get("/admin", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "admin.html")));
app.get("/health", (req, res) => res.redirect("/api/health"));
/* SPA fallback (Express 5: use middleware, not "*").
   Serve the studio for extension-less GET navigations (browsers and fetch alike). */
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  const p = req.path;
  if (p.startsWith("/api/") || p === "/admin") return next();
  if (path.extname(p)) return next();         // real asset → let 404 happen
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

/* ---- error handling ---- */
app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "invalid_json" });
  console.error("[carx] error:", err?.message || err);
  res.status(500).json({ error: "server_error" });
});

app.listen(PORT, () => {
  console.log(`CARX ATELIER → http://localhost:${PORT}  (admin: /admin)`);
});
