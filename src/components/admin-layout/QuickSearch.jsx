"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Download, Files, Moon, Search, Sun, X } from "lucide-react";
import { usePwaInstall } from "@/components/pwa/InstallAppButton";
import { useAuthStore } from "@/stores/authStore";
import { useSidebarState } from "./useSidebarState";
import { visibleNavigation } from "./navigation";
import styles from "./QuickSearch.module.css";

export default function QuickSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const role = useAuthStore((state) => state.user?.role);
  const { resolvedTheme, setTheme } = useTheme();
  const { available: installAvailable, ios: installIos, install } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const entries = useMemo(() => [
    ...visibleNavigation(role).flatMap((group) => group.items.map((item) => ({ ...item, section: group.label, kind: "navigation" }))),
    { label: "New project", href: "/projects/new", icon: BriefcaseBusiness, section: "Quick actions", kind: "navigation" },
    { label: "New media item", href: "/media-center/new", icon: Files, section: "Quick actions", kind: "navigation" },
    { label: "Toggle theme", icon: resolvedTheme === "dark" ? Sun : Moon, section: "Quick actions", kind: "theme" },
    ...(installAvailable ? [{ label: installIos ? "Add to Home Screen" : "Install app", icon: Download, section: "Quick actions", kind: "install" }] : []),
  ], [role, resolvedTheme, installAvailable, installIos]);
  const results = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return entries.filter((item) => !text || `${item.label} ${item.section}`.toLocaleLowerCase().includes(text));
  }, [entries, query]);

  useEffect(() => {
    const onShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        useSidebarState.getState().closeMobile();
        useSidebarState.getState().closeTablet();
        setOpen((previous) => !previous);
      }
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const trapFocus = (event) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll('input:not([disabled]),button:not([disabled])') || []);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
      else if (!dialogRef.current?.contains(document.activeElement)) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = oldOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  const close = () => { setOpen(false); setQuery(""); setSelected(0); };
  const run = (entry) => {
    if (!entry) return;
    close();
    if (entry.kind === "theme") setTheme(resolvedTheme === "dark" ? "light" : "dark");
    else if (entry.kind === "install") install();
    else router.push(entry.href);
  };
  const onInputKeyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setSelected((value) => (value + 1) % (results.length || 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setSelected((value) => (value - 1 + (results.length || 1)) % (results.length || 1)); }
    if (event.key === "Enter") { event.preventDefault(); run(results[Math.min(selected, results.length - 1)]); }
  };

  return (
    <>
      <button ref={triggerRef} type="button" className={styles.trigger} onClick={() => { useSidebarState.getState().closeMobile(); useSidebarState.getState().closeTablet(); setOpen(true); }} aria-label="Open quick search" aria-haspopup="dialog" aria-expanded={open}>
        <Search size={17} aria-hidden="true" /><span className={styles.triggerText}>Quick search</span><kbd className={styles.shortcut}>Ctrl/⌘ K</kbd>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-label="Quick search">
            <div className={styles.searchRow}>
              <Search size={19} className={styles.searchIcon} aria-hidden="true" />
              <input ref={inputRef} className={styles.input} value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} onKeyDown={onInputKeyDown} placeholder="Find a page or action…" aria-label="Search pages and actions" aria-controls="quick-search-results" aria-activedescendant={results[selected] ? `quick-search-item-${selected}` : undefined} role="combobox" aria-autocomplete="list" aria-expanded="true" />
              <button type="button" className={styles.closeButton} onClick={close} aria-label="Close quick search"><X size={17} /></button>
            </div>
            <div id="quick-search-results" className={styles.results} role="listbox" aria-label="Search results">
              {results.length ? results.map((entry, index) => {
                const Icon = entry.icon;
                return (
                  <button key={`${entry.section}-${entry.label}`} id={`quick-search-item-${index}`} role="option" aria-selected={index === selected} type="button" className={`${styles.result} ${index === selected ? styles.selected : ""}`} onMouseEnter={() => setSelected(index)} onClick={() => run(entry)}>
                    <span className={styles.resultIcon}><Icon size={18} /></span><span className={styles.resultName}>{entry.label}<small>{entry.section}</small></span><span className={styles.enterHint}>↵</span>
                  </button>
                );
              }) : <p className={styles.empty}>No matching pages or actions.</p>}
            </div>
            <div className={styles.footer}><span>↑ ↓ to navigate</span><span>↵ to select</span><span>Esc to close</span></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
