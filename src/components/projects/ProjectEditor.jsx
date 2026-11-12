"use client";

import {
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  Eye,
  LoaderCircle,
  Plus,
  Save,
  Send,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppDatePicker from "@/components/form/AppDatePicker";
import AppSelect from "@/components/form/AppSelect";
import DivisionModal from "@/components/divisions/DivisionModal";
import ProjectGalleryManager from "./ProjectGalleryManager";
import HomepageProjectImage from "./HomepageProjectImage";
import { apiErrorMessage } from "@/lib/api/client";
import { listAdminDivisions } from "@/lib/api/divisions";
import {
  changeProjectStatus,
  createAdminProject,
  getAdminProject,
  updateAdminProject,
} from "@/lib/api/projects";
import { useAuthStore } from "@/stores/authStore";
import styles from "./ProjectEditor.module.css";

const EMPTY = {
  division_id: "",
  slug: "",
  title_en: "",
  title_fr: "",
  summary_en: "",
  summary_fr: "",
  description_en: "",
  description_fr: "",
  location_en: "",
  location_fr: "",
  work_done_en: "",
  work_done_fr: "",
  project_year: "",
  seo_title_en: "",
  seo_title_fr: "",
  seo_description_en: "",
  seo_description_fr: "",
  featured: false,
  display_order: 0,
};

function projectToForm(project) {
  if (!project) return { ...EMPTY };
  return {
    division_id: String(project.division?.id || ""),
    slug: project.slug || "",
    title_en: project.title_en || "",
    title_fr: project.title_fr || "",
    summary_en: project.summary_en || "",
    summary_fr: project.summary_fr || "",
    description_en: project.description_en || "",
    description_fr: project.description_fr || "",
    location_en: project.location_en || "",
    location_fr: project.location_fr || "",
    work_done_en: project.work_done_en || "",
    work_done_fr: project.work_done_fr || "",
    project_year: project.project_year || "",
    seo_title_en: project.seo_title_en || "",
    seo_title_fr: project.seo_title_fr || "",
    seo_description_en: project.seo_description_en || "",
    seo_description_fr: project.seo_description_fr || "",
    featured: Boolean(project.featured),
    display_order: Number(project.display_order || 0),
  };
}

function backendDateTime(value) {
  if (!value) return undefined;
  return String(value).replace("T", " ").slice(0, 19);
}

function Field({ name, label, hint, error, children, required = false }) {
  const descriptionId = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <label
      className={`${styles.field} ${error ? styles.fieldInvalid : ""}`.trim()}
      data-field={name}
    >
      <span className={styles.fieldLabel}>
        {label}
        {required ? <b> *</b> : null}
      </span>
      {children}
      {error ? (
        <small className={styles.fieldError} id={descriptionId} role="alert">
          {error}
        </small>
      ) : hint ? (
        <small className={styles.fieldHint} id={descriptionId}>{hint}</small>
      ) : (
        <span className={styles.fieldSpacer} aria-hidden="true" />
      )}
    </label>
  );
}

function firstInvalidField(errors) {
  return Object.keys(errors)[0] || null;
}

function focusInvalidField(fieldName) {
  if (!fieldName || typeof document === "undefined") return;
  const container = document.querySelector(`[data-field="${fieldName}"]`);
  if (!container) return;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  container.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  window.setTimeout(() => {
    const target = container.querySelector('input:not([type="hidden"]), textarea, [role="combobox"], button');
    target?.focus?.({ preventScroll: true });
  }, reducedMotion ? 0 : 260);
}

