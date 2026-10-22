/**
 * CARX — asset pipeline: compress the source GLB into public/assets/models/.
 * Draco geometry + WebP textures, NO mesh/material joining (material names are
 * load-bearing for the live paint/rim/caliper mapping).
 *
 * Usage: npm run optimize-assets [-- --in path --out path]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const input = path.resolve(root, arg("--in", "assets-src/bmw_m5_e34.glb"));
const output = path.resolve(root, arg("--out", "public/assets/models/bmw_m5_e34.glb"));

if (!existsSync(input)) {
  console.error(`optimize-assets: source not found → ${input}`);
  process.exit(1);
}
mkdirSync(path.dirname(output), { recursive: true });

const result = spawnSync("npx", [
  "gltf-transform", "optimize", input, output,
  "--compress", "draco",
  "--texture-compress", "webp",
  "--texture-size", "2048",
  "--flatten", "false",
  "--join", "false",
  "--join-meshes", "false",
  "--join-named", "false",
  "--palette", "false",
  "--simplify", "false",
  "--weld", "false",
  "--instance", "false",
], { stdio: "inherit", shell: true });

if (result.status !== 0) {
  console.error("optimize-assets: gltf-transform failed");
  process.exit(result.status || 1);
}

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2);
console.log(`optimize-assets: ${mb(input)} MB → ${mb(output)} MB`);
