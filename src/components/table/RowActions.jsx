"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import styles from "./RowActions.module.css";

function intentFor(action) {
  const label = String(action.props?.title || action.props?.["aria-label"] || "").toLowerCase();
  if (/delete|remove|suspend|revoke|permanent/.test(label)) return "danger";
  if (/archive|deactivate|publish|unpublish|disable/.test(label)) return "warning";
  if (/edit|update|reset password/.test(label)) return "edit";
  if (/view|open/.test(label)) return "view";
  return "neutral";
}

export default function RowActions({ children, className = "" }) {
  const actions = Children.toArray(children).filter(Boolean);
  const visible = actions.length > 3 ? actions.slice(0, 2) : actions;
  const hidden = actions.length > 3 ? actions.slice(2) : [];
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 8 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event) {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    }
    function keys(event) {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !menuRef.current?.contains(document.activeElement)) return;
      const options = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])'));
      if (!options.length) return;
      event.preventDefault();
      const at = options.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (at + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[next]?.focus();
    }
    function closeScroll(event) { if (!menuRef.current?.contains(event.target)) setOpen(false); }
    function closeOnFocus(event) {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("focusin", closeOnFocus);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", keys);
    window.addEventListener("scroll", closeScroll, true);
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => { document.removeEventListener("focusin", closeOnFocus); document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", keys); window.removeEventListener("scroll", closeScroll, true); };
  }, [open]);

  const renderAction = (action, index, menu = false) => {
    if (!isValidElement(action)) return null;
    const intent = intentFor(action);
    const text = action.props.title || action.props["aria-label"] || "Action";
    const originalClick = action.props.onClick;
    const attrs = {
      title: text,
      "aria-label": action.props["aria-label"] || text,
      className: `${action.props.className || ""} ${styles.actionButton} ${styles[intent] || ""}`.trim(),
      onClick: (event) => { event.stopPropagation(); if (menu) setOpen(false); originalClick?.(event); },
      ...(menu ? { role: "menuitem", tabIndex: 0 } : {}),
    };
    return <span className={menu ? styles.menuAction : styles.action} key={action.key ?? index}>
      {cloneElement(action, attrs)}
      {menu ? <span className={styles.menuLabel}>{text}</span> : null}
    </span>;
  };

  const toggle = (event) => {
    event.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const height = hidden.length * 46 + 16;
      setPosition({ top: window.innerHeight - rect.bottom < height && rect.top > height ? rect.top - height - 6 : rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
    }
    setOpen((value) => !value);
  };

  return <div className={`${styles.actions} ${className}`} onClick={(event) => event.stopPropagation()}>
    {visible.map((action, index) => renderAction(action, index))}
    {hidden.length ? <button ref={triggerRef} type="button" className={`${styles.actionButton} ${styles.neutral}`} aria-label="More actions" title="More actions" aria-expanded={open} aria-haspopup="menu" onClick={toggle}><MoreHorizontal size={18} /></button> : null}
    {open && typeof document !== "undefined" ? createPortal(<div ref={menuRef} role="menu" aria-label="More actions" className={styles.menu} style={position} onClick={(event) => event.stopPropagation()}>{hidden.map((action, index) => renderAction(action, index, true))}</div>, document.body) : null}
  </div>;
}
