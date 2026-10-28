/**
 * CARX ATELIER — Vercel serverless entry: re-exports the Express app.
 * (server/index.js skips app.listen() when running on Vercel)
 */
import app from "../server/index.js";

export default app;
