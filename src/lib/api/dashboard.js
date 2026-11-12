import { apiClient } from "@/lib/api/client";
export async function getDashboardSummary(options = {}) {
  const response = await apiClient.get("/admin/dashboard", { signal: options.signal });
  return response?.data?.data ?? {};
}
