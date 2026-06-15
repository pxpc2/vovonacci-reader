// Generate the updater `latest.json` from the freshly built + signed NSIS
// installer, and stage a clean (space-free) copy of the installer for upload.
//
// Run AFTER `pnpm tauri build` (with signing env vars set). Node writes UTF-8
// without a BOM — which the Tauri updater requires (a BOM makes its JSON parser
// reject the manifest and the update check fails silently).
//
//   node scripts/make-latest.mjs
//   gh release create v<version> \
//     src-tauri/target/release/upload/vovonacci-reader_<version>_x64-setup.exe \
//     src-tauri/target/release/upload/latest.json --latest
//
// Optional: set UPDATE_NOTES to populate the in-app release notes.

import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const REPO = "pxpc2/vovonacci-reader";
const root = process.cwd();

const conf = JSON.parse(
  readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8")
);
const version = conf.version;

const nsisDir = join(root, "src-tauri/target/release/bundle/nsis");
const setupName = `Vovonacci Reader_${version}_x64-setup.exe`;
const cleanName = `vovonacci-reader_${version}_x64-setup.exe`;

const sig = readFileSync(join(nsisDir, `${setupName}.sig`), "utf8").trim();

const outDir = join(root, "src-tauri/target/release/upload");
mkdirSync(outDir, { recursive: true });
copyFileSync(join(nsisDir, setupName), join(outDir, cleanName));

const manifest = {
  version,
  notes: process.env.UPDATE_NOTES || `Vovonacci Reader ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: sig,
      url: `https://github.com/${REPO}/releases/download/v${version}/${cleanName}`,
    },
  },
};

// JSON.stringify + writeFileSync → UTF-8, no BOM.
writeFileSync(join(outDir, "latest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(
  `[make-latest] v${version}: wrote latest.json + ${cleanName} to ${outDir}`
);
