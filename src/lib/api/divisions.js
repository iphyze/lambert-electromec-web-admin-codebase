import { apiClient } from "./client";

export async function listAdminDivisions(options = {}) {
  const response = await apiClient.get("/admin/divisions", { signal: options.signal });
  return response?.data?.data ?? [];
}

export async function createAdminDivision(payload) {
  const response = await apiClient.post("/admin/divisions", payload);
  return response?.data?.data ?? null;
}

export async function updateAdminDivision(id, payload) {
  const response = await apiClient.patch("/admin/divisions/item", payload, { params: { id } });
  return response?.data?.data ?? null;
}

export async function deactivateAdminDivision(id) {
  const response = await apiClient.delete("/admin/divisions/item", { params: { id } });
  return response?.data?.data ?? null;
}

export async function deleteAdminDivision(id) {
  const response = await apiClient.delete("/admin/divisions/item", { params: { id, hard: 1 } });
  return response?.data?.data ?? null;
}
