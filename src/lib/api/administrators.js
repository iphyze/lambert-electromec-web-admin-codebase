import { apiClient } from "./client";

function normalizePagination(pagination = {}) {
  return {
    page: Number(pagination.page || 1),
    limit: Number(pagination.limit || 12),
    total: Number(pagination.total || 0),
    total_pages: Number(pagination.total_pages || 0),
  };
}

function normalizeSummary(summary = {}) {
  return {
    total: Number(summary.total || 0),
    active: Number(summary.active || 0),
    super_admins: Number(summary.super_admins || 0),
    restricted: Number(summary.restricted || 0),
  };
}

export async function listAdministrators(params = {}, options = {}) {
  const response = await apiClient.get("/admin/administrators", {
    params,
    signal: options.signal,
  });

  return {
    items: response?.data?.data ?? [],
    summary: normalizeSummary(response?.data?.summary),
    pagination: normalizePagination(response?.data?.pagination),
  };
}

export async function createAdministrator(payload) {
  const response = await apiClient.post("/admin/administrators", payload);
  return response?.data?.data ?? null;
}

export async function updateAdministrator(id, payload) {
  const response = await apiClient.patch("/admin/administrators/item", payload, {
    params: { id },
  });
  return response?.data?.data ?? null;
}

export async function resetAdministratorPassword(id, password) {
  const response = await apiClient.post("/admin/administrators/security", {
    id,
    action: "reset_password",
    password,
  });
  return response?.data?.message ?? "Password reset successfully.";
}

export async function revokeAdministratorSessions(id) {
  const response = await apiClient.post("/admin/administrators/security", {
    id,
    action: "revoke_sessions",
  });
  return response?.data?.message ?? "Administrator sessions revoked.";
}
