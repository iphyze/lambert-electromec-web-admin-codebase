import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "out");
if (!existsSync(out)) { console.error("PWA build failed: out/ is missing. Run next build first."); process.exit(1); }
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim().replace(/\/+$/, "");
if (basePath && !/^\/[\w-]+(?:\/[\w-]+)*$/.test(basePath)) throw new Error("Invalid NEXT_PUBLIC_BASE_PATH");
const hash = (data) => createHash("sha256").update(data).digest("hex");
const listFiles = (dir) => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? listFiles(path) : entry.isFile() ? [path] : [];
}) : [];
const urlPath = (file) => `/${relative(out, file).split(sep).join("/")}`;

const disabled = process.env.NEXT_PUBLIC_PWA_DISABLED === "true";
if (disabled) {
  const kill = `/* Lambert Admin PWA rollback: no caching. */\nself.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));\nself.addEventListener("activate",e=>e.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(k=>k.startsWith("lambert-admin-")).map(k=>caches.delete(k)));await self.registration.unregister();for(const c of await self.clients.matchAll({type:"window",includeUncontrolled:true}))c.navigate(c.url);})()));\n`;
  writeFileSync(join(out, "sw.js"), kill);
  console.log("PWA kill switch enabled: emitted self-unregistering sw.js");
} else {
  const staticFiles = listFiles(join(out, "_next", "static")).filter((file) => /\.(?:js|css|woff2?|ttf|otf)$/i.test(file));
  const assetFiles = [
    ...listFiles(join(out, "icons")).filter((file) => /\.(?:png|svg|webp)$/i.test(file)),
    ...listFiles(join(out, "images", "brand")).filter((file) => /\.(?:png|svg|webp)$/i.test(file)),
  ];
  const required = [join(out, "offline", "index.html"), join(out, "manifest.webmanifest")];
  for (const path of required) if (!existsSync(path)) throw new Error(`PWA build failed: missing ${relative(out, path)} in out/`);
  const files = [...new Set([...staticFiles, ...assetFiles, ...required])].sort((a,b) => urlPath(a).localeCompare(urlPath(b), "en"));
  const versionInput = files.map((file) => `${urlPath(file)}:${hash(readFileSync(file))}`).join("\n");
  const version = hash(versionInput).slice(0, 14);
  const precache = files.map((file) => `${basePath}${urlPath(file)}`);
  const template = readFileSync(join(root, "scripts", "sw-template.js"), "utf8");
  const sw = template.replaceAll("__VERSION__", JSON.stringify(version))
    .replaceAll("__BASE_PATH__", JSON.stringify(basePath))
    .replaceAll("__PRECACHE__", JSON.stringify(precache));
  writeFileSync(join(out, "sw.js"), sw);
  const bytes = files.reduce((sum, file) => sum + readFileSync(file).length, 0);
  console.log(`PWA: v${version}, ${files.length} files, ${(bytes / (1024 * 1024)).toFixed(2)} MiB precache`);
}
// Deterministic outputs. No generated files are created in the source tree.
writeFileSync(join(out, ".nojekyll"), "");
writeFileSync(join(out, "robots.txt"), "User-agent: *\nDisallow: /\n");
