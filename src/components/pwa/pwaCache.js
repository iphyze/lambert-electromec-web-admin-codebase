/** Clear only public runtime shell and brand-asset caches, never auth state. */
export async function clearPwaRuntimeCaches() {
  if (typeof navigator === "undefined") return;
  try { navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_RUNTIME_CACHES" }); } catch { /* Optional PWA. */ }
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => /^lambert-admin-(?:pages|assets)-/.test(key)).map((key) => caches.delete(key)));
    } catch { /* Cache cleanup must not block normal sign-out. */ }
  }
}
