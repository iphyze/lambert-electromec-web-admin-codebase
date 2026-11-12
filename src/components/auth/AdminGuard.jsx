"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreSession } from "@/lib/api/client";
import { useAuthStore } from "@/stores/authStore";
import styles from "./AuthGuard.module.css";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const restoring = useAuthStore((state) => state.restoring);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const authenticated = Boolean(user && accessToken);

  useEffect(() => {
    if (!initialized && !restoring) {
      restoreSession().catch(() => {});
      return;
    }
    if (initialized && !restoring && !authenticated) router.replace("/login");
  }, [authenticated, initialized, restoring, router]);

  if (!initialized || restoring || !authenticated) {
    return (
      <div className={styles.screen} role="status" aria-live="polite">
        <div className={styles.loader}>
          <span className={styles.iconWrap}><ShieldCheck size={22} /></span>
          <div>
            <strong>Securing your workspace</strong>
            <span>Restoring your Lambert admin session…</span>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
