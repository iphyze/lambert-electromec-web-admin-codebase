import { apiClient, API_BASE_URL } from './client'

const normalizePagination = (pagination = {}) => ({
  page: Number(pagination.page || 1),
  limit: Number(pagination.limit || 12),
  total: Number(pagination.total || 0),
  total_pages: Number(pagination.total_pages || 0),
})

export async function listAdminFacilityProjects(params = {}, options = {}) {
  const response = await apiClient.get('/admin/facility-projects', { params, signal: options.signal })
  return { items: response?.data?.data ?? [], pagination: normalizePagination(response?.data?.pagination) }
}

export async function getAdminFacilityProject(id, options = {}) {
  const response = await apiClient.get('/admin/facility-projects/item', { params: { id }, signal: options.signal })
  return response?.data?.data ?? null
}

export async function createAdminFacilityProject(payload, image, onUploadProgress) {
  const formData = new FormData()
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    formData.append(key, String(value))
  })
  if (image) formData.append('image', image)
  const response = await apiClient.post('/admin/facility-projects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
  return response?.data?.data ?? null
}

export async function updateAdminFacilityProject(id, payload) {
  const response = await apiClient.patch('/admin/facility-projects/item', payload, { params: { id } })
  return response?.data?.data ?? null
}

export async function replaceFacilityProjectImage(id, image, onUploadProgress) {
  const formData = new FormData()
  formData.append('id', String(id))
  formData.append('image', image)
  const response = await apiClient.post('/admin/facility-projects/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
  return response?.data?.data ?? null
}

export async function removeFacilityProjectImage(id) {
  const response = await apiClient.delete('/admin/facility-projects/image', { params: { id } })
  return response?.data?.data ?? null
}

export async function changeFacilityProjectStatus(id, action, publishedAt = undefined) {
  const payload = { id, action }
  if (publishedAt !== undefined) payload.published_at = publishedAt
  const response = await apiClient.post('/admin/facility-projects/status', payload)
  return response?.data?.data ?? null
}

export async function archiveAdminFacilityProject(id) {
  const response = await apiClient.delete('/admin/facility-projects/item', { params: { id } })
  return response?.data?.data ?? null
}

export async function deleteAdminFacilityProject(id) {
  const response = await apiClient.delete('/admin/facility-projects/item', { params: { id, hard: 1 } })
  return response?.data?.data ?? null
}

export function facilityProjectAssetUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const base = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '')
  return `${base}/${String(url).replace(/^\/+/, '')}`
}
