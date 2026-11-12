"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Eye,
  FileText,
  FolderTree,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Star,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import { getAdminProject, projectAssetUrl } from "@/lib/api/projects";
import { useAuthStore } from "@/stores/authStore";
import styles from "./page.module.css";

function formatDate(value, includeTime = false) {
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

function Value({ children }) {
  const value = children === null || children === undefined || children === "" ? "—" : children;
  return <div className={styles.value}>{value}</div>;
}

function ContentBlock({ title, children }) {
  return (
    <section className={styles.contentBlock}>
      <h3>{title}</h3>
      <Value>{children}</Value>
    </section>
  );
}

export default function ProjectViewClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const user = useAuthStore((state) => state.user);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !/^\d+$/.test(id)) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    getAdminProject(Number(id), { signal: controller.signal })
      .then(setProject)
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") {
          setError(apiErrorMessage(requestError, "Unable to load this project."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  if (!id || !/^\d+$/.test(id)) {
    return (
      <section className={styles.invalidState}>
        <span><AlertCircle size={21} /></span>
        <h1>Project not specified</h1>
        <p>Open a project from the Projects list to view its details.</p>
        <Link href="/projects/"><ArrowLeft size={14} /> Back to projects</Link>
      </section>
    );
  }

  if (loading) return <div className={styles.loading}>Loading project details…</div>;

  if (error || !project) {
    return (
      <section className={styles.invalidState}>
        <span><AlertCircle size={21} /></span>
        <h1>Unable to load project</h1>
        <p>{error || "This project could not be found."}</p>
        <Link href="/projects/"><ArrowLeft size={14} /> Back to projects</Link>
      </section>
    );
  }

  const canEdit = user?.role !== "editor" || project.status === "draft";
  const images = Array.isArray(project.images) ? project.images : [];
  const featuredImage = images.find((item) => item.is_featured) || images[0] || null;

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <Link className={styles.backLink} href="/projects/"><ArrowLeft size={14} /> Back to projects</Link>
          <span className={styles.kicker}>Project record</span>
          <h1>{project.title_en}</h1>
          <p>Read-only overview of the project record, bilingual content and gallery.</p>
        </div>
        {canEdit ? (
          <Link className={styles.editButton} href={`/projects/edit/?id=${project.id}`}>
            <Pencil size={15} /> Edit project
          </Link>
        ) : null}
      </section>

      <section className={styles.heroCard}>
        <div className={styles.heroImage}>
          {featuredImage?.url ? (
            <img src={projectAssetUrl(featuredImage.url)} alt={featuredImage.alt_text_en || project.title_en} />
          ) : (
            <span><ImageIcon size={30} /><small>No project image yet</small></span>
          )}
        </div>
        <div className={styles.heroContent}>
          <div className={styles.badges}>
            <span className={`${styles.statusBadge} ${styles[`status_${project.status}`] || ""}`}>{project.status}</span>
            {project.featured ? <span className={styles.featuredBadge}><Star size={11} fill="currentColor" /> Featured</span> : null}
          </div>
          <h2>{project.title_en}</h2>
          {project.title_fr ? <p className={styles.frenchTitle}>{project.title_fr}</p> : null}
          <div className={styles.metaGrid}>
            <div><FolderTree size={14} /><span>Division</span><strong>{project.division?.name_en || "—"}</strong></div>
            <div><Tag size={14} /><span>Slug</span><strong>/{project.slug}/</strong></div>
            <div><CalendarDays size={14} /><span>Project year</span><strong>{project.project_year || "—"}</strong></div>
            <div><Eye size={14} /><span>Display order</span><strong>{Number(project.display_order || 0)}</strong></div>
          </div>
        </div>
      </section>

      <section className={styles.auditStrip} aria-label="Project record dates">
        <div><span>Created</span><strong>{formatDate(project.created_at, true)}</strong></div>
        <div><span>Last updated</span><strong>{formatDate(project.updated_at, true)}</strong></div>
        <div><span>Published</span><strong>{formatDate(project.published_at, true)}</strong></div>
        <div><span>Gallery</span><strong>{images.length} image{images.length === 1 ? "" : "s"}</strong></div>
      </section>

      <div className={styles.languageGrid}>
        <section className={styles.languagePanel}>
          <div className={styles.sectionHead}><span>EN</span><div><h2>English content</h2><p>Public English project wording.</p></div></div>
          <div className={styles.fieldGrid}>
            <ContentBlock title="Location"><span className={styles.inlineValue}><MapPin size={13} />{project.location_en || "—"}</span></ContentBlock>
            <ContentBlock title="Work done">{project.work_done_en}</ContentBlock>
          </div>
          <ContentBlock title="Summary">{project.summary_en}</ContentBlock>
          <ContentBlock title="Description">{project.description_en}</ContentBlock>
        </section>

        <section className={styles.languagePanel}>
          <div className={styles.sectionHead}><span>FR</span><div><h2>French content</h2><p>Public French project wording.</p></div></div>
          <div className={styles.fieldGrid}>
            <ContentBlock title="Location"><span className={styles.inlineValue}><MapPin size={13} />{project.location_fr || "—"}</span></ContentBlock>
            <ContentBlock title="Work done">{project.work_done_fr}</ContentBlock>
          </div>
          <ContentBlock title="Summary">{project.summary_fr}</ContentBlock>
          <ContentBlock title="Description">{project.description_fr}</ContentBlock>
        </section>
      </div>

      <section className={styles.seoPanel}>
        <div className={styles.sectionHead}><span><FileText size={15} /></span><div><h2>Search metadata</h2><p>Optional project-specific SEO fields.</p></div></div>
        <div className={styles.seoGrid}>
          <ContentBlock title="English SEO title">{project.seo_title_en}</ContentBlock>
          <ContentBlock title="French SEO title">{project.seo_title_fr}</ContentBlock>
          <ContentBlock title="English SEO description">{project.seo_description_en}</ContentBlock>
          <ContentBlock title="French SEO description">{project.seo_description_fr}</ContentBlock>
        </div>
      </section>

      <section className={styles.galleryPanel}>
        <div className={styles.galleryHead}>
          <div><span className={styles.kicker}>Project media</span><h2>Gallery</h2><p>Stored project images in their current display order.</p></div>
          <span className={styles.galleryCount}>{images.length} total</span>
        </div>
        {images.length ? (
          <div className={styles.galleryGrid}>
            {images.map((image) => (
              <article className={styles.galleryCard} key={image.id}>
                <div className={styles.galleryImage}>
                  <img src={projectAssetUrl(image.url)} alt={image.alt_text_en || project.title_en} />
                  {image.is_featured ? <span><Star size={10} fill="currentColor" /> Featured</span> : null}
                </div>
                <div className={styles.galleryMeta}>
                  <strong>{image.original_filename || `Image ${image.id}`}</strong>
                  <small>{image.caption_en || image.alt_text_en || "No English caption"}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyGallery}><ImageIcon size={25} /><strong>No images added yet</strong><span>Images can be added from the project editor.</span></div>
        )}
      </section>
    </div>
  );
}
