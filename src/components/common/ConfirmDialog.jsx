"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "./ConfirmDialog.module.css";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger", busy = false, onConfirm, onClose }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const keydown = (event) => {
      if (event.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", keydown);
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", keydown);
      previous?.focus?.();
    };
  }, [open, busy, onClose]);
  if (!open) return null;
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose?.(); }}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={styles.header}>
          <span className={`${styles.icon} ${styles[tone] || ""}`}><AlertTriangle size={20} /></span>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </div>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className={styles.cancel} onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={`${styles.confirm} ${styles[tone] || ""}`} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
