// Copies PDF.js cmaps + standard fonts into public/ so the dev server and the
// production bundle can serve them (needed for correct CJK / embedded-font glyphs).
// Runs on postinstall and before dev/build.
import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/pdfjs-dist");

const jobs = [
  ["cmaps", "public/cmaps"],
  ["standard_fonts", "public/standard_fonts"],
];

for (const [from, to] of jobs) {
  const dest = resolve(root, to);
  await mkdir(dest, { recursive: true });
  await cp(resolve(src, from), dest, { recursive: true });
  console.log(`[pdf-assets] ${from} -> ${to}`);
}
