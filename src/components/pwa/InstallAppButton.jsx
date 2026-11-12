"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share2, SquarePlus, X } from "lucide-react";
import styles from "./InstallAppButton.module.css";

const InstallContext = createContext(null);

export function InstallAppProvider({ children }) {
  const [installEvent, setInstallEvent] = useState(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [dialog, setDialog] = useState(false);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    setInstalled(isStandalone());
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // iOS Chrome does not offer the Safari Add to Home Screen menu.
    setIos(isIos && /Safari/.test(navigator.userAgent) && !/(CriOS|FxiOS|EdgiOS)/.test(navigator.userAgent));
    const capture = (event) => { event.preventDefault(); setInstallEvent(event); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); setDialog(false); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const before = document.activeElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); setDialog(false); }
      if (event.key === "Tab") {
        const buttons = Array.from(dialogRef.current?.querySelectorAll('button:not(:disabled)') || []);
        if (!buttons.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = scroll; before?.focus?.(); };
  }, [dialog]);

  const available = !installed && (Boolean(installEvent) || ios);
  const install = async () => {
    if (installed) return;
    if (installEvent) {
      const event = installEvent;
      setInstallEvent(null);
      try { await event.prompt(); await event.userChoice; } catch { /* An optional user gesture; no change to the admin. */ }
    } else if (ios) setDialog(true);
  };
  const value = useMemo(() => ({ available, ios: ios && !installEvent, install }), [available, ios, installEvent]);
  return <InstallContext.Provider value={value}>
    {children}
    {dialog && typeof document !== "undefined" && createPortal(
      <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(false); }}>
        <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-label="Add Lambert Admin to Home Screen">
          <button ref={closeRef} className={styles.close} onClick={() => setDialog(false)} aria-label="Close installation instructions"><X size={18}/></button>
          <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icons/apple-touch-icon-180.png`} width="60" height="60" alt="Lambert Admin" />
          <h2>Add to Home Screen</h2>
          <p>In Safari, tap <Share2 size={16} aria-label="Share" /> <strong>Share</strong>, then choose <SquarePlus size={16} aria-label="Add to Home Screen" /> <strong>Add to Home Screen</strong>.</p>
          <button type="button" className={styles.done} onClick={() => setDialog(false)}>Got it</button>
        </section>
      </div>, document.body)}
  </InstallContext.Provider>;
}

export function usePwaInstall() { return useContext(InstallContext) || { available: false, ios: false, install: () => undefined }; }

export default function InstallAppButton({ className = "", onSelect, tabIndex = 0, role }) {
  const { available, ios, install } = usePwaInstall();
  if (!available) return null;
  return <button type="button" className={className} role={role} tabIndex={tabIndex} onClick={() => { onSelect?.(); install(); }}><Download size={16} aria-hidden="true" />{ios ? "Add to Home Screen" : "Install app"}</button>;
}
