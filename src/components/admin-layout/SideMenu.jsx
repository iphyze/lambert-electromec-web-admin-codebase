"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, PanelLeftClose, PanelLeftOpen, ShieldCheck, X } from "lucide-react";
import { getAnalyticsSummary } from "@/lib/api/analytics";
import { useAuthStore } from "@/stores/authStore";
import { isActive, isAdministrator, roleLabels, visibleNavigation } from "./navigation";
import { useSidebarState } from "./useSidebarState";
import styles from "./SideMenu.module.css";

function todayYmd() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function SideMenu({ mode, collapsed, mobileOpen, tabletExpanded, newMessages }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const navigation = visibleNavigation(role);
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const [statistics, setStatistics] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const isMobileDrawer = mode === "mobile" && mobileOpen;
  const isTabletOverlay = mode === "tablet" && tabletExpanded;
  const showBackdrop = isMobileDrawer || isTabletOverlay;
  const closeMenu = () => {
    setTooltip(null);
    useSidebarState.getState().closeMobile();
    useSidebarState.getState().closeTablet();
  };

  useEffect(() => {
    if (!isAdministrator(role) || collapsed || (mode === "mobile" && !mobileOpen)) return undefined;
    const controller = new AbortController();
    const load = async () => {
      try {
        const today = todayYmd();
        const result = await getAnalyticsSummary({ from: today, to: today, compare: false }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const visitors = Number(result?.totals?.visitors);
        const pageviews = Number(result?.totals?.pageviews);
        if (result?.totals && Number.isFinite(visitors) && Number.isFinite(pageviews)) {
          setStatistics({ visitors, pageviews });
        }
      } catch { /* Optional statistics card: fail silently. */ }
    };
    load();
    return () => controller.abort();
  }, [role, collapsed, mode, mobileOpen]);

  useEffect(() => {
    if (!isMobileDrawer) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeydown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(drawerRef.current?.querySelectorAll('a[href],button:not([disabled])') || []);
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (!drawerRef.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  // Deliberately re-run only when the drawer enters/leaves mobile-dialog mode.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileDrawer]);

  useEffect(() => { setTooltip(null); }, [pathname, collapsed, mode]);

  const showTooltip = (event, label) => {
    if (!collapsed || mode === "mobile") return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 12 });
  };

  return (
    <>
      {showBackdrop && <button className={styles.backdrop} aria-label="Close navigation" type="button" onClick={closeMenu} />}
      <aside
        ref={drawerRef}
        id="lambert-side-menu"
        className={styles.sidebar}
        data-collapsed={collapsed}
        data-mobile-open={isMobileDrawer}
        data-tablet-open={isTabletOverlay}
        role={mode === "mobile" ? "dialog" : undefined}
        aria-label="Lambert navigation"
        aria-modal={mode === "mobile" ? mobileOpen : undefined}
        aria-hidden={mode === "mobile" && !mobileOpen ? true : undefined}
        inert={mode === "mobile" && !mobileOpen ? true : undefined}
      >
        <div className={styles.brandRow}>
          <Link href="/dashboard" className={styles.brand} aria-label="Lambert admin dashboard" onClick={closeMenu}>
            <span className={styles.brandTile} aria-hidden="true"><Image src="/images/brand/favicon.png" alt="" width={22} height={22} className={styles.brandIcon} priority /></span>
            {!(collapsed && mode !== "mobile") && <span className={styles.brandCopy}><strong>Lambert</strong><small>Admin Console</small></span>}
          </Link>
          {mode === "mobile" ? (
            <button ref={closeRef} className={styles.collapseButton} type="button" onClick={closeMenu} aria-label="Close navigation" aria-controls="lambert-side-menu" aria-expanded={mobileOpen}><X size={19} /></button>
          ) : (
            <button
              className={styles.collapseButton}
              type="button"
              onClick={() => mode === "tablet" ? useSidebarState.getState().toggleTabletExpanded() : useSidebarState.getState().toggleCollapsed()}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              aria-controls="lambert-side-menu"
              aria-expanded={!collapsed}
              title={collapsed ? "Expand navigation (Ctrl/⌘ B)" : "Collapse navigation (Ctrl/⌘ B)"}
            >{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
          )}
        </div>
        <div className={styles.menuBody} onScroll={() => setTooltip(null)}>
          {navigation.map((group) => (
            <section key={group.label} className={styles.group} aria-label={group.label}>
              <div className={styles.groupTitle}>{collapsed ? <span className={styles.groupDivider} aria-hidden="true" /> : group.label}</div>
              <nav className={styles.navigation} aria-label={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  const badge = item.href === "/contacts" && Number.isFinite(newMessages) && newMessages > 0 ? newMessages : null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.navItem} ${active ? styles.active : ""}`}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? `${item.label}${badge !== null ? `, ${badge} new messages` : ""}` : undefined}
                      onClick={closeMenu}
                      onMouseEnter={(event) => showTooltip(event, item.label)}
                      onMouseLeave={() => setTooltip(null)}
                      onFocus={(event) => showTooltip(event, item.label)}
                      onBlur={() => setTooltip(null)}
                    >
                      <span className={styles.iconTile} aria-hidden="true"><Icon className={styles.navIcon} size={17} strokeWidth={1.6} /></span>
                      <span className={styles.navText}>{item.label}</span>
                      {badge !== null && <span className={styles.badge} aria-label={`${badge} new messages`}>{badge > 99 ? "99+" : badge}</span>}
                    </Link>
                  );
                })}
              </nav>
            </section>
          ))}
          {!collapsed && (
            <div className={styles.bottomArea}>
              {isAdministrator(role) ? (statistics && (
                <div className={styles.statCard}>
                  <div className={styles.statHeading}><span className={styles.liveDot} />Website today</div>
                  <div className={styles.statValues}>
                    <div><strong>{statistics.visitors.toLocaleString()}</strong><span>Visitors</span></div>
                    <div><strong>{statistics.pageviews.toLocaleString()}</strong><span>Page views</span></div>
                  </div>
                  <Link href="/analytics" className={styles.statLink} onClick={closeMenu}>View statistics <ArrowUpRight size={15} /></Link>
                </div>
              )) : (
                <div className={styles.editorCard}>
                  <ShieldCheck size={19} aria-hidden="true" />
                  <span>Signed in as <strong>{roleLabels[role] || "Editor"}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
      {tooltip && typeof document !== "undefined" && createPortal(
        <span role="tooltip" className={styles.tooltip} style={{ top: tooltip.top, left: tooltip.left }}>{tooltip.label}</span>,
        document.body
      )}
    </>
  );
}
