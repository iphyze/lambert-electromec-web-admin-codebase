"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { restoreSession } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";

export default function AuthBootstrap() {
  const initialized = useAuthStore((state) => state.initialized);
  const pathname = usePathname();
  useEffect(() => {
    // The offline fallback is a public, self-contained shell with no API calls.
    if (String(pathname || "").replace(/\/+$/, "") === "/offline") return;
    if (!initialized) restoreSession().catch(() => {});
  }, [initialized, pathname]);
  return null;
}
