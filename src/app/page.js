"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function HomePage() {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const accessToken = useAuthStore((state) => state.accessToken);
  useEffect(() => {
    if (initialized) router.replace(accessToken ? "/dashboard" : "/login");
  }, [accessToken, initialized, router]);
  return null;
}
