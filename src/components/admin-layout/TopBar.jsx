"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { isAdministrator, pageMeta } from "./navigation";
import { useSidebarState } from "./useSidebarState";
import QuickSearch from "./QuickSearch";
import ThemeSwitch from "./ThemeSwitch";
import UserMenu from "./UserMenu";
import styles from "./TopBar.module.css";

export default function TopBar({ mode, newMessages }) {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.user?.role);
  const [scrolled, setScrolled] = useState(false);
  const { title, section, parent } = pageMeta(pathname);
  const crumbDetail = parent ? String(pathname || "").replace(/\/+$/, "").split("/").at(-1).replace(/^./, (letter) => letter.toUpperCase()) : null;
  const mobileOpen = useSidebarState((state) => state.mobileOpen);
  useEffect(() => {
    const checkScroll = () => setScrolled(window.scrollY > 12);
    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => window.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    <header className={`${styles.topBar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.left}>
        {mode === "mobile" && (
          <button type="button" className={styles.menuButton} aria-label="Open navigation" aria-controls="lambert-side-menu" aria-expanded={mobileOpen} onClick={() => useSidebarState.getState().setMobileOpen(true)}><Menu size={20} /></button>
        )}
        <div className={styles.titles}>
          <div className={styles.breadcrumb}><span>{parent || section}</span>{crumbDetail && <><span className={styles.slash} aria-hidden="true">/</span><span>{crumbDetail}</span></>}</div>
          <h1 className={styles.title}>{title}</h1>
        </div>
      </div>
      <div className={styles.actions}>
        <QuickSearch />
        {isAdministrator(role) && (
          <Link href="/contacts" className={styles.bell} aria-label={newMessages > 0 ? `${newMessages} new contact messages` : "Contact messages"} title="Contact messages">
            <Bell size={18} aria-hidden="true" />
            {Number.isFinite(newMessages) && newMessages > 0 && <span className={styles.notice}>{newMessages > 99 ? "99+" : newMessages}</span>}
          </Link>
        )}
        <ThemeSwitch />
        <div className={styles.actionDivider} aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
}
