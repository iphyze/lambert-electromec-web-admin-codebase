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
const VERSION = "c0c6cc05addfbc";
const BASE = "";
const PRECACHE = ["/_next/static/8WlnhRGprP7UABO1yl7N-/_buildManifest.js","/_next/static/8WlnhRGprP7UABO1yl7N-/_clientMiddlewareManifest.js","/_next/static/8WlnhRGprP7UABO1yl7N-/_ssgManifest.js","/_next/static/chunks/0_ef6wfe5979_.js","/_next/static/chunks/077jq8oqyyuy_.js","/_next/static/chunks/0cz1d0mv5g_q7.js","/_next/static/chunks/0f8lqp1rtj1js.js","/_next/static/chunks/0h2qsuyze9ds1.js","/_next/static/chunks/0mgs73tmxw761.js","/_next/static/chunks/0p6hm0bszic78.js","/_next/static/chunks/0uqbnds0et768.js","/_next/static/chunks/0uy79ytn7e8w9.js","/_next/static/chunks/0yhfccc352os7.js","/_next/static/chunks/0yn5-oh_ng1yv.css","/_next/static/chunks/11jq0c2_zavac.js","/_next/static/chunks/14dmbbgq2_1va.css","/_next/static/chunks/175_5ft9bg9_6.css","/_next/static/chunks/19cg1a4y21n2m.js","/_next/static/chunks/1ck7z4f2d6hgm.js","/_next/static/chunks/1mkbuudhndal5.js","/_next/static/chunks/1n1e8e9i5z6sa.css","/_next/static/chunks/1p17af9_s8swx.js","/_next/static/chunks/1pmd4mp40z5kl.js","/_next/static/chunks/1qrwgh9dwfjio.js","/_next/static/chunks/2_4nww4pyj1_y.js","/_next/static/chunks/20mlfe7ct3vmy.js","/_next/static/chunks/27rdx6p5c5tjn.css","/_next/static/chunks/29wo1k75w94-b.js","/_next/static/chunks/2agszl59snt-g.js","/_next/static/chunks/2cyr_h7vue9r_.css","/_next/static/chunks/2maxmuh-fdm0m.js","/_next/static/chunks/2n63gz6auft77.js","/_next/static/chunks/2p9oi12r1v8x_.js","/_next/static/chunks/2ps_8a70wbles.js","/_next/static/chunks/2rkwj96qh2m1k.js","/_next/static/chunks/2u_tudd_yh37a.js","/_next/static/chunks/2y8ognfelty_q.css","/_next/static/chunks/2zfh3efzgfvs0.js","/_next/static/chunks/33noq-dyyvzug.js","/_next/static/chunks/33yrmpi4w78__.css","/_next/static/chunks/35vaypo5vyccy.js","/_next/static/chunks/3enf879bzj9s3.js","/_next/static/chunks/3gsbz-osibnlo.js","/_next/static/chunks/3ksg_07hq7dw0.js","/_next/static/chunks/3mf02u_ttb780.css","/_next/static/chunks/3n7uasbd-2_l3.js","/_next/static/chunks/3nqysndzuaz3w.js","/_next/static/chunks/3onsh4x4m9xvw.js","/_next/static/chunks/3spxmq0cipi84.js","/_next/static/chunks/3t46q5f14-dou.js","/_next/static/chunks/3wb0-0m-56x-u.js","/_next/static/chunks/3yfl9fgvivx3-.js","/_next/static/chunks/41da0ppb09lic.js","/_next/static/chunks/426lzuwr3ripo.js","/_next/static/chunks/turbopack-2cwvwh_ilfegp.js","/_next/static/media/b886574ba42c3409-s.1_wjncogyh-s7.woff2","/_next/static/media/c41ca59f1c34ba31-s.p.2y2uoi4t910qy.woff2","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/maskable-512.png","/icons/shortcut-analytics.png","/icons/shortcut-contacts.png","/icons/shortcut-dashboard.png","/icons/shortcut-projects.png","/images/brand/favicon.png","/images/brand/lambert-logo.png","/manifest.webmanifest","/offline/index.html"];
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
