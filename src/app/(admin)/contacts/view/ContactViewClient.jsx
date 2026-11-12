"use client";

import {
  AlertCircle,
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MailCheck,
  MailWarning,
  MessageSquareText,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EnquiryIntelligencePanel from "@/components/contacts/EnquiryIntelligencePanel";
import { apiErrorMessage } from "@/lib/api/client";
import {
  changeAdminContactStatus,
  deleteAdminContactMessage,
  downloadAdminContactCv,
  getAdminContactMessage,
  retryAdminContactEmail,
} from "@/lib/api/contacts";
import { useAuthStore } from "@/stores/authStore";
import styles from "./page.module.css";

const POSITION_LABELS = {
  "account-officer": "Account Officer",
  "admin-asst-front-desk": "Administrative Assistant / Front Desk",
  "quantity-surveyor": "Quantity Surveyor",
  "other-positions": "Other Positions",
};

const LOCATION_LABELS = {
  nigeria: "Nigeria",
  "cote-divoire": "Cote D' Ivoire",
  ghana: "Ghana",
  other: "Others",
};

function formatDate(value, includeTime = true) {
  if (!value) return "—";
  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(parsed);
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / (1024 ** index);
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function deliveryLabel(status) {
  return String(status || "pending").replaceAll("_", " ");
}

function Value({ children }) {
  const value = children === null || children === undefined || children === "" ? "—" : children;
  return <div className={styles.value}>{value}</div>;
}

function Detail({ label, children }) {
  return <div><span>{label}</span><Value>{children}</Value></div>;
}

export default function ContactViewClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const user = useAuthStore((state) => state.user);
  const isAdministrator = ["admin", "super_admin"].includes(user?.role);
  const isSuperAdmin = user?.role === "super_admin";
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState("");

  const validId = Boolean(id && /^\d+$/.test(id));

  const load = useCallback(async ({ signal } = {}) => {
    if (!validId || !isAdministrator) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setItem(await getAdminContactMessage(Number(id), { signal }));
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") return;
      setError(apiErrorMessage(requestError, "Unable to load this contact message."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id, isAdministrator, validId]);

  useEffect(() => {
    const controller = new AbortController();
    load({ signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const jobApplication = item?.subject?.key === "job-vacancy";
  const position = item?.position === "other-positions" ? item?.other_position : POSITION_LABELS[item?.position] || item?.position;
  const location = item?.location === "other" ? item?.other_location : LOCATION_LABELS[item?.location] || item?.location;
  const deliveryStatus = item?.email_delivery?.status || "pending";
  const deliveryHistory = item?.email_delivery?.history || [];
  const retryAvailable = ["failed", "not_configured"].includes(deliveryStatus);

  const handledBy = useMemo(() => {
    if (!item?.handled_by) return "—";
    const name = [item.handled_by.first_name, item.handled_by.last_name].filter(Boolean).join(" ");
    return name ? `${name} · ${item.handled_by.email}` : item.handled_by.email || "—";
  }, [item]);

  const runStatusAction = async (action) => {
    if (!item || actionBusy) return;
    setActionBusy(action);
    setError("");
    setNotice("");
    try {
      const updated = await changeAdminContactStatus(item.id, action);
      setItem((current) => ({ ...current, ...updated }));
      setNotice(action === "read" ? "Message marked as read." : action === "replied" ? "Message marked as replied." : action === "archive" ? "Message archived." : "Message restored.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to update the contact message status."));
    } finally {
      setActionBusy("");
    }
  };

  const retryDelivery = async () => {
    if (!item || actionBusy) return;
    setActionBusy("retry");
    setError("");
    setNotice("");
    try {
      const updated = await retryAdminContactEmail(item.id);
      setItem((current) => ({ ...current, ...updated }));
      setNotice(updated?.email_delivery?.status === "sent" ? "Email delivery completed successfully." : "Email delivery retry completed. Review the updated delivery status below.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to retry email delivery."));
    } finally {
      setActionBusy("");
    }
  };

  const downloadCv = async () => {
    if (!item?.cv?.id || actionBusy) return;
    setActionBusy("cv");
    setError("");
    try {
      await downloadAdminContactCv(item.cv.id, item.cv.original_filename || "cv");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to download the CV."));
    } finally {
      setActionBusy("");
    }
  };

  const deleteMessage = async () => {
    if (!item || actionBusy) return;
    setActionBusy("delete");
    setError("");
    try {
      await deleteAdminContactMessage(item.id);
      window.location.assign("/contacts/");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to permanently delete this contact message."));
      setActionBusy("");
      setConfirm(null);
    }
  };

  if (!isAdministrator) {
    return <section className={styles.invalidState}><span><MailWarning size={21} /></span><h1>Administrator access required</h1><p>Contact Messages is available to Lambert Admin and Super Admin accounts.</p><Link href="/dashboard/"><ArrowLeft size={14} /> Back to dashboard</Link></section>;
  }
  if (!validId) {
    return <section className={styles.invalidState}><span><AlertCircle size={21} /></span><h1>Contact message not specified</h1><p>Open a record from the Contact Messages list to view its details.</p><Link href="/contacts/"><ArrowLeft size={14} /> Back to Contact Messages</Link></section>;
  }
  if (loading) return <div className={styles.loading}>Loading contact message…</div>;
  if (error && !item) {
    return <section className={styles.invalidState}><span><AlertCircle size={21} /></span><h1>Unable to load message</h1><p>{error}</p><Link href="/contacts/"><ArrowLeft size={14} /> Back to Contact Messages</Link></section>;
  }
  if (!item) {
    return <section className={styles.invalidState}><span><AlertCircle size={21} /></span><h1>Message not found</h1><p>This contact message could not be found.</p><Link href="/contacts/"><ArrowLeft size={14} /> Back to Contact Messages</Link></section>;
  }

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <Link className={styles.backLink} href="/contacts/"><ArrowLeft size={14} /> Back to Contact Messages</Link>
          <span className={styles.kicker}>Contact record</span>
          <h1>{item.full_name}</h1>
          <p>{item.subject?.label_en || item.subject?.key || "Website enquiry"} · received {formatDate(item.created_at)}</p>
        </div>
        <div className={styles.headActions}>
          {item.status === "new" ? <button className={styles.secondaryButton} type="button" disabled={Boolean(actionBusy)} onClick={() => runStatusAction("read")}><MailCheck size={15} /> {actionBusy === "read" ? "Updating…" : "Mark read"}</button> : null}
          {item.status !== "replied" && item.status !== "archived" ? <button className={styles.primaryButton} type="button" disabled={Boolean(actionBusy)} onClick={() => runStatusAction("replied")}><CheckCircle2 size={15} /> {actionBusy === "replied" ? "Updating…" : "Mark replied"}</button> : null}
        </div>
      </section>

      {error ? <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => setError("")}>Dismiss</button></div> : null}
      {notice ? <div className={styles.noticeBanner} role="status"><CheckCircle2 size={15} /><span>{notice}</span></div> : null}

      <section className={styles.summaryGrid}>
        <article><span><Mail size={17} /></span><div><small>Subject</small><strong>{item.subject?.label_en || item.subject?.key || "—"}</strong></div></article>
        <article><span><MessageSquareText size={17} /></span><div><small>Status</small><strong className={`${styles.status} ${styles[`status_${item.status}`] || ""}`}>{item.status}</strong></div></article>
        <article><span><MailCheck size={17} /></span><div><small>Email delivery</small><strong className={`${styles.status} ${styles[`delivery_${deliveryStatus}`] || ""}`}>{deliveryLabel(deliveryStatus)}</strong></div></article>
        <article><span><Clock3 size={17} /></span><div><small>Received</small><strong>{formatDate(item.created_at)}</strong></div></article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.card}>
          <header><span><UserRound size={18} /></span><div><h2>Contact details</h2><p>Information submitted through the Lambert website.</p></div></header>
          <div className={styles.detailGrid}>
            <Detail label="Full name">{item.full_name}</Detail>
            <Detail label="Email"><a className={styles.inlineLink} href={`mailto:${item.email}`}><Mail size={12} /> {item.email}</a></Detail>
            <Detail label="Phone">{item.phone ? <a className={styles.inlineLink} href={`tel:${item.phone}`}><Phone size={12} /> {item.phone}</a> : "—"}</Detail>
            <Detail label="Language">{String(item.locale || "en").toUpperCase()}</Detail>
            <Detail label="Handled by">{handledBy}</Detail>
            <Detail label="Handled at">{formatDate(item.handled_at)}</Detail>
          </div>
        </section>

        <section className={styles.card}>
          <header><span><ShieldCheck size={18} /></span><div><h2>Submission verification</h2><p>Stored workflow and form-verification information.</p></div></header>
          <div className={styles.detailGrid}>
            <Detail label="Terms accepted">{item.terms_accepted ? "Yes" : "No"}</Detail>
            <Detail label="Terms accepted at">{formatDate(item.terms_accepted_at)}</Detail>
            <Detail label="Turnstile verified">{item.turnstile_verified ? "Yes" : "No"}</Detail>
            <Detail label="Last updated">{formatDate(item.updated_at)}</Detail>
          </div>
          {item.page_url ? <a className={styles.pageLink} href={item.page_url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open source page</a> : null}
        </section>
      </div>

      <section className={styles.messageCard}>
        <div className={styles.messageHead}><span><MessageSquareText size={18} /></span><div><h2>Message</h2><p>Original text submitted by the contact.</p></div></div>
        <div className={styles.messageBody}>{item.message || "—"}</div>
      </section>

      {jobApplication ? (
        <section className={styles.jobCard}>
          <div className={styles.messageHead}><span><BriefcaseBusiness size={18} /></span><div><h2>Job application</h2><p>Vacancy details and CV supplied with this enquiry.</p></div></div>
          <div className={styles.jobGrid}>
            <Detail label="Position">{position || "—"}</Detail>
            <Detail label="Preferred location">{location || "—"}</Detail>
          </div>
          {item.cv ? (
            <div className={styles.cvCard}>
              <span className={styles.cvIcon}><FileText size={23} /></span>
              <div><small>Attached CV</small><strong>{item.cv.original_filename}</strong><span>{item.cv.mime_type || "File"} · {formatBytes(item.cv.file_size)} · uploaded {formatDate(item.cv.created_at)}</span></div>
              <button type="button" disabled={Boolean(actionBusy)} onClick={downloadCv}><Download size={14} /> {actionBusy === "cv" ? "Downloading…" : "Download CV"}</button>
            </div>
          ) : <div className={styles.noCv}>No CV is attached to this application.</div>}
        </section>
      ) : null}

      <EnquiryIntelligencePanel submissionId={item.id} />

      <section className={styles.deliveryCard}>
        <div className={styles.deliveryHead}>
          <div className={styles.messageHead}><span><MailCheck size={18} /></span><div><h2>Email delivery</h2><p>Server-side forwarding status and delivery attempts.</p></div></div>
          {retryAvailable ? <button className={styles.retryButton} type="button" disabled={Boolean(actionBusy)} onClick={retryDelivery}><RefreshCw size={14} className={actionBusy === "retry" ? styles.spinning : ""} /> {actionBusy === "retry" ? "Retrying…" : "Retry delivery"}</button> : null}
        </div>
        <div className={styles.deliveryMeta}>
          <Detail label="Current status"><span className={`${styles.status} ${styles[`delivery_${deliveryStatus}`] || ""}`}>{deliveryLabel(deliveryStatus)}</span></Detail>
          <Detail label="Last attempt">{formatDate(item.email_delivery?.last_attempt_at)}</Detail>
          <Detail label="Sent at">{formatDate(item.email_delivery?.sent_at)}</Detail>
          <Detail label="Current error">{item.email_delivery?.error || "—"}</Detail>
        </div>
        <div className={styles.history}>
          <h3>Delivery history</h3>
          {deliveryHistory.length ? deliveryHistory.map((entry) => (
            <article key={entry.id}>
              <div className={styles.historyStatus}><span className={`${styles.status} ${styles[`delivery_${entry.status}`] || ""}`}>{deliveryLabel(entry.status)}</span><small>{formatDate(entry.attempted_at)}</small></div>
              <div><span>Recipients</span><strong>{entry.recipient_emails?.join(", ") || "—"}</strong></div>
              <div><span>CC</span><strong>{entry.cc_emails?.join(", ") || "—"}</strong></div>
              {entry.provider ? <div><span>Provider</span><strong>{entry.provider === "smtp" ? "SMTP" : "Microsoft 365"}</strong></div> : null}
              <div><span>Attempted by</span><strong>{entry.attempted_by ? ([entry.attempted_by.first_name, entry.attempted_by.last_name].filter(Boolean).join(" ") || entry.attempted_by.email) : "System"}</strong></div>
              {entry.error_message ? <p>{entry.error_message}</p> : null}
            </article>
          )) : <div className={styles.emptyHistory}>No email delivery attempts have been recorded.</div>}
        </div>
      </section>

      <section className={styles.workflowCard}>
        <div><h2>Workflow actions</h2><p>Update the message state without changing the original submission.</p></div>
        <div className={styles.workflowActions}>
          {item.status === "new" ? <button type="button" disabled={Boolean(actionBusy)} onClick={() => runStatusAction("read")}><MailCheck size={14} /> Mark read</button> : null}
          {item.status !== "replied" && item.status !== "archived" ? <button type="button" disabled={Boolean(actionBusy)} onClick={() => runStatusAction("replied")}><CheckCircle2 size={14} /> Mark replied</button> : null}
          {item.status !== "archived" ? <button className={styles.warningAction} type="button" disabled={Boolean(actionBusy)} onClick={() => runStatusAction("archive")}><Archive size={14} /> Archive</button> : <button type="button" disabled={Boolean(actionBusy)} onClick={() => runStatusAction("restore")}><RotateCcw size={14} /> Restore</button>}
          {isSuperAdmin && item.status === "archived" ? <button className={styles.dangerAction} type="button" disabled={Boolean(actionBusy)} onClick={() => setConfirm({ type: "delete" })}><Trash2 size={14} /> Delete permanently</button> : null}
        </div>
      </section>

      <ConfirmDialog open={Boolean(confirm)} title="Permanently delete message?" message={`The message from “${item.full_name}” and any attached CV will be permanently removed. This cannot be undone.`} confirmLabel="Delete permanently" tone="danger" busy={actionBusy === "delete"} onConfirm={deleteMessage} onClose={() => !actionBusy && setConfirm(null)} />
    </div>
  );
}
