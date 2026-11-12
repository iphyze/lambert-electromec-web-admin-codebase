import { apiClient } from "./client";

function normalizePagination(pagination = {}) {
  return {
    page: Number(pagination.page || 1),
    limit: Number(pagination.limit || 20),
    total: Number(pagination.total || 0),
    total_pages: Number(pagination.total_pages || 0),
  };
}

function normalizeSummary(summary = {}) {
  return {
    total: Number(summary.total || 0),
    new: Number(summary.new || 0),
    read: Number(summary.read || 0),
    replied: Number(summary.replied || 0),
    archived: Number(summary.archived || 0),
    email_failed: Number(summary.email_failed || 0),
    email_not_configured: Number(summary.email_not_configured || 0),
  };
}

export async function listAdminContactMessages(params = {}, options = {}) {
  const response = await apiClient.get("/admin/contact", { params, signal: options.signal });
  return {
    items: response?.data?.data ?? [],
    summary: normalizeSummary(response?.data?.summary),
    pagination: normalizePagination(response?.data?.pagination),
  };
}

export async function getAdminContactMessage(id, options = {}) {
  const response = await apiClient.get("/admin/contact/item", { params: { id }, signal: options.signal });
  return response?.data?.data ?? null;
}

export async function getAdminContactAiAnalysis(id, options = {}) {
  const response = await apiClient.get("/admin/contact/ai-analysis", { params: { id }, signal: options.signal });
  return {
    latest: response?.data?.data?.latest ?? null,
    history: response?.data?.data?.history ?? [],
  };
}

export async function runAdminContactAiAnalysis(id, action = "analyse") {
  const response = await apiClient.post("/admin/contact/ai-analysis", { id, action });
  return response?.data?.data ?? null;
}

export async function listAdminContactSubjects(options = {}) {
  const response = await apiClient.get("/admin/contact-routing", { signal: options.signal });
  return response?.data?.data ?? [];
}

export async function updateAdminContactRouting(subjectKey, payload) {
  const response = await apiClient.patch("/admin/contact-routing/item", payload, { params: { key: subjectKey } });
  return response?.data?.data ?? null;
}

export async function changeAdminContactStatus(id, action) {
  const response = await apiClient.post("/admin/contact/status", { id, action });
  return response?.data?.data ?? null;
}

export async function retryAdminContactEmail(id) {
  const response = await apiClient.post("/admin/contact/email", { id });
  return response?.data?.data ?? null;
}

export async function deleteAdminContactMessage(id) {
  const response = await apiClient.delete("/admin/contact/item", { params: { id } });
  return response?.data ?? null;
}

function filenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch { /* keep fallback */ }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return plain || fallback;
}

export async function downloadAdminContactCv(attachmentId, fallbackName = "cv") {
  const response = await apiClient.get("/admin/contact/cv", {
    params: { id: attachmentId },
    responseType: "blob",
  });
  const filename = filenameFromDisposition(response.headers?.["content-disposition"], fallbackName);
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return filename;
}
