# Lambert Administration Portal

Static-export Next.js administration frontend for Lambert Electromec.

## Current batch

This foundation includes:

- secure sign-in against the Lambert PHP API
- access-token + rotating HttpOnly refresh-cookie session flow
- CSRF handling
- automatic access-token refresh
- protected admin layout
- responsive sidebar/header shell
- light/dark mode
- reduced-motion-aware page transitions
- role-aware dashboard
- static export / Apache compatibility

The Projects, Divisions, Media Center, Contact Messages, Email Routing and Administrators sidebar entries are intentionally disabled in this foundation batch. Their management screens are added in subsequent batches.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_BASE_URL` to the Lambert PHP API URL.
3. Ensure the same admin origin is present in the API `ALLOWED_ORIGINS` setting.
4. Run `npm install` and `npm run dev`.

Local admin defaults to port `5174`.

## Production

`npm run build` generates the static `out/` folder. Deploy its contents to the admin site's Apache document root. A dedicated subdomain such as `admin.lambertelectromec.com` is recommended so the public corporate site and administration portal remain isolated while still using the same PHP API.
