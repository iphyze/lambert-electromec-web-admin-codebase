# Lambert Administration Portal

Next.js 16 static-export application (`lambert-admin`) for managing Lambert Electromec website content, enquiries, users and statistics. The authenticated admin UI, role-aware routes, API access, themes and responsive shell remain unchanged.

## Development

1. Install the existing dependencies: `npm ci` (no additional packages).
2. Configure the public API origin in an **uncommitted** `.env.local` (`NEXT_PUBLIC_API_BASE_URL`). Never add secrets to `NEXT_PUBLIC_*` values: they are embedded in the public static build.
3. Start with `npm run dev` (port 5174). The PWA manager **unregisters old Lambert workers in development** to prevent stale cached code.
4. Run `npm run build` to generate `out/`. The `postbuild` step automatically creates `out/sw.js`, `.nojekyll` and `robots.txt` after Next.js exports the site.

## Progressive Web App

The admin PWA uses the existing Lambert icon, a Next.js metadata-route manifest, a hand-written service worker and a no-dependency deterministic build script. It can be installed in Chrome, Edge and Android when the browser offers an install prompt. On iOS Safari, the account menu provides **Add to Home Screen** guidance.

### Public build security

- **Cached:** build-hashed JS/CSS/fonts under `_next/static/`; public Lambert brand images/icons; the manifest; the offline page; and public **static HTML shells** for visited routes (network-first with a 4-second timeout). Navigated page cache keys **never contain query strings**.
- **Never intercepted or stored:** non-GET requests; cross-origin traffic; any request with an `Authorization` header; paths containing `/api/`; ranges; service-worker updates; API data; authentication tokens and cookies; private enquiries, CVs, attachments or uploads. All data still comes from the PHP backend via the normal authenticated API client.
- Signing out sends `CLEAR_RUNTIME_CACHES` to the worker and removes page/asset runtime caches; the build-hashed static cache is safe to keep.
- Updates **never** auto-reload a user's editor. A waiting worker displays a nonblocking **Reload / Later** toast. Reload explicitly activates the new version and reloads once.
- `robots: { index: false, follow: false, nocache: true }` stays in the Next metadata; build outputs `robots.txt` with `Disallow: /`.
- Production browser source maps are disabled. `.gitignore` excludes `.env*`, `/out`, `/.next` and `/node_modules`.
- `scripts/build-pwa.mjs` hashes each sorted precache file's contents into a stable version; identical source/build output produces byte-identical `sw.js` and `.nojekyll` / `robots.txt`. Build output is written **only to `out/`**.

### Hosting and base paths

For a dedicated domain root (e.g. `https://admin.lambertelectromec.com/`), leave `NEXT_PUBLIC_BASE_PATH` empty. For a GitHub Pages project site (e.g. `https://example.github.io/lambert-admin/`), set `NEXT_PUBLIC_BASE_PATH=/lambert-admin` **at build time**. The manifest, icons, shortcuts, offline URL, service-worker registration/scope, and precache paths then receive this prefix. Do not end the variable with `/`.

`out/` is ignored by Git by default; if the deployment workflow requires committing the build into a public repository, use a dedicated publish branch or explicitly `git add -f out/` after verifying no secrets are in the static output. Never commit `.env` files. The `.nojekyll` marker is generated automatically for GitHub Pages.

**Apache** (add inside the host configuration or the deployed `.htaccess`):

```apacheconf
AddType application/manifest+json .webmanifest
<IfModule mod_headers.c>
  <FilesMatch "^(sw\\.js|manifest\\.webmanifest)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
  Header set Service-Worker-Allowed "/"
</IfModule>
```

When hosting under a sub-path, use `Service-Worker-Allowed: /lambert-admin/` or omit the header (the worker is already inside its scope). Do not cache `sw.js` at the CDN or reverse proxy.

**Netlify** `public/_headers` (or a build-time generated headers file):

```text
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
/manifest.webmanifest
  Cache-Control: no-cache, no-store, must-revalidate
```

Prefix these paths with the sub-path, if used.

**Vercel** `vercel.json` (illustrative headers block):

```json
{
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }] },
    { "source": "/manifest.webmanifest", "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }] }
  ]
}
```

GitHub Pages does not offer custom response headers. The registration sets `updateViaCache: "none"`, and browsers revalidate service workers periodically; deployments may take longer to be detected than on a host with explicit cache headers.

### Release, rollback and icons

1. Run `npm run build`. Inspect `out/` and publish/commit only what you intend to expose. Users receive the update toast on the next update check or when returning to the tab.
2. To regenerate source PWA icon files, run `node scripts/generate-pwa-icons.mjs`. This uses `sharp` **only when it is already installed locally**; otherwise it prints instructions and exits successfully. Eight committed PNGs are provided under `public/icons/`. The maskable logo stays inside a central 58% image region.
3. **Emergency kill switch:** build with `NEXT_PUBLIC_PWA_DISABLED=true`. It outputs an unregistering `sw.js`, deletes all `lambert-admin-` caches, reloads open clients and stops client registration. Deploy it over the old worker URL. To restore support later, rebuild without the flag.

### Mobile fields and viewport

Under 768px, toolbar search, quick-search palette, filter inputs and `AppSelect` use 13px typography and a 40px field height. `ViewportManager` adds `viewport-fit=cover` across platforms. Only on iOS/iPadOS it adds `maximum-scale=1` to avoid automatic focus zoom on sub-16px inputs. It does not add a zoom restriction on Android. **Verify pinch-to-zoom on physical devices before deployment:** browser/version policies can differ; preserving user zoom access takes priority.

### QA checklist

- Chrome DevTools → **Application**: verify the manifest start URL, correct 192/512/maskable icons, shortcuts, service-worker scope, waiting-state toast and installability. Lighthouse no longer publishes a PWA category; use DevTools installability checks.
- Install on Chrome desktop/Android; confirm iOS Safari Share → Add to Home Screen. Test launch and shortcuts at both root and `/lambert-admin` base paths.
- In **Cache storage**, confirm no API responses, cross-origin resources, auth data or query-string navigation keys. Only static assets and HTML shells should appear.
- Test offline on already-visited routes (cached shell, API error states) and a never-visited route (offline page). Confirm offline/online banner behavior.
- Build twice with identical source; compare `sw.js`, `manifest.webmanifest`, `.nojekyll` and `robots.txt`. Change a static asset; rebuild; verify the update toast, explicit reload and cleanup of the old version.
- Sign out on a shared device; confirm runtime caches are cleared and the normal logout and route guard still work. Check `next dev` has no service worker and test the kill switch.
- Confirm mobile inputs at 390px have 13px text, 40px heights and do not trigger auto-zoom on iPhone while pinch gestures still work on both iOS and Android.
