/*
 * Lambert Admin service worker — SECURITY BOUNDARY.
 *
 * ALLOWED: build-hashed Next static JS/CSS/fonts, public icons/brand images,
 * the public manifest, public static HTML shells (no user data), offline shell.
 * NEVER CACHE: cross-origin resources, API requests/responses, auth tokens,
 * cookies, form submissions, CVs, attachments, uploads or private messages.
 * All application data comes from the PHP API at runtime (outside this scope).
 * Precache is restricted to an explicit build-generated file allowlist.
 */
const VERSION = __VERSION__;
const BASE = __BASE_PATH__;
const PRECACHE = __PRECACHE__;
const STATIC = `lambert-admin-static-${VERSION}`;
const PAGES = `lambert-admin-pages-${VERSION}`;
const ASSETS = `lambert-admin-assets-${VERSION}`;
const STATIC_PREFIX = `${BASE}/_next/static/`;
const OFFLINE = `${BASE}/offline/index.html`;
const ASSET_PREFIXES = [`${BASE}/icons/`, `${BASE}/images/brand/`];
const MANIFEST = `${BASE}/manifest.webmanifest`;
const SW_PATH = `${BASE}/sw.js`;
const prefix = "lambert-admin-";

function safeUrl(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return null;
  if (request.method !== "GET" || request.headers.has("Authorization") || request.headers.has("Range")) return null;
  if (!url.pathname.startsWith(`${BASE}/`) || url.pathname === SW_PATH || /(?:^|\/)api\//i.test(url.pathname)) return null;
  return url;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((cache) => cache.addAll(PRECACHE)));
  // Do NOT skipWaiting: users may be editing a form.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const all = await caches.keys();
    await Promise.all(all.filter((key) => key.startsWith(prefix) && ![STATIC, PAGES, ASSETS].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function trim(cache, max) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

async function assetResponse(event, request) {
  const cache = await caches.open(ASSETS);
  const saved = (await cache.match(request)) || (await (await caches.open(STATIC)).match(request));
  const update = fetch(request).then(async (response) => {
    if (response.ok && response.type === "basic") { await cache.put(request, response.clone()); await trim(cache, 60); }
    return response;
  });
  if (saved) { event.waitUntil(update.catch(() => undefined)); return saved; }
  return update;
}

async function navigationResponse(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  const key = url.href;
  const cache = await caches.open(PAGES);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.ok && response.type === "basic" && /text\/html/i.test(response.headers.get("content-type") || "")) {
      await cache.put(key, response.clone());
      await trim(cache, 80);
    }
    return response;
  } catch {
    return (await cache.match(key)) || (await (await caches.open(STATIC)).match(OFFLINE)) || Response.error();
  } finally { clearTimeout(timer); }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = safeUrl(request);
  if (!url) return; // Do not intercept network traffic in excluded categories.
  if (url.pathname.startsWith(STATIC_PREFIX)) {
    event.respondWith(caches.open(STATIC).then(async (cache) => (await cache.match(request)) || fetch(request)));
  } else if (url.pathname === MANIFEST || ASSET_PREFIXES.some((path) => url.pathname.startsWith(path))) {
    event.respondWith(assetResponse(event, request));
  } else if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
  }
});

self.addEventListener("message", (event) => {
  const type = event.data?.type;
  if (type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  } else if (type === "CLEAR_RUNTIME_CACHES") {
    event.waitUntil(Promise.all([PAGES, ASSETS].map((key) => caches.delete(key))).then(() => {
      event.ports?.[0]?.postMessage({ cleared: true });
    }));
  } else if (type === "GET_VERSION") {
    event.ports?.[0]?.postMessage({ version: VERSION });
  }
});
