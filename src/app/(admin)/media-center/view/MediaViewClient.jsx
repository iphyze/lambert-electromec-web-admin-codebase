"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  FileText,
  FolderTree,
  Hash,
  Pencil,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import { getAdminMediaItem, mediaAssetUrl } from "@/lib/api/mediaCenter";
import { useAuthStore } from "@/stores/authStore";
import styles from "./page.module.css";

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric", month: "short", year: "numeric",
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

function Value({ children }) {
  const value = children === null || children === undefined || children === "" ? "—" : children;
  return <div className={styles.value}>{value}</div>;
}

function ContentBlock({ title, children }) {
  return <section className={styles.contentBlock}><h3>{title}</h3><Value>{children}</Value></section>;
}

export default function MediaViewClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const user = useAuthStore((state) => state.user);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !/^\d+$/.test(id)) { setLoading(false); return undefined; }
    const controller = new AbortController();
    setLoading(true);
    getAdminMediaItem(Number(id), { signal: controller.signal })
      .then(setItem)
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") setError(apiErrorMessage(requestError, "Unable to load this Media Center item."));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  if (!id || !/^\d+$/.test(id)) {
    return <section className={styles.invalidState}><span><AlertCircle size={21} /></span><h1>Media Center item not specified</h1><p>Open a resource from the Media Center list to view its details.</p><Link href="/media-center/"><ArrowLeft size={14} /> Back to Media Center</Link></section>;
  }
  if (loading) return <div className={styles.loading}>Loading Media Center details…</div>;
  if (error || !item) {
    return <section className={styles.invalidState}><span><AlertCircle size={21} /></span><h1>Unable to load resource</h1><p>{error || "This Media Center item could not be found."}</p><Link href="/media-center/"><ArrowLeft size={14} /> Back to Media Center</Link></section>;
  }

  const canEdit = user?.role !== "editor" || item.status === "draft";
  const fileUrl = item.file?.url ? mediaAssetUrl(item.file.url) : "";

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div><Link className={styles.backLink} href="/media-center/"><ArrowLeft size={14} /> Back to Media Center</Link><span className={styles.kicker}>Media record</span><h1>{item.title_en}</h1><p>Read-only overview of the bilingual resource, publication data and uploaded document.</p></div>
        <div className={styles.headActions}>{fileUrl ? <a className={styles.fileButton} href={fileUrl} target="_blank" rel="noreferrer"><Eye size={15} /> Open document</a> : null}{canEdit ? <Link className={styles.editButton} href={`/media-center/edit/?id=${item.id}`}><Pencil size={15} /> Edit resource</Link> : null}</div>
      </section>

      <section className={styles.summaryGrid}>
        <article><span><FolderTree size={17} /></span><div><small>Category</small><strong>{item.category?.name_en || "—"}</strong></div></article>
        <article><span><Hash size={17} /></span><div><small>Reference</small><strong>{item.reference || "—"}</strong></div></article>
        <article><span><FileText size={17} /></span><div><small>Document</small><strong>{String(item.file?.extension || "file").toUpperCase()} · {formatBytes(item.file?.size_bytes)}</strong></div></article>
        <article><span><Star size={17} /></span><div><small>Featured</small><strong>{item.featured ? "Yes" : "No"}</strong></div></article>
      </section>

      <section className={styles.metaCard}>
        <div><span>Status</span><strong className={`${styles.status} ${styles[`status_${item.status}`] || ""}`}>{item.status}</strong></div>
        <div><span>Slug</span><Value>{item.slug}</Value></div>
        <div><span>Display order</span><Value>{item.display_order}</Value></div>
        <div><span>Published</span><Value>{formatDate(item.published_at, true)}</Value></div>
        <div><span>Created</span><Value>{formatDate(item.created_at, true)}</Value></div>
        <div><span>Updated</span><Value>{formatDate(item.updated_at, true)}</Value></div>
      </section>

      <div className={styles.languageGrid}>
        <section className={styles.languageCard}><header><span>EN</span><div><h2>English content</h2><p>Public English resource wording.</p></div></header><ContentBlock title="Title">{item.title_en}</ContentBlock><ContentBlock title="Description">{item.description_en}</ContentBlock></section>
        <section className={styles.languageCard}><header><span>FR</span><div><h2>French content</h2><p>Public French resource wording.</p></div></header><ContentBlock title="Title">{item.title_fr}</ContentBlock><ContentBlock title="Description">{item.description_fr}</ContentBlock></section>
      </div>

      <section className={styles.documentCard}>
        <div className={styles.documentIcon}><FileText size={26} /></div>
        <div className={styles.documentInfo}><span>Uploaded document</span><strong>{item.file?.name || "—"}</strong><small>{String(item.file?.mime_type || "")} · {formatBytes(item.file?.size_bytes)}</small></div>
        <div className={styles.documentActions}>{fileUrl ? <a href={fileUrl} target="_blank" rel="noreferrer"><Eye size={14} /> Open</a> : null}{fileUrl ? <a href={fileUrl} download><Download size={14} /> Download</a> : null}</div>
      </section>

      <section className={styles.timeline}><div><CalendarDays size={16} /><span>Record lifecycle</span></div><p>Created {formatDate(item.created_at, true)} · Last updated {formatDate(item.updated_at, true)}{item.published_at ? ` · Published ${formatDate(item.published_at, true)}` : ""}</p></section>
    </div>
  );
}
