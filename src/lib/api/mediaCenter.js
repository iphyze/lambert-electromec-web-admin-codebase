import { apiClient, API_BASE_URL } from "./client";

function normalizePagination(pagination = {}) {
  return {
    page: Number(pagination.page || 1),
    limit: Number(pagination.limit || 20),
    total: Number(pagination.total || 0),
    total_pages: Number(pagination.total_pages || 0),
  };
}

export async function listAdminMediaItems(params = {}, options = {}) {
  const response = await apiClient.get("/admin/media-center", { params, signal: options.signal });
  return {
    items: response?.data?.data ?? [],
    pagination: normalizePagination(response?.data?.pagination),
  };
}

export async function getAdminMediaItem(id, options = {}) {
  const response = await apiClient.get("/admin/media-center/item", { params: { id }, signal: options.signal });
  return response?.data?.data ?? null;
}

export async function createAdminMediaItem(payload, document, coverImage, onUploadProgress) {
  const formData = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });
  if (document) formData.append("document", document);
  if (coverImage) formData.append("cover_image", coverImage);

  const response = await apiClient.post("/admin/media-center", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return response?.data?.data ?? null;
}

export async function updateAdminMediaItem(id, payload) {
  const response = await apiClient.patch("/admin/media-center/item", payload, { params: { id } });
  return response?.data?.data ?? null;
}

export async function replaceAdminMediaDocument(id, document, onUploadProgress) {
  const formData = new FormData();
  formData.append("id", String(id));
  formData.append("document", document);
  const response = await apiClient.post("/admin/media-center/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return response?.data?.data ?? null;
}

export async function replaceAdminMediaCoverImage(id, coverImage, onUploadProgress) {
  const formData = new FormData();
  formData.append("id", String(id));
  formData.append("cover_image", coverImage);
  const response = await apiClient.post("/admin/media-center/cover", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return response?.data?.data ?? null;
}

export async function removeAdminMediaCoverImage(id) {
  const response = await apiClient.delete("/admin/media-center/cover", { params: { id } });
  return response?.data?.data ?? null;
}

export async function archiveAdminMediaItem(id) {
  const response = await apiClient.delete("/admin/media-center/item", { params: { id } });
  return response?.data?.data ?? null;
}

export async function deleteAdminMediaItem(id) {
  const response = await apiClient.delete("/admin/media-center/item", { params: { id, hard: 1 } });
  return response?.data?.data ?? null;
}

export async function changeMediaItemStatus(id, action, publishedAt = undefined) {
  const payload = { id, action };
  if (publishedAt !== undefined) payload.published_at = publishedAt;
  const response = await apiClient.post("/admin/media-center/status", payload);
  return response?.data?.data ?? null;
}

export async function listAdminMediaCategories(options = {}) {
  const response = await apiClient.get("/admin/media-categories", { signal: options.signal });
  return response?.data?.data ?? [];
}

export async function createAdminMediaCategory(payload) {
  const response = await apiClient.post("/admin/media-categories", payload);
  return response?.data?.data ?? null;
}

export async function updateAdminMediaCategory(id, payload) {
  const response = await apiClient.patch("/admin/media-categories/item", payload, { params: { id } });
  return response?.data?.data ?? null;
}

export async function deactivateAdminMediaCategory(id) {
  const response = await apiClient.delete("/admin/media-categories/item", { params: { id } });
  return response?.data?.data ?? null;
}

export async function deleteAdminMediaCategory(id) {
  const response = await apiClient.delete("/admin/media-categories/item", { params: { id, hard: 1 } });
  return response?.data?.data ?? null;
}

export function mediaAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE_URL.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
  return `${base}/${String(url).replace(/^\/+/, "")}`;
}
