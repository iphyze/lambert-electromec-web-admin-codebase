"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, LogOut, Monitor, Moon, Settings2, Sun } from "lucide-react";
import { logoutRequest } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";
import { roleLabels } from "./navigation";
import styles from "./UserMenu.module.css";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Administrator";
  const initials = `${user?.first_name?.[0] || "A"}${user?.last_name?.[0] || ""}`.toUpperCase();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => { if (!containerRef.current?.contains(event.target)) setOpen(false); };
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  const items = () => Array.from(menuRef.current?.querySelectorAll('[role="menuitem"],[role="menuitemradio"]') || []);
  const onMenuKeyDown = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const all = items();
    if (!all.length) return;
    const index = all.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? all.length - 1 : event.key === "ArrowDown" ? (index + 1) % all.length : (index - 1 + all.length) % all.length;
    all[next].focus();
  };
  const showMenu = (focusLast = false) => {
    setOpen(true);
    requestAnimationFrame(() => {
      const all = items();
      all[focusLast ? all.length - 1 : 0]?.focus();
    });
  };
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutRequest(); } catch { /* Clear session and leave the admin area anyway. */ }
    finally { router.replace("/login"); setLoggingOut(false); setOpen(false); }
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.chip} ${open ? styles.chipOpen : ""}`}
        aria-label={`Account menu for ${fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => { if (open) setOpen(false); else showMenu(); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (open) items()[event.key === "ArrowUp" ? items().length - 1 : 0]?.focus();
            else showMenu(event.key === "ArrowUp");
          }
        }}
      >
        <span className={styles.avatarRing}><span className={styles.avatar}>{initials}</span></span>
        <span className={styles.identity}><strong title={fullName}>{fullName}</strong><span>{roleLabels[user?.role] || "Editor"}</span></span>
        <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} ref={menuRef} role="menu" aria-label="Account options" className={styles.menu} onKeyDown={onMenuKeyDown}>
          <div className={styles.menuIdentity}><strong>{fullName}</strong><span title={user?.email || ""}>{user?.email || ""}</span></div>
          {user?.role === "super_admin" && (
            <Link role="menuitem" tabIndex={-1} className={styles.menuItem} href="/settings" onClick={() => setOpen(false)}><Settings2 size={16} />System settings</Link>
          )}
          <div className={styles.sectionLabel}>Appearance</div>
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={mounted && theme === value}
              tabIndex={-1}
              className={styles.menuItem}
              onClick={() => { setTheme(value); setOpen(false); triggerRef.current?.focus(); }}
            >
              <Icon size={16} />{label}<Check size={15} className={styles.check} aria-hidden="true" style={{ visibility: mounted && theme === value ? "visible" : "hidden" }} />
            </button>
          ))}
          <div className={styles.separator} />
          <button role="menuitem" tabIndex={-1} type="button" className={`${styles.menuItem} ${styles.danger}`} disabled={loggingOut} onClick={handleLogout}>
            <LogOut size={16} />{loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
