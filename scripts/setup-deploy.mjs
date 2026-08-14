/**
 * Postinstall script that sets up the wrangler deploy wrapper.
 * 
 * On Linux (Cloudflare build environment), copies scripts/cf-deploy.sh
 * to node_modules/.bin/wrangler so that `npx wrangler deploy` uses our
 * wrapper instead of downloading wrangler directly.
 * 
 * The wrapper bypasses wrangler v4's workspace detection that blocks
 * `wrangler deploy` from running at the root of a monorepo.
 * 
 * Skipped on Windows (local dev) since wrangler deploy isn't needed locally.
 */

import { copyFileSync, chmodSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const binDir = join(rootDir, "node_modules", ".bin");
const wrapperSrc = join(rootDir, "scripts", "cf-deploy.sh");
const wrapperDest = join(binDir, "wrangler");

if (process.platform !== "win32") {
  try {
    if (!existsSync(wrapperSrc)) {
      console.log("ℹ️  cf-deploy.sh not found, skipping wrangler wrapper setup");
      process.exit(0);
    }

    if (!existsSync(binDir)) {
      mkdirSync(binDir, { recursive: true });
    }

    // Don't overwrite if real wrangler is already installed as a dependency
    if (existsSync(wrapperDest)) {
      console.log("ℹ️  wrangler binary already exists, skipping wrapper setup");
      process.exit(0);
    }

    copyFileSync(wrapperSrc, wrapperDest);
    chmodSync(wrapperDest, "755");
    console.log("✅ Wrangler deploy wrapper installed (workspace detection bypass)");
  } catch (e) {
    console.warn("⚠️  Could not install wrangler wrapper:", e.message);
  }
} else {
  // Silently skip on Windows
}
