"use client";

import { useEffect } from "react";

// iOS Safari ignores maximum-scale for user pinch gestures in modern versions,
// while respecting it for focus-triggered auto-zoom on small form controls.
// We never add a maximum-scale restriction on Android or desktop browsers.
export default function ViewportManager() {
  useEffect(() => {
    const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;
    const current = viewport.getAttribute("content") || "width=device-width, initial-scale=1";
    const stripped = current.split(",").map((part) => part.trim()).filter((part) =>
      part && !/^(?:maximum-scale|viewport-fit|user-scalable)\s*=/.test(part)
    );
    // Restore the same viewport-fit across devices; do not suppress pinch zoom.
    const next = [
      ...stripped,
      ...(appleMobile ? ["maximum-scale=1"] : []),
      "viewport-fit=cover",
    ].join(", ");
    if (next !== current) viewport.setAttribute("content", next);
  }, []);
  return null;
}
