/** One-off deterministic icon generator. Run only if sharp is already installed. */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const localSharp = join(root, "node_modules", "sharp");
if (!existsSync(localSharp)) {
  console.info("PWA icons: sharp is not installed locally. Install the project's existing dependencies with npm ci, then run node scripts/generate-pwa-icons.mjs. No package.json changes are needed. Pre-generated PNG files in public/icons/ remain usable.");
  process.exit(0);
}
const require = createRequire(import.meta.url);
const sharp = require(localSharp);
const input = join(root, "public", "images", "brand", "favicon.png");
const icons = join(root, "public", "icons");
mkdirSync(icons, { recursive: true });
const escapeSvg = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");

async function icon(name, size, markRatio = 0.66, letter = "") {
  const radius = Math.round(size * .2);
  const inset = Math.round(size * (1 - markRatio) / 2);
  const innerSize = size - 2 * inset;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#1f9150"/><rect x="${inset-1}" y="${inset-1}" width="${innerSize+2}" height="${innerSize+2}" rx="${Math.round(size*.1)}" fill="#ffffff"/></svg>`);
  const mark = await sharp(input).resize(innerSize,innerSize,{fit:"contain"}).png().toBuffer();
  let composite = [{input:mark,left:inset,top:inset}];
  if (letter) {
    const tag = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="${Math.round(size*.68)}" y="${Math.round(size*.69)}" width="${Math.round(size*.23)}" height="${Math.round(size*.22)}" rx="${Math.round(size*.055)}" fill="#0d4931"/><text x="${Math.round(size*.795)}" y="${Math.round(size*.843)}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${Math.round(size*.115)}" font-weight="700">${escapeSvg(letter)}</text></svg>`);
    composite.push({input:tag,left:0,top:0});
  }
  const output = await sharp(bg).composite(composite).png({compressionLevel:9}).toBuffer();
  writeFileSync(join(icons,name),output);
}
await icon("icon-192.png",192);
await icon("icon-512.png",512);
await icon("maskable-512.png",512,0.58);
await icon("apple-touch-icon-180.png",180);
for (const [name,letter] of Object.entries({dashboard:"D",projects:"P",contacts:"M",analytics:"S"})) await icon(`shortcut-${name}.png`,96,0.66,letter);
console.log("Generated 8 PWA icons in public/icons/ from Lambert's existing brand mark.");
