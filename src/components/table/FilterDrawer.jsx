"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import AppSelect from "@/components/form/AppSelect";
import styles from "./FilterDrawer.module.css";

const SELECTOR = 'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"]), [role="combobox"]';

export default function FilterDrawer({ open = false, onClose, applied = {}, fields = [], onApply }) {
  const [staged, setStaged] = useState({});
  const titleId = useId();
  const panelRef = useRef(null);
  const focusReturnRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setStaged({ ...applied });
    focusReturnRef.current = document.activeElement;
    const previousScroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    panel?.querySelector('[aria-label="Close filters"]')?.focus();

    function onKey(event) {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current?.(); return; }
      if (event.key !== "Tab") return;
      const nodes = [...(panel?.querySelectorAll(SELECTOR) || [])].filter((node) => node.getClientRects().length && !node.closest('[aria-hidden="true"]'));
      if (!nodes.length) { event.preventDefault(); panel?.focus(); return; }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousScroll;
      focusReturnRef.current?.focus?.();
    };
    // The applied values are intentionally captured at open time only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => setStaged(Object.fromEntries(fields.map(({ key }) => [key, ""])));
  const apply = () => { onApply?.(staged); onClose?.(); };

  return <div className={`${styles.root} ${open ? styles.open : ""}`} aria-hidden={open ? undefined : "true"}>
    <button className={styles.backdrop} type="button" aria-label="Close filters" onClick={onClose} tabIndex={open ? 0 : -1} />
    <aside ref={panelRef} className={styles.panel} role="dialog" aria-modal={open ? "true" : undefined} aria-labelledby={titleId} tabIndex={-1} inert={!open}>
      <header className={styles.head}>
        <div className={styles.title}><span className={styles.titleIcon}><SlidersHorizontal size={20} /></span><div><h2 id={titleId}>Filters</h2><p>Refine results using the options below.</p></div></div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close filters"><X size={19} /></button>
      </header>
      <div className={styles.body}>
        {fields.map((field) => <div key={field.key} className={styles.field}>
          <label className={styles.label}>{field.label}</label>
          <AppSelect value={staged[field.key] ?? ""} onChange={(value) => setStaged((previous) => ({ ...previous, [field.key]: value }))} options={field.options || []} placeholder={field.placeholder || `All ${field.label.toLowerCase()}`} ariaLabel={field.label} isSearchable={field.isSearchable ?? true} menuPlacement="auto" />
          {field.helper ? <span className={styles.help}>{field.helper}</span> : null}
        </div>)}
      </div>
      <footer className={styles.footer}>
        <button type="button" className={styles.reset} onClick={reset}>Reset</button>
        <button type="button" className={styles.apply} onClick={apply}>Apply filters</button>
      </footer>
    </aside>
  </div>;
}
