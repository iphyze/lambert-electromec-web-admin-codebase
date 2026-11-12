import { apiClient } from "./client";

export async function getSystemSettings(options = {}) {
  const response = await apiClient.get("/admin/settings", { signal: options.signal });
  return response?.data?.data ?? { groups: [], environment: [] };
}

export async function updateSystemSettings(settings = {}, resetKeys = []) {
  const response = await apiClient.patch("/admin/settings", {
    settings,
    reset_keys: resetKeys,
  });
  return response?.data?.data ?? { groups: [], environment: [] };
}

// Sends a short test email through the email provider currently saved in
// System Settings (Microsoft 365 Graph or SMTP). Leave recipient empty to send
// it to the signed-in administrator.
export async function sendTestEmail(recipient = "") {
  const response = await apiClient.post("/admin/settings/test-email", { recipient });
  return {
    message: response?.data?.message ?? "Test email sent.",
    data: response?.data?.data ?? {},
  };
}
