"use client";

import { CheckCircle2, LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import { updateAdminContactRouting } from "@/lib/api/contacts";
import styles from "./EmailRoutingModal.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitEmails(value) {
  return String(value || "")
    .split(/[,;\n]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmails(value) {
  return Array.from(new Set(splitEmails(value)));
}

function validateEmailList(value, fieldName) {
  const emails = normalizeEmails(value);
  if (emails.length > 20) return { emails, error: `${fieldName} can contain at most 20 addresses.` };
  const invalid = emails.find((email) => email.length > 254 || !EMAIL_PATTERN.test(email));
  if (invalid) return { emails, error: `Enter a valid email address for ${fieldName.toLowerCase()}.` };
  return { emails, error: "" };
}

export default function EmailRoutingModal({ open, route = null, onClose, onSaved }) {
  const [recipients, setRecipients] = useState("");
  const [cc, setCc] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setRecipients((route?.recipient_emails || []).join("\n"));
    setCc((route?.cc_emails || []).join("\n"));
    setErrors({});
    setError("");
  }, [open, route]);

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

  if (!open || !route) return null;

  const save = async () => {
    if (busy) return;

    const recipientCheck = validateEmailList(recipients, "Recipient emails");
    const ccCheck = validateEmailList(cc, "CC emails");
    const nextErrors = {};
    if (recipientCheck.error) nextErrors.recipients = recipientCheck.error;
    if (ccCheck.error) nextErrors.cc = ccCheck.error;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const recipientSet = new Set(recipientCheck.emails);
    const normalizedCc = ccCheck.emails.filter((email) => !recipientSet.has(email));

    setBusy(true);
    setError("");
    try {
      const updated = await updateAdminContactRouting(route.subject_key, {
        recipient_emails: recipientCheck.emails,
        cc_emails: normalizedCc,
      });
      onSaved?.(updated);
      onClose?.();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to update this email route."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose?.();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="email-routing-title">
        <header>
          <div>
            <span>Server-side routing</span>
            <h2 id="email-routing-title">Edit email routing</h2>
            <p>Update who receives enquiries submitted under this public contact subject.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </header>

        <div className={styles.body}>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}

          <div className={styles.subjectCard}>
            <div>
              <strong>{route.label_en || route.subject_key}</strong>
              <span>{route.label_fr || "—"}</span>
            </div>
            <code>{route.subject_key}</code>
          </div>

          <label className={errors.recipients ? styles.invalidField : ""}>
            <span>Primary recipient emails</span>
            <textarea
              value={recipients}
              onChange={(event) => {
                setRecipients(event.target.value);
                if (errors.recipients) setErrors((current) => ({ ...current, recipients: "" }));
              }}
              placeholder="procurement@lambertelectromec.com, info@lambertelectromec.com"
              aria-invalid={Boolean(errors.recipients)}
            />
            {errors.recipients ? <small className={styles.fieldError}>{errors.recipients}</small> : <small>Separate addresses with commas, semicolons or new lines. Maximum 20 addresses.</small>}
          </label>

          <label className={errors.cc ? styles.invalidField : ""}>
            <span>CC emails</span>
            <textarea
              value={cc}
              onChange={(event) => {
                setCc(event.target.value);
                if (errors.cc) setErrors((current) => ({ ...current, cc: "" }));
              }}
              placeholder="Optional CC recipients"
              aria-invalid={Boolean(errors.cc)}
            />
            {errors.cc ? <small className={styles.fieldError}>{errors.cc}</small> : <small>Optional. Addresses already listed as primary recipients are stored only once.</small>}
          </label>

          <div className={styles.note}>
            <CheckCircle2 size={15} />
            <div>
              <strong>Destination addresses stay on the server</strong>
              <span>The public website submits only the subject key. Leaving primary recipients empty keeps submissions in the database, but email delivery will be treated as not configured.</span>
            </div>
          </div>
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" onClick={save} disabled={busy}>
            {busy ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}
            {busy ? "Saving…" : "Save routing"}
          </button>
        </footer>
      </section>
    </div>
  );
}
