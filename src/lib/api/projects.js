import { apiClient, API_BASE_URL } from "./client";

function normalizePagination(pagination = {}) {
  return {
    page: Number(pagination.page || 1),
    limit: Number(pagination.limit || 20),
    total: Number(pagination.total || 0),
    total_pages: Number(pagination.total_pages || 0),
  };
}

export async function listAdminProjects(params = {}, options = {}) {
  const response = await apiClient.get("/admin/projects", { params, signal: options.signal });
  return {
    items: response?.data?.data ?? [],
    pagination: normalizePagination(response?.data?.pagination),
  };
}

export async function getAdminProject(id, options = {}) {
  const response = await apiClient.get("/admin/projects/item", { params: { id }, signal: options.signal });
  return response?.data?.data ?? null;
}

export async function createAdminProject(payload) {
  const response = await apiClient.post("/admin/projects", payload);
  return response?.data?.data ?? null;
}

export async function updateAdminProject(id, payload) {
  const response = await apiClient.patch("/admin/projects/item", payload, { params: { id } });
  return response?.data?.data ?? null;
}

export async function archiveAdminProject(id) {
  const response = await apiClient.delete("/admin/projects/item", { params: { id } });
  return response?.data?.data ?? null;
}

export async function deleteAdminProject(id) {
  const response = await apiClient.delete("/admin/projects/item", { params: { id, hard: 1 } });
  return response?.data?.data ?? null;
}

export async function changeProjectStatus(id, action, publishedAt = undefined) {
  const payload = { id, action };
  if (publishedAt !== undefined) payload.published_at = publishedAt;
  const response = await apiClient.post("/admin/projects/status", payload);
  return response?.data?.data ?? null;
}

export async function uploadProjectImages(projectId, files, onUploadProgress) {
  const formData = new FormData();
  formData.append("project_id", String(projectId));
  files.forEach((file) => formData.append("files[]", file));
  const response = await apiClient.post("/admin/projects/images/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return response?.data?.data ?? [];
}

export async function uploadProjectHomepageImage(projectId, file, onUploadProgress) {
  const formData = new FormData();
  formData.append("project_id", String(projectId));
  formData.append("file", file);
  const response = await apiClient.post("/admin/projects/home-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });
  return response?.data?.data ?? null;
}

export async function deleteProjectHomepageImage(projectId) {
  const response = await apiClient.delete("/admin/projects/home-image", { params: { project_id: projectId } });
  return response?.data?.data ?? null;
}

export async function updateProjectImage(id, payload) {
  const response = await apiClient.patch("/admin/projects/images/item", payload, { params: { id } });
  return response?.data?.data ?? [];
}

export async function deleteProjectImage(id) {
  const response = await apiClient.delete("/admin/projects/images/item", { params: { id } });
  return response?.data?.data ?? [];
}

export async function reorderProjectImages(projectId, imageIds) {
  const response = await apiClient.post("/admin/projects/images/reorder", {
    project_id: projectId,
    image_ids: imageIds,
  });
  return response?.data?.data ?? [];
}

export function projectAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE_URL.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
  return `${base}/${String(url).replace(/^\/+/, "")}`;
}
