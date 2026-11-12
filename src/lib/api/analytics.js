import { apiClient } from "./client";

// Website statistics (cookie-free, collected by the Lambert API).
export async function getAnalyticsSummary({ from, to, compare = true } = {}, options = {}) {
  const response = await apiClient.get("/admin/analytics/summary", {
    params: { from, to, compare: compare ? 1 : 0 },
    signal: options.signal,
  });
  return response?.data?.data ?? null;
}

// Downloads a CSV report (pages, sources, events or daily) for the period.
export async function downloadAnalyticsExport({ from, to, report = "daily" }) {
  const response = await apiClient.get("/admin/analytics/export", {
    params: { from, to, report },
    responseType: "blob",
  });
  const disposition = String(response?.headers?.["content-disposition"] || "");
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || `lambert-website-${report}-${from}-to-${to}.csv`;
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
