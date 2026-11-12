"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const THEME_TRANSITION_MS = 320;

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const transitionTimerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => window.clearTimeout(transitionTimerRef.current);
  }, []);

  if (!mounted) {
    return <button className="theme-toggle" type="button" aria-label="Change theme" disabled />;
  }

  const isDark = resolvedTheme === "dark";

  const handleThemeChange = () => {
    const root = document.documentElement;
    window.clearTimeout(transitionTimerRef.current);
    root.classList.add("theme-transitioning");
    setTheme(isDark ? "light" : "dark");

    transitionTimerRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, THEME_TRANSITION_MS);
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={handleThemeChange}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
