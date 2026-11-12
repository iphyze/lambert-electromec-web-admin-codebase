"use client";

import Link from "next/link";
import AppSelect from "@/components/form/AppSelect";
import {
  BrainCircuit,
  ChartLine,
  CheckCircle2,
  Gauge,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import { getSystemSettings, sendTestEmail, updateSystemSettings } from "@/lib/api/settings";
import { useAuthStore } from "@/stores/authStore";
import styles from "./page.module.css";

const GROUP_ICONS = {
  ai_general: BrainCircuit,
  ai_guardrails: Gauge,
  website_assistant: SlidersHorizontal,
  enquiry_intelligence: Mail,
  project_search: Search,
  contact_protection: ShieldCheck,
  email_delivery: Send,
  website_analytics: ChartLine,
};

// Settings that decide how email is sent; a test email must use saved values.
const EMAIL_DELIVERY_KEYS = ["MAIL_TRANSPORT", "MAIL_FALLBACK_TO_SMTP"];

function valueMap(groups = []) {
  const values = {};
  groups.forEach((group) => {
    (group.items || []).forEach((item) => { values[item.key] = item.value; });
  });
  return values;
}

function SettingControl({ item, value, onChange }) {
  if (item.type === "boolean") {
    const checked = value === true || value === "true" || value === 1 || value === "1";
    return (
      <button
        type="button"
        className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span />
        <strong>{checked ? "Enabled" : "Disabled"}</strong>
      </button>
    );
  }

  if (item.type === "select") {
    return (
      <AppSelect
        className={styles.selectField}
        value={String(value ?? "")}
        onChange={onChange}
        options={(item.options || []).map((option) => ({ value: String(option), label: String(item.option_labels?.[option] ?? option) }))}
        ariaLabel={item.label}
        isSearchable={false}
      />
    );
  }

  return (
    <div className={styles.inputWrap}>
      <input
        className={styles.input}
        type={item.type === "integer" ? "number" : "text"}
        min={item.min ?? undefined}
        max={item.max ?? undefined}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {item.suffix ? <span>{item.suffix}</span> : null}
    </div>
  );
}

export default function SystemSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "super_admin";
  const [payload, setPayload] = useState({ groups: [], environment: [], note: "" });
  const [draft, setDraft] = useState({});
  const [changedKeys, setChangedKeys] = useState(() => new Set());
  const [resetKeys, setResetKeys] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  const applyPayload = useCallback((data) => {
    const next = data || { groups: [], environment: [], note: "" };
    setPayload(next);
    setDraft(valueMap(next.groups));
    setChangedKeys(new Set());
    setResetKeys(new Set());
  }, []);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      applyPayload(await getSystemSettings());
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load system settings."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyPayload, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const dirtyCount = changedKeys.size + resetKeys.size;

  const changeValue = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setChangedKeys((current) => new Set([...current, key]));
    setResetKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    setSuccess("");
  };

  const resetToEnv = (item) => {
    setDraft((current) => ({ ...current, [item.key]: item.env_value }));
    setResetKeys((current) => new Set([...current, item.key]));
    setChangedKeys((current) => {
      const next = new Set(current);
      next.delete(item.key);
      return next;
    });
    setSuccess("");
  };

  const save = async () => {
    if (!dirtyCount || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const settings = {};
      changedKeys.forEach((key) => { settings[key] = draft[key]; });
      const data = await updateSystemSettings(settings, [...resetKeys]);
      applyPayload(data);
      setSuccess("System settings updated successfully.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to update system settings."));
    } finally {
      setSaving(false);
    }
  };

  const emailSettingsDirty = EMAIL_DELIVERY_KEYS.some((key) => changedKeys.has(key) || resetKeys.has(key));

  const runTestEmail = async () => {
    if (testingEmail || emailSettingsDirty) return;
    setTestingEmail(true);
    setError("");
    setSuccess("");
    try {
      const result = await sendTestEmail();
      setSuccess(result.message);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "The test email could not be sent."));
    } finally {
      setTestingEmail(false);
    }
  };

  if (user && !isSuperAdmin) {
    return (
      <section className={styles.accessDenied}>
        <span><ShieldCheck size={22} /></span>
        <h1>Super Admin access required</h1>
        <p>Runtime system settings affect AI usage, cost controls and public-form protection.</p>
        <Link href="/dashboard/">Back to dashboard</Link>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <span className={styles.kicker}>Administration</span>
          <h1>System Settings</h1>
          <p>Manage approved runtime settings without exposing server secrets. Admin overrides take effect immediately and can be reset to the underlying .env value.</p>
        </div>
        <div className={styles.headActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => load({ refresh: true })} disabled={refreshing || saving}>
            <RefreshCw size={15} className={refreshing ? styles.spinning : ""} /> Refresh
          </button>
          <button className={styles.primaryButton} type="button" onClick={save} disabled={!dirtyCount || saving}>
            <Save size={15} /> {saving ? "Saving…" : dirtyCount ? `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}` : "Saved"}
          </button>
        </div>
      </section>

      <section className={styles.securityNote}>
        <span><LockKeyhole size={18} /></span>
        <div>
          <strong>Secrets stay server-side</strong>
          <p>OpenAI API keys, database credentials, JWT/application secrets, Microsoft 365 (Graph) client secrets, SMTP passwords and Turnstile secrets cannot be viewed or edited here.</p>
        </div>
      </section>

      {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
      {success ? <div className={styles.successBanner} role="status"><CheckCircle2 size={15} /> {success}</div> : null}

      {loading ? (
        <section className={styles.loadingPanel}><RefreshCw size={18} className={styles.spinning} /><span>Loading system settings…</span></section>
      ) : (
        <div className={styles.contentGrid}>
          <main className={styles.settingsColumn}>
            {payload.groups.map((group) => {
              const Icon = GROUP_ICONS[group.key] || SlidersHorizontal;
              return (
                <section className={styles.panel} key={group.key}>
                  <div className={styles.panelHead}>
                    <span><Icon size={17} /></span>
                    <div><h2>{group.label}</h2><p>{group.items.length} configurable setting{group.items.length === 1 ? "" : "s"}</p></div>
                  </div>
                  <div className={styles.settingList}>
                    {group.items.map((item) => {
                      const pendingReset = resetKeys.has(item.key);
                      const pendingChange = changedKeys.has(item.key);
                      const source = pendingReset ? ".env after save" : pendingChange ? "Pending override" : item.source === "admin_override" ? "Admin override" : ".env";
                      return (
                        <div className={styles.settingRow} key={item.key}>
                          <div className={styles.settingCopy}>
                            <div className={styles.settingTitleRow}>
                              <strong>{item.label}</strong>
                              <span className={`${styles.sourceBadge} ${item.source === "admin_override" && !pendingReset ? styles.overrideBadge : ""}`}>{source}</span>
                            </div>
                            <p>{item.description}</p>
                            <code>{item.key}</code>
                          </div>
                          <div className={styles.settingActions}>
                            <SettingControl item={item} value={draft[item.key]} onChange={(value) => changeValue(item.key, value)} />
                            <button
                              className={styles.resetButton}
                              type="button"
                              onClick={() => resetToEnv(item)}
                              disabled={item.source !== "admin_override" && !pendingChange}
                              title="Reset this setting to its .env value"
                            >
                              <RotateCcw size={13} /> .env
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {group.key === "email_delivery" ? (
                    <div className={styles.panelFoot}>
                      <div className={styles.settingCopy}>
                        <strong>Send a test email</strong>
                        <p>
                          {emailSettingsDirty
                            ? "Save your email delivery changes first. The test always uses the saved provider."
                            : `Sends a short test message to ${user?.email || "your administrator email"} through the saved provider.`}
                        </p>
                      </div>
                      <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={runTestEmail}
                        disabled={testingEmail || emailSettingsDirty || saving}
                      >
                        {testingEmail ? <RefreshCw size={15} className={styles.spinning} /> : <Send size={15} />}
                        {testingEmail ? "Sending…" : "Send test email"}
                      </button>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </main>

          <aside className={styles.environmentPanel}>
            <div className={styles.environmentHead}>
              <span><KeyRound size={17} /></span>
              <div><h2>Protected environment</h2><p>Read-only server configuration</p></div>
            </div>
            <div className={styles.environmentList}>
              {payload.environment.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong className={item.status === "danger" ? styles.envDanger : item.status === "warning" ? styles.envWarning : ""}>
                    {item.value || "Not configured"}
                  </strong>
                </div>
              ))}
            </div>
            <p className={styles.environmentFoot}>Changes to protected values must be made directly in the server <code>.env</code> file by an authorised technical administrator.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
