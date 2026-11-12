"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff, X } from "lucide-react";
import styles from "./ServiceWorkerManager.module.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const DISABLED = process.env.NEXT_PUBLIC_PWA_DISABLED === "true";

const isLambertWorker = (registration) => {
  const script = registration?.active?.scriptURL || registration?.waiting?.scriptURL || registration?.installing?.scriptURL;
  try { return script && new URL(script).pathname === `${BASE}/sw.js`; } catch { return false; }
};

export default function ServiceWorkerManager() {
  const [waiting, setWaiting] = useState(null);
  const [offline, setOffline] = useState(false);
  const activating = useRef(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => { window.removeEventListener("offline", onOffline); window.removeEventListener("online", onOnline); };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    let disposed = false;
    let registration;
    let timer;
    const onControl = () => {
      if (activating.current && !disposed) { activating.current = false; window.location.reload(); }
    };
    const onVisible = () => { if (document.visibilityState === "visible") registration?.update().then(showWaiting).catch(() => undefined); };
    const showWaiting = () => { if (!disposed && registration?.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting); };
    const onStateChanged = () => { if (registration?.installing?.state === "installed") showWaiting(); };
    const onUpdateFound = () => registration?.installing?.addEventListener("statechange", onStateChanged);

    const start = async () => {
      try {
        // Development and emergency rollbacks must not be intercepted by old workers.
        if (process.env.NODE_ENV !== "production" || DISABLED) {
          for (const reg of await navigator.serviceWorker.getRegistrations()) {
            if (isLambertWorker(reg)) await reg.unregister();
          }
          if (DISABLED && "caches" in window) {
            await Promise.all((await caches.keys()).filter((key) => key.startsWith("lambert-admin-")).map((key) => caches.delete(key)));
          }
          return;
        }
        if (!window.isSecureContext) return;
        registration = await navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/`, updateViaCache: "none" });
        if (disposed) return;
        showWaiting();
        registration.addEventListener("updatefound", onUpdateFound);
        navigator.serviceWorker.addEventListener("controllerchange", onControl);
        timer = window.setInterval(() => { registration.update().then(showWaiting).catch(() => undefined); }, 60 * 60 * 1000);
        document.addEventListener("visibilitychange", onVisible);
        await registration.update().catch(() => undefined);
      } catch { /* Registration is optional; the admin must continue working online. */ }
    };
    start();
    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", onControl);
      registration?.removeEventListener("updatefound", onUpdateFound);
      registration?.installing?.removeEventListener("statechange", onStateChanged);
    };
  }, []);

  const reloadWithNewVersion = () => {
    if (!waiting || activating.current) return;
    activating.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
    setWaiting(null);
  };

  return (
    <>
      {offline && <div role="status" className={styles.offline}><WifiOff size={15} aria-hidden="true" />You're offline — changes can't be saved until your connection returns.</div>}
      {waiting && <div role="status" className={styles.toast}>
        <RefreshCw size={17} aria-hidden="true" />
        <span>A new version of Lambert Admin is available</span>
        <button type="button" className={styles.reload} onClick={reloadWithNewVersion}>Reload</button>
        <button type="button" className={styles.later} onClick={() => setWaiting(null)} aria-label="Install this update later"><X size={16} /> <span>Later</span></button>
      </div>}
    </>
  );
}