function slugPreview(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

function inferServerField(message = "") {
  const normalized = String(message).toLowerCase();
  if (normalized.includes("division")) return "division_id";
  if (normalized.includes("english title") || normalized.includes("project title")) return "title_en";
  if (normalized.includes("slug")) return "slug";
  return null;
}

export default function ProjectEditor({ projectId = null }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || "editor";
  const [project, setProject] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [images, setImages] = useState([]);
  const [homepageImage, setHomepageImage] = useState(null);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [publishAt, setPublishAt] = useState("");
  const [quickDivisionOpen, setQuickDivisionOpen] = useState(false);

  const isNew = !projectId && !project?.id;
  const isAdministrator = ["admin", "super_admin"].includes(userRole);
  const readOnly = userRole === "editor" && project?.status && project.status !== "draft";

  const activeDivisions = useMemo(
    () => divisions.filter((item) => item.status === "active" || Number(item.id) === Number(project?.division?.id)),
    [divisions, project],
  );

  const divisionOptions = useMemo(
    () => activeDivisions.map((item) => ({
      value: String(item.id),
      label: `${item.name_en}${item.status === "inactive" ? " (Inactive)" : ""}`,
    })),
    [activeDivisions],
  );

  useEffect(() => {
    const controller = new AbortController();
    listAdminDivisions({ signal: controller.signal })
      .then((items) => setDivisions(Array.isArray(items) ? items : []))
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") {
          setError(apiErrorMessage(requestError, "Unable to load divisions."));
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setForm({ ...EMPTY });
      setImages([]);
      setHomepageImage(null);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    getAdminProject(projectId, { signal: controller.signal })
      .then((data) => {
        setProject(data);
        setForm(projectToForm(data));
        setImages(data?.images || []);
        setHomepageImage(data?.homepage_image || null);
      })
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") {
          setError(apiErrorMessage(requestError, "Unable to load this project."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [projectId]);

  useEffect(() => {
    if (!form.division_id && activeDivisions.length && !projectId) {
      setForm((current) => ({ ...current, division_id: String(activeDivisions[0].id) }));
    }
  }, [activeDivisions, form.division_id, projectId]);

  const clearFieldError = useCallback((key) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearFieldError(key);
    if (error) setError("");
  };

  const handleQuickDivisionSaved = (division) => {
    if (!division?.id) return;
    setDivisions((current) => {
      const exists = current.some((item) => Number(item.id) === Number(division.id));
      return exists
        ? current.map((item) => (Number(item.id) === Number(division.id) ? { ...item, ...division } : item))
        : [...current, division].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
    });
    setValue("division_id", String(division.id));
  };

  const validate = () => {
    const next = {};
    if (!form.division_id) next.division_id = "Please select a division.";
    if (!form.title_en.trim()) next.title_en = "English project title is required.";
    setFieldErrors(next);
    const first = firstInvalidField(next);
    if (first) window.requestAnimationFrame(() => focusInvalidField(first));
    return Object.keys(next).length === 0;
  };

  const payload = () => ({
    division_id: Number(form.division_id),
    slug: form.slug.trim(),
    title_en: form.title_en,
    title_fr: form.title_fr,
    summary_en: form.summary_en,
    summary_fr: form.summary_fr,
    description_en: form.description_en,
    description_fr: form.description_fr,
    location_en: form.location_en,
    location_fr: form.location_fr,
    work_done_en: form.work_done_en,
    work_done_fr: form.work_done_fr,
    project_year: form.project_year,
    seo_title_en: form.seo_title_en,
    seo_title_fr: form.seo_title_fr,
    seo_description_en: form.seo_description_en,
    seo_description_fr: form.seo_description_fr,
    featured: Boolean(form.featured),
    display_order: Number(form.display_order || 0),
  });

  const save = async () => {
    if (saving || readOnly || !validate()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const wasNew = !project?.id;
      const next = project?.id
        ? await updateAdminProject(project.id, payload())
        : await createAdminProject(payload());
      setProject(next);
      setForm(projectToForm(next));
      setImages(next?.images || images);
      setHomepageImage(next?.homepage_image ?? homepageImage);
      setSuccess(wasNew ? "Project created as a draft. You can now add gallery images." : "Project changes saved.");
      if (wasNew && next?.id) {
        router.replace(`/projects/edit/?id=${encodeURIComponent(next.id)}`);
      }
    } catch (requestError) {
      const message = apiErrorMessage(requestError, "Unable to save the project.");
      const field = inferServerField(message);
      if (field) {
        const nextErrors = { [field]: message };
        setFieldErrors((current) => ({ ...current, ...nextErrors }));
        window.requestAnimationFrame(() => focusInvalidField(field));
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const statusAction = async (action) => {
    if (!project?.id || statusBusy || !isAdministrator) return;
    setStatusBusy(true);
    setError("");
    setSuccess("");
    try {
      const next = await changeProjectStatus(
        project.id,
        action,
        action === "publish" ? backendDateTime(publishAt) : undefined,
      );
      setProject(next);
      setForm(projectToForm(next));
      setImages(next?.images || images);
      setHomepageImage(next?.homepage_image ?? homepageImage);
      setSuccess(
        action === "publish"
          ? (publishAt ? "Project publication scheduled." : "Project published successfully.")
          : action === "unpublish"
            ? "Project moved back to draft."
            : "Project restored as a draft.",
      );
    } catch (requestError) {
      const issues = requestError?.response?.data?.errors;
      setError(
        Array.isArray(issues) && issues.length
          ? issues.join(" ")
          : apiErrorMessage(requestError, "Unable to update project status."),
      );
    } finally {
      setStatusBusy(false);
    }
  };

  const updateGallery = (next) => {
    setImages(next);
    setProject((current) => current ? {
      ...current,
      images: next,
      image_count: next.length,
      featured_image: next.find((item) => item.is_featured) || null,
    } : current);
  };

  const divisionErrorId = fieldErrors.division_id ? "division_id-error" : undefined;
  const titleEnErrorId = fieldErrors.title_en ? "title_en-error" : undefined;

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <LoaderCircle size={22} className={styles.spin} />
        <span>Loading project…</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div className={styles.headingGroup}>
          <Link className={styles.backLink} href="/projects/">
            <ArrowLeft size={15} /> Projects
          </Link>
          <span className={styles.kicker}>{isNew ? "New portfolio record" : `Project #${project?.id || projectId}`}</span>
          <div className={styles.titleRow}>
            <h1>{isNew ? "Create project" : project?.title_en || "Edit project"}</h1>
            {project?.status ? (
              <span className={`${styles.status} ${styles[`status_${project.status}`] || ""}`}>{project.status}</span>
            ) : null}
          </div>
          <p>Manage English/French project content, presentation, gallery and publication status.</p>
        </div>
        {!readOnly ? (
          <button className={styles.saveTop} type="button" onClick={save} disabled={saving || statusBusy}>
            {saving ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}
            {saving ? "Saving…" : project?.id ? "Save changes" : "Create draft"}
          </button>
        ) : null}
      </section>

      {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
      {success ? <div className={styles.successBanner} role="status"><CheckCircle2 size={15} />{success}</div> : null}
      {readOnly ? (
        <div className={styles.noticeBanner}>
          <Eye size={15} />
          <span>This published/archived project is read-only for Editors. An Admin must move it back to draft before you can edit it.</span>
        </div>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div><h2>Project settings</h2><p>Division, URL and portfolio ordering.</p></div>
        </div>
        <div className={styles.settingsGrid}>
          <Field name="division_id" label="Division" required error={fieldErrors.division_id}>
            <div className={styles.divisionPickerRow}>
              <AppSelect
                value={form.division_id}
                onChange={(value) => setValue("division_id", value)}
                options={divisionOptions}
                disabled={readOnly}
                ariaLabel="Project division"
                invalid={Boolean(fieldErrors.division_id)}
                ariaDescribedBy={divisionErrorId}
              />
              {isAdministrator && !readOnly ? (
                <button
                  className={styles.quickAddDivision}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setQuickDivisionOpen(true);
                  }}
                  aria-label="Create a new division"
                  title="Create a new division"
                >
                  <Plus size={17} />
                </button>
              ) : null}
            </div>
          </Field>
          <Field
            name="slug"
            label="Slug"
            hint={isNew ? "Generated automatically from the English title when the project is created." : "Generated automatically and kept stable for the project URL."}
            error={fieldErrors.slug}
          >
            <input
              value={form.slug || slugPreview(form.title_en)}
              disabled
              placeholder="Generated from English title"
              aria-invalid={Boolean(fieldErrors.slug)}
              aria-describedby={fieldErrors.slug ? "slug-error" : "slug-hint"}
            />
          </Field>
          <Field name="project_year" label="Project year" error={fieldErrors.project_year}>
            <input
              value={form.project_year}
              onChange={(event) => setValue("project_year", event.target.value)}
              disabled={readOnly}
              placeholder="2026"
              aria-invalid={Boolean(fieldErrors.project_year)}
            />
          </Field>
          <Field name="display_order" label="Display order" hint="For homepage featured projects, lower numbers appear first." error={fieldErrors.display_order}>
            <input
              type="number"
              value={form.display_order}
              onChange={(event) => setValue("display_order", event.target.value)}
              disabled={readOnly}
              aria-invalid={Boolean(fieldErrors.display_order)}
            />
          </Field>
        </div>

        <label className={`${styles.featureCard} ${form.featured ? styles.featureCardActive : ""}`.trim()}>
          <input
            className={styles.featureInput}
            type="checkbox"
            checked={form.featured}
            onChange={(event) => setValue("featured", event.target.checked)}
            disabled={readOnly}
          />
          <span className={styles.featureIcon}><Star size={17} fill={form.featured ? "currentColor" : "none"} /></span>
          <span className={styles.featureCopy}>
            <strong>Feature on homepage</strong>
            <small>Show this project in the homepage Featured Projects slider. Maximum 10 projects.</small>
          </span>
          <span className={styles.featureSwitch} aria-hidden="true"><span /></span>
        </label>

        {(form.featured || homepageImage) && project?.id ? (
          <HomepageProjectImage
            project={project}
            image={homepageImage}
            readOnly={readOnly}
            onChange={(nextImage) => {
              setHomepageImage(nextImage);
              setProject((current) => current ? { ...current, homepage_image: nextImage } : current);
            }}
          />
        ) : null}
        {form.featured && !project?.id ? (
          <div className={styles.homeImageCreateHint}>
            Save the project draft first, then you can choose a separate homepage slider image.
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>English content</h2><p>Public English project wording.</p></div></div>
        <div className={styles.twoCol}>
          <Field name="title_en" label="Title" required error={fieldErrors.title_en}>
            <input
              value={form.title_en}
              onChange={(event) => setValue("title_en", event.target.value)}
              disabled={readOnly}
              aria-invalid={Boolean(fieldErrors.title_en)}
              aria-describedby={titleEnErrorId}
            />
          </Field>
          <Field name="location_en" label="Location" error={fieldErrors.location_en}>
            <input value={form.location_en} onChange={(event) => setValue("location_en", event.target.value)} disabled={readOnly} />
          </Field>
        </div>
        <Field name="summary_en" label="Summary" error={fieldErrors.summary_en}>
          <textarea rows={3} value={form.summary_en} onChange={(event) => setValue("summary_en", event.target.value)} disabled={readOnly} />
        </Field>
        <Field name="description_en" label="Description" error={fieldErrors.description_en}>
          <textarea rows={6} value={form.description_en} onChange={(event) => setValue("description_en", event.target.value)} disabled={readOnly} />
        </Field>
        <Field name="work_done_en" label="Work Done" error={fieldErrors.work_done_en}>
          <textarea rows={3} value={form.work_done_en} onChange={(event) => setValue("work_done_en", event.target.value)} disabled={readOnly} />
        </Field>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>French content</h2><p>Public French project wording.</p></div></div>
        <div className={styles.twoCol}>
          <Field name="title_fr" label="Title" error={fieldErrors.title_fr}>
            <input value={form.title_fr} onChange={(event) => setValue("title_fr", event.target.value)} disabled={readOnly} />
          </Field>
          <Field name="location_fr" label="Location" error={fieldErrors.location_fr}>
            <input value={form.location_fr} onChange={(event) => setValue("location_fr", event.target.value)} disabled={readOnly} />
          </Field>
        </div>
        <Field name="summary_fr" label="Summary" error={fieldErrors.summary_fr}>
          <textarea rows={3} value={form.summary_fr} onChange={(event) => setValue("summary_fr", event.target.value)} disabled={readOnly} />
        </Field>
        <Field name="description_fr" label="Description" error={fieldErrors.description_fr}>
          <textarea rows={6} value={form.description_fr} onChange={(event) => setValue("description_fr", event.target.value)} disabled={readOnly} />
        </Field>
        <Field name="work_done_fr" label="Work Done" error={fieldErrors.work_done_fr}>
          <textarea rows={3} value={form.work_done_fr} onChange={(event) => setValue("work_done_fr", event.target.value)} disabled={readOnly} />
        </Field>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>Search presentation</h2><p>Optional project-specific SEO titles and descriptions.</p></div></div>
        <div className={styles.twoCol}>
          <Field name="seo_title_en" label="English SEO title" error={fieldErrors.seo_title_en}>
            <input value={form.seo_title_en} onChange={(event) => setValue("seo_title_en", event.target.value)} disabled={readOnly} />
          </Field>
          <Field name="seo_title_fr" label="French SEO title" error={fieldErrors.seo_title_fr}>
            <input value={form.seo_title_fr} onChange={(event) => setValue("seo_title_fr", event.target.value)} disabled={readOnly} />
          </Field>
          <Field name="seo_description_en" label="English SEO description" error={fieldErrors.seo_description_en}>
            <textarea rows={3} value={form.seo_description_en} onChange={(event) => setValue("seo_description_en", event.target.value)} disabled={readOnly} />
          </Field>
          <Field name="seo_description_fr" label="French SEO description" error={fieldErrors.seo_description_fr}>
            <textarea rows={3} value={form.seo_description_fr} onChange={(event) => setValue("seo_description_fr", event.target.value)} disabled={readOnly} />
          </Field>
        </div>
      </section>

      {project?.id ? (
        <ProjectGalleryManager project={project} images={images} onChange={updateGallery} readOnly={readOnly} />
      ) : (
        <div className={styles.galleryNotice}>
          <ArchiveRestore size={17} />
          <span>Save the project draft first, then the gallery uploader will become available.</span>
        </div>
      )}

      {project?.id && isAdministrator ? (
        <section className={styles.publishBox}>
          <div>
            <h2>Publication</h2>
            <p>Publishing makes this project available through the public Lambert API immediately; no frontend rebuild is required.</p>
          </div>
          {project.status === "draft" ? (
            <div className={styles.publishControls}>
              <AppDatePicker
                className={styles.publishDate}
                value={publishAt}
                onChange={setPublishAt}
                mode="datetime"
                placeholder="Optional publication date and time"
                ariaLabel="Optional publication date and time"
              />
              <button type="button" onClick={() => statusAction("publish")} disabled={statusBusy}>
                {statusBusy ? <LoaderCircle size={14} className={styles.spin} /> : <Send size={14} />}
                {publishAt ? "Schedule publication" : "Publish now"}
              </button>
            </div>
          ) : null}
          {project.status === "published" ? (
            <button type="button" className={styles.secondaryAction} onClick={() => statusAction("unpublish")} disabled={statusBusy}>
              Move back to draft
            </button>
          ) : null}
          {project.status === "archived" ? (
            <button type="button" className={styles.secondaryAction} onClick={() => statusAction("restore")} disabled={statusBusy}>
              <ArchiveRestore size={14} /> Restore as draft
            </button>
          ) : null}
        </section>
      ) : null}

      <div className={styles.bottomBar}>
        <Link className={styles.cancelButton} href="/projects/">Back to projects</Link>
        {!readOnly ? (
          <button className={styles.saveButton} type="button" onClick={save} disabled={saving || statusBusy}>
            {saving ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}
            {saving ? "Saving…" : project?.id ? "Save changes" : "Create draft"}
          </button>
        ) : null}
      </div>

      <DivisionModal
        open={quickDivisionOpen}
        quick
        onClose={() => setQuickDivisionOpen(false)}
        onSaved={handleQuickDivisionSaved}
      />
    </div>
  );
}
