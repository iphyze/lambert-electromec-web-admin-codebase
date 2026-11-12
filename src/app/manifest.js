// Static manifest metadata route. These paths are resolved when the site is built.
// Required by Next.js static export for generated metadata routes.
export const dynamic = "force-static";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");
const at = (path) => `${basePath}${path}`;

export default function manifest() {
  return {
    name: "Lambert Admin Console",
    short_name: "Lambert Admin",
    description: "Manage Lambert Electromec website content, enquiries and statistics.",
    id: at("/dashboard/"),
    start_url: at("/dashboard/"),
    scope: at("/"),
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#f6f8f7",
    theme_color: "#1f9150",
    categories: ["business", "productivity"],
    icons: [
      { src: at("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: at("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: at("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", url: at("/dashboard/"), icons: [{ src: at("/icons/shortcut-dashboard.png"), sizes: "96x96", type: "image/png" }] },
      { name: "Projects", url: at("/projects/"), icons: [{ src: at("/icons/shortcut-projects.png"), sizes: "96x96", type: "image/png" }] },
      { name: "Contact Messages", url: at("/contacts/"), icons: [{ src: at("/icons/shortcut-contacts.png"), sizes: "96x96", type: "image/png" }] },
      { name: "Website Statistics", url: at("/analytics/"), icons: [{ src: at("/icons/shortcut-analytics.png"), sizes: "96x96", type: "image/png" }] },
    ],
  };
}
