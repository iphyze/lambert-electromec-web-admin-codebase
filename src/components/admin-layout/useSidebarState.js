"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSidebarState = create(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      tabletExpanded: false,
      hydrated: false,
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
      closeMobile: () => set({ mobileOpen: false }),
      toggleTabletExpanded: () => set((state) => ({ tabletExpanded: !state.tabletExpanded })),
      closeTablet: () => set({ tabletExpanded: false }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "lambert-admin-sidebar-v1",
      version: 1,
      partialize: (state) => ({ collapsed: state.collapsed }),
      // Avoid painting a guessed expanded/collapsed layout before storage restores.
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);
