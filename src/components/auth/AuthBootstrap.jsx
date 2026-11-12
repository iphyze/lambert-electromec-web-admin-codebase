"use client";

import { useEffect } from "react";
import { restoreSession } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";

export default function AuthBootstrap() {
  const initialized = useAuthStore((state) => state.initialized);
  useEffect(() => {
    if (!initialized) restoreSession().catch(() => {});
  }, [initialized]);
  return null;
}
