"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PageTransition from "@/components/layout/PageTransition";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { useAuthStore } from "@/stores/authStore";
import { isAdministrator } from "./navigation";
import { useSidebarState } from "./useSidebarState";
import SideMenu from "./SideMenu";
import TopBar from "./TopBar";
import styles from "./AdminLayout.module.css";

function viewportMode() {
  if (window.matchMedia("(max-width: 767px)").matches) return "mobile";
  if (window.matchMedia("(max-width: 1099px)").matches) return "tablet";
  return "desktop";
}

function normalizedPath(path) {
  return String(path || "/").replace(/\/+$/, "") || "/";
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.user?.role);
  const collapsed = useSidebarState((state) => state.collapsed);
  const mobileOpen = useSidebarState((state) => state.mobileOpen);
  const tabletExpanded = useSidebarState((state) => state.tabletExpanded);
  const hydrated = useSidebarState((state) => state.hydrated);
  const [mode, setMode] = useState("desktop");
  const [modeReady, setModeReady] = useState(false);
  const [newMessages, setNewMessages] = useState(null);
  const contentRef = useRef(null);
  const workspaceRef = useRef(null);
  const lastPathRef = useRef(normalizedPath(pathname));
  const historyNavigationRef = useRef(false);
  const ready = hydrated && modeReady;

  useEffect(() => {
    // Read the stored width before displaying the real shell.
    Promise.resolve(useSidebarState.persist.rehydrate()).finally(() => {
      useSidebarState.getState().setHydrated(true);
    });
    const update = () => setMode(viewportMode());
    update();
    setModeReady(true);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Native history navigation must retain the browser / Next.js scroll position.
  // A #hash-only change does not change usePathname, and is never reset.
  useEffect(() => {
    const onPopState = () => {
      if (normalizedPath(window.location.pathname) !== lastPathRef.current) {
        historyNavigationRef.current = true;
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Runs on every genuine pathname transition, regardless of whether the link came
  // from the menu, command palette, a table row, or a page action.
  useLayoutEffect(() => {
    if (!ready) return;
    const nextPath = normalizedPath(pathname);
    if (nextPath === lastPathRef.current) return;

    const isHistoryNavigation = historyNavigationRef.current;
    historyNavigationRef.current = false;
    lastPathRef.current = nextPath;

    if (!isHistoryNavigation) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      if (workspaceRef.current) workspaceRef.current.scrollTop = 0;
      if (contentRef.current) contentRef.current.scrollTop = 0;
    }
    // A programmatic main focus announces the new route without scrolling it back
    // down or producing an outline on the main content container.
    contentRef.current?.focus({ preventScroll: true });
  }, [pathname, ready]);

  useEffect(() => {
    useSidebarState.getState().closeMobile();
    useSidebarState.getState().closeTablet();
  }, [pathname, mode]);

  // One real count powers both the menu badge and the notifications button.
  useEffect(() => {
    if (!isAdministrator(role)) return undefined;
    const controller = new AbortController();
    const loadCount = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const summary = await getDashboardSummary({ signal: controller.signal });
        if (controller.signal.aborted) return;
        const count = Number(summary?.contacts?.by_status?.new);
        setNewMessages(Number.isFinite(count) && count >= 0 ? Math.floor(count) : null);
      } catch {
        if (!controller.signal.aborted) setNewMessages(null);
      }
    };
    loadCount();
    const timer = window.setInterval(loadCount, 120000);
    document.addEventListener("visibilitychange", loadCount);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", loadCount);
    };
  }, [role]);

  useEffect(() => {
    if (!ready) return undefined;
    const onShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        if (mode === "desktop") useSidebarState.getState().toggleCollapsed();
        if (mode === "tablet") useSidebarState.getState().toggleTabletExpanded();
        if (mode === "mobile") useSidebarState.getState().setMobileOpen(!useSidebarState.getState().mobileOpen);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [mode, ready]);

  const menuCollapsed = mode === "tablet" ? !tabletExpanded : mode === "desktop" ? collapsed : false;

  if (!ready) {
    return <div className={styles.preparing} role="status" aria-live="polite"><span className={styles.preparingDot} aria-hidden="true" />Preparing your workspace…</div>;
  }

  return (
    <div className={styles.shell} data-collapsed={menuCollapsed} data-mode={mode}>
      <a className={styles.skipLink} href="#admin-content">Skip to content</a>
      <SideMenu mode={mode} collapsed={menuCollapsed} mobileOpen={mobileOpen} tabletExpanded={tabletExpanded} newMessages={newMessages} />
      <div ref={workspaceRef} className={styles.workspace}>
        <TopBar mode={mode} newMessages={newMessages} />
        <main id="admin-content" ref={contentRef} className={styles.content} tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
