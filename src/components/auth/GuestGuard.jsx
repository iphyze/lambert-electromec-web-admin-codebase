"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreSession } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";

export default function GuestGuard({ children }) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const restoring = useAuthStore((state) => state.restoring);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!initialized && !restoring) {
      restoreSession().catch(() => {});
      return;
    }
    if (initialized && !restoring && user && accessToken) router.replace("/dashboard");
  }, [accessToken, initialized, restoring, router, user]);

  if (!initialized || restoring || (user && accessToken)) return null;
  return children;
}
