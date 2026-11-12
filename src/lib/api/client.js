import axios from "axios";
import { authStoreSnapshot, useAuthStore } from "@/stores/authStore";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost/lambert-api").replace(/\/+$/, "");
const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);
export const authClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { Accept: "application/json" } });
export const apiClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { Accept: "application/json" } });
let refreshPromise = null;
let restorePromise = null;

function sessionFromResponse(data) {
  const payload = data?.data ?? {};
  return {
    user: { id: payload.id, first_name: payload.first_name ?? "", last_name: payload.last_name ?? "", email: payload.email ?? "", role: payload.role ?? "editor" },
    accessToken: payload.token ?? null,
    tokenExpiresAt: payload.token_expires_at ?? null,
    csrfToken: payload.csrf_token ?? null,
  };
}
export function apiErrorMessage(error, fallback = "Something went wrong. Please try again.") { return error?.response?.data?.message || error?.message || fallback; }
export async function issueCsrfToken() {
  const response = await authClient.get("/auth/csrf");
  const token = response?.data?.data?.csrf_token ?? null;
  if (token) useAuthStore.getState().setCsrfToken(token);
  return token;
}
export async function refreshSession({ clearOnFailure = true, forceCsrf = false } = {}) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const store = useAuthStore.getState();
    let csrfToken = store.csrfToken;
    if (!csrfToken || forceCsrf) csrfToken = await issueCsrfToken();
    const response = await authClient.post("/auth/refresh", null, { headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined });
    const session = sessionFromResponse(response.data);
    useAuthStore.getState().setSession(session);
    return session;
  })().catch((error) => { if (clearOnFailure) useAuthStore.getState().clearSession(); throw error; }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function restoreSession() {
  const current = useAuthStore.getState();
  if (current.initialized && current.user && current.accessToken) return current;
  if (restorePromise) return restorePromise;
  restorePromise = (async () => {
    useAuthStore.getState().setRestoring(true);
    try {
      const response = await authClient.post("/auth/restore", null);
      if (response?.data?.data?.authenticated === false) { useAuthStore.getState().clearSession(); return null; }
      const session = sessionFromResponse(response.data);
      useAuthStore.getState().setSession(session);
      return session;
    } catch (error) {
      const latest = useAuthStore.getState();
      if (!latest.accessToken) latest.clearSession();
      throw error;
    } finally {
      const latest = useAuthStore.getState();
      latest.setRestoring(false);
      latest.setInitialized(true);
    }
  })().finally(() => { restorePromise = null; });
  return restorePromise;
}
export async function loginRequest(credentials) {
  const response = await authClient.post("/auth/login", credentials, { headers: { "Content-Type": "application/json" } });
  const session = sessionFromResponse(response.data);
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setInitialized(true);
  return session;
}
export async function logoutRequest() {
  const store = useAuthStore.getState();
  let csrfToken = store.csrfToken;
  try {
    if (!csrfToken) csrfToken = await issueCsrfToken();
    await authClient.post("/auth/logout", null, { headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined });
  } finally {
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setInitialized(true);
  }
}
apiClient.interceptors.request.use((config) => {
  const store = authStoreSnapshot();
  const method = String(config.method || "get").toLowerCase();
  config.headers = config.headers || {};
  if (store.accessToken) config.headers.Authorization = `Bearer ${store.accessToken}`;
  if (WRITE_METHODS.has(method) && store.csrfToken) config.headers["X-CSRF-Token"] = store.csrfToken;
  return config;
});
apiClient.interceptors.response.use((response) => response, async (error) => {
  const originalRequest = error?.config;
  const status = error?.response?.status;
  if (status !== 401 || !originalRequest || originalRequest.__lambertRefreshAttempted || String(originalRequest.url || "").includes("/auth/refresh")) return Promise.reject(error);
  originalRequest.__lambertRefreshAttempted = true;
  try {
    const session = await refreshSession();
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
    const method = String(originalRequest.method || "get").toLowerCase();
    if (WRITE_METHODS.has(method) && session.csrfToken) originalRequest.headers["X-CSRF-Token"] = session.csrfToken;
    return apiClient(originalRequest);
  } catch (refreshError) {
    useAuthStore.getState().clearSession();
    return Promise.reject(refreshError);
  }
});
export { API_BASE_URL };
