"use client";

import { CheckCircle2, KeyRound, LoaderCircle, Save, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AppSelect from "@/components/form/AppSelect";
import { apiErrorMessage } from "@/lib/api/client";
import {
  createAdministrator,
  resetAdministratorPassword,
  updateAdministrator,
} from "@/lib/api/administrators";
import styles from "./AdministratorModal.module.css";

const ROLE_OPTIONS = [
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Disabled" },
];

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  role: "editor",
  status: "active",
  password: "",
  confirm_password: "",
};

function fromAdministrator(item) {
  if (!item) return { ...EMPTY };
  return {
    first_name: item.first_name || "",
    last_name: item.last_name || "",
    email: item.email || "",
    role: item.role || "editor",
    status: item.status || "active",
    password: "",
    confirm_password: "",
  };
}

export default function AdministratorModal({ open, administrator = null, currentUserId, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef(null);
  const editing = Boolean(administrator?.id);
  const selfEditing = editing && Number(administrator?.id) === Number(currentUserId);

  useEffect(() => {
    if (!open) return;
    setForm(fromAdministrator(administrator));
    setError("");
  }, [open, administrator]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const keydown = (event) => {
      if (event.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", keydown);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", keydown);
      previous?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (busy) return;
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setError("First name, last name and email are required.");
      return;
    }
    if (!editing) {
      if (form.password.length < 12) {
        setError("Password must contain at least 12 characters.");
        return;
      }
      if (form.password !== form.confirm_password) {
        setError("Password confirmation does not match.");
        return;
      }
    }

    setBusy(true);
    setError("");
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        status: form.status,
      };
      if (!editing) payload.password = form.password;

      const next = editing
        ? await updateAdministrator(administrator.id, payload)
        : await createAdministrator(payload);
      onSaved?.(next);
      onClose?.();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to save the administrator."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose?.();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="administrator-modal-title">
        <header>
          <div>
            <span>{editing ? "Account configuration" : "Secure account setup"}</span>
            <h2 id="administrator-modal-title">{editing ? "Edit administrator" : "Create administrator"}</h2>
            <p>Manage Lambert CMS identity, permissions and account availability.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className={styles.body}>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}

          <div className={styles.twoCol}>
            <label>
              <span>First name *</span>
              <input value={form.first_name} onChange={(event) => setValue("first_name", event.target.value)} autoComplete="off" />
            </label>
            <label>
              <span>Last name *</span>
              <input value={form.last_name} onChange={(event) => setValue("last_name", event.target.value)} autoComplete="off" />
            </label>
          </div>

          <label>
            <span>Email address *</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setValue("email", event.target.value)}
              disabled={selfEditing}
              autoComplete="off"
            />
            {selfEditing ? <small>Your own email is locked here to protect the current authenticated session.</small> : null}
          </label>

          <div className={styles.twoCol}>
            <label>
              <span>Role</span>
              <AppSelect
                value={form.role}
                onChange={(value) => setValue("role", value)}
                options={ROLE_OPTIONS}
                ariaLabel="Administrator role"
                isSearchable={false}
                disabled={selfEditing}
              />
            </label>
            <label>
              <span>Status</span>
              <AppSelect
                value={form.status}
                onChange={(value) => setValue("status", value)}
                options={STATUS_OPTIONS}
                ariaLabel="Administrator status"
                isSearchable={false}
                disabled={selfEditing}
              />
            </label>
          </div>

          {!editing ? (
            <div className={styles.twoCol}>
              <label>
                <span>Initial password *</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setValue("password", event.target.value)}
                  autoComplete="new-password"
                />
                <small>Minimum 12 characters.</small>
              </label>
              <label>
                <span>Confirm password *</span>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={(event) => setValue("confirm_password", event.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>
          ) : null}

          <div className={styles.note}>
            <ShieldCheck size={16} />
            <div>
              <strong>Super Admin safeguards</strong>
              <span>Role, status or email changes revoke the affected administrator’s existing sessions. The final active Super Admin cannot be removed.</span>
            </div>
          </div>
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" onClick={save} disabled={busy}>
            {busy ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}
            {busy ? "Saving…" : editing ? "Save changes" : "Create administrator"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function AdministratorPasswordModal({ open, administrator = null, onClose, onReset }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }, [open, administrator]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const keydown = (event) => {
      if (event.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", keydown);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", keydown);
      previous?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!open || !administrator) return null;

  const reset = async () => {
    if (busy) return;
    if (password.length < 12) {
      setError("New password must contain at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const message = await resetAdministratorPassword(administrator.id, password);
      setSuccess(message);
      onReset?.();
      window.setTimeout(() => onClose?.(), 550);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to reset the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose?.();
    }}>
      <section className={`${styles.modal} ${styles.securityModal}`} role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
        <header>
          <div>
            <span>Account security</span>
            <h2 id="password-modal-title">Reset password</h2>
            <p>Set a new password for {administrator.first_name} {administrator.last_name}.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </header>
        <div className={styles.body}>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          {success ? <div className={styles.success} role="status"><CheckCircle2 size={14} /> {success}</div> : null}
          <label>
            <span>New password *</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            <small>Minimum 12 characters. Existing sessions are revoked after reset.</small>
          </label>
          <label>
            <span>Confirm new password *</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
          </label>
          <div className={styles.note}>
            <KeyRound size={16} />
            <div><strong>Security action</strong><span>The administrator will need to sign in again using the new password.</span></div>
          </div>
        </div>
        <footer>
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" onClick={reset} disabled={busy}>
            {busy ? <LoaderCircle className={styles.spin} size={15} /> : <KeyRound size={15} />}
            {busy ? "Resetting…" : "Reset password"}
          </button>
        </footer>
      </section>
    </div>
  );
}
