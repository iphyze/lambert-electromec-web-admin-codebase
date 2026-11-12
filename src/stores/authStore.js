import { create } from "zustand";
const initialState = { user: null, accessToken: null, tokenExpiresAt: null, csrfToken: null, initialized: false, restoring: false };
export const useAuthStore = create((set) => ({
  ...initialState,
  setSession: ({ user, accessToken, tokenExpiresAt, csrfToken }) => set({ user, accessToken, tokenExpiresAt: tokenExpiresAt ?? null, csrfToken: csrfToken ?? null }),
  setCsrfToken: (csrfToken) => set({ csrfToken }),
  setInitialized: (initialized) => set({ initialized }),
  setRestoring: (restoring) => set({ restoring }),
  clearSession: () => set({ user: null, accessToken: null, tokenExpiresAt: null, csrfToken: null }),
}));
export function authStoreSnapshot() { return useAuthStore.getState(); }
