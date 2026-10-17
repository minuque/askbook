/**
 * Prepares `app-bundle/` for electron-builder after `next build`.
 *
 * Next.js standalone output (`.next/standalone/`) is already self-contained:
 * it carries `server.js`, a pruned `.next/`, and only the node_modules it
 * imports. We flatten it into a clean `app-bundle/` directory so the
 * electron-builder `files` glob can point at one place:
 *
 *   app-bundle/
 *     server.js        <- forked by electron/main.cjs as plain Node
 *     .next/           <- compiled output (server bundles + static/)
 *     node_modules/    <- the ~23M standalone dep tree (not the full npm tree)
 *     public/          <- static assets (copied in, standalone doesn't do it)
 *     electron/        <- main.cjs + preload.cjs + icon
 *     package.json     <- "main": "electron/main.cjs"
 *
 * Two things standalone does NOT produce and we must add:
 *   - `public/` and `.next/static/` — copied in below.
 *   - `serverExternalPackages` shims: Next emits relative symlinks under
 *     `.next/node_modules/` (linkedom-XXXXXXXX -> ../../node_modules/linkedom).
 *     electron-builder copies the link verbatim and the `..` segments resolve
 *     above the packaged app root, so we replace each shim with a real copy of
 *     its target before packaging.
 */

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const bundle = join(root, "app-bundle");

if (!existsSync(standalone)) {
  console.error("error: .next/standalone missing — run `next build` first.");
  process.exit(1);
}

// Standalone lacks public/ and .next/static/; the server serves them from its
// own root, so copy both in before flattening.
for (const [src, dest] of [
  [join(root, "public"), join(standalone, "public")],
  [join(root, ".next", "static"), join(standalone, ".next", "static")],
]) {
  if (!existsSync(src)) {
    console.error(`error: ${src} missing — cannot package standalone.`);
    process.exit(1);
  }
  cpSync(src, dest, { recursive: true });
}

// Replace serverExternalPackages shim symlinks with real directory copies so
// the bundle is self-contained and electron-builder never re-creates them.
const shimRoot = join(standalone, ".next", "node_modules");
if (existsSync(shimRoot)) {
  for (const name of readdirSync(shimRoot)) {
    const shimPath = join(shimRoot, name);
    if (!lstatSync(shimPath).isSymbolicLink()) continue;
    const target = resolve(dirname(shimPath), readlinkSync(shimPath));
    rmSync(shimPath, { recursive: true, force: true });
    mkdirSync(dirname(shimPath), { recursive: true });
    cpSync(target, shimPath, { recursive: true });
  }
}

// Flatten standalone into app-bundle/ so the packaged app root is exactly
// what server.js + electron expect.
rmSync(bundle, { recursive: true, force: true });
mkdirSync(bundle, { recursive: true });
for (const entry of readdirSync(standalone)) {
  if (entry === ".data") continue; // dev leftover; packaged app uses userData
  cpSync(join(standalone, entry), join(bundle, entry), { recursive: true });
}
cpSync(join(root, "electron"), join(bundle, "electron"), { recursive: true });

console.log("app-bundle ready: standalone + electron + static assets");
