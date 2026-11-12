"use client";

import { ArchiveRestore, CheckCircle2, Eye, LoaderCircle, Save, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AppSelect from "@/components/form/AppSelect";
import AppDatePicker from "@/components/form/AppDatePicker";
import ProjectGalleryManager from "./ProjectGalleryManager";
import { apiErrorMessage } from "@/lib/api/client";
import { changeProjectStatus, createAdminProject, getAdminProject, updateAdminProject } from "@/lib/api/projects";
import styles from "./ProjectEditorModal.module.css";

const EMPTY = {
  division_id: "", slug: "", title_en: "", title_fr: "", summary_en: "", summary_fr: "",
  description_en: "", description_fr: "", location_en: "", location_fr: "", work_done_en: "", work_done_fr: "",
  project_year: "", seo_title_en: "", seo_title_fr: "", seo_description_en: "", seo_description_fr: "",
  featured: false, display_order: 0,
};

function projectToForm(project) {
  if (!project) return { ...EMPTY };
  return {
    division_id: String(project.division?.id || ""), slug: project.slug || "", title_en: project.title_en || "", title_fr: project.title_fr || "",
    summary_en: project.summary_en || "", summary_fr: project.summary_fr || "", description_en: project.description_en || "", description_fr: project.description_fr || "",
    location_en: project.location_en || "", location_fr: project.location_fr || "", work_done_en: project.work_done_en || "", work_done_fr: project.work_done_fr || "",
    project_year: project.project_year || "", seo_title_en: project.seo_title_en || "", seo_title_fr: project.seo_title_fr || "",
    seo_description_en: project.seo_description_en || "", seo_description_fr: project.seo_description_fr || "", featured: Boolean(project.featured),
    display_order: Number(project.display_order || 0),
  };
}

function backendDateTime(value) {
  if (!value) return undefined;
  return String(value).replace("T", " ").slice(0, 19);
}

function Field({ label, hint, children, required = false }) {
  return <label className={styles.field}><span>{label}{required ? <b> *</b> : null}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

export default function ProjectEditorModal({ open, projectId = null, divisions = [], userRole = "editor", onClose, onSaved }) {
  const [project, setProject] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const closeRef = useRef(null);
  const isNew = !projectId && !project?.id;
  const isAdministrator = ["admin", "super_admin"].includes(userRole);
  const readOnly = userRole === "editor" && project?.status && project.status !== "draft";
  const slugLocked = project?.status === "published";
  const activeDivisions = useMemo(() => divisions.filter((item) => item.status === "active" || Number(item.id) === Number(project?.division?.id)), [divisions, project]);
  const divisionOptions = useMemo(() => activeDivisions.map((item) => ({ value: String(item.id), label: `${item.name_en}${item.status === "inactive" ? " (Inactive)" : ""}` })), [activeDivisions]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    const keydown = (event) => { if (event.key === "Escape" && !saving && !statusBusy) onClose?.(); };
    document.addEventListener("keydown", keydown);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => { window.clearTimeout(timer); document.removeEventListener("keydown", keydown); document.body.style.overflow = ""; previous?.focus?.(); };
  }, [open, onClose, saving, statusBusy]);

  useEffect(() => {
    if (open && !projectId && !project?.id && !form.division_id && activeDivisions.length) {
      setForm((current) => ({ ...current, division_id: String(activeDivisions[0].id) }));
    }
  }, [open, projectId, project?.id, form.division_id, activeDivisions]);

  useEffect(() => {
    if (!open) return;
    setError(""); setSuccess(""); setPublishAt("");
    if (!projectId) { setProject(null); setForm({ ...EMPTY, division_id: String(activeDivisions[0]?.id || "") }); setImages([]); return; }
    const controller = new AbortController();
    setLoading(true);
    getAdminProject(projectId, { signal: controller.signal })
      .then((data) => { setProject(data); setForm(projectToForm(data)); setImages(data?.images || []); })
      .catch((requestError) => { if (requestError?.code !== "ERR_CANCELED") setError(apiErrorMessage(requestError, "Unable to load this project.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, projectId]);

  if (!open) return null;
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const payload = () => ({
    division_id: Number(form.division_id), slug: form.slug.trim(), title_en: form.title_en, title_fr: form.title_fr,
    summary_en: form.summary_en, summary_fr: form.summary_fr, description_en: form.description_en, description_fr: form.description_fr,
    location_en: form.location_en, location_fr: form.location_fr, work_done_en: form.work_done_en, work_done_fr: form.work_done_fr,
    project_year: form.project_year, seo_title_en: form.seo_title_en, seo_title_fr: form.seo_title_fr,
    seo_description_en: form.seo_description_en, seo_description_fr: form.seo_description_fr,
    featured: Boolean(form.featured), display_order: Number(form.display_order || 0),
  });
  const save = async () => {
    if (saving || readOnly) return;
    if (!form.division_id || !form.title_en.trim()) { setError("Select a division and enter the English project title."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const next = project?.id ? await updateAdminProject(project.id, payload()) : await createAdminProject(payload());
      setProject(next); setForm(projectToForm(next)); setImages(next?.images || images); setSuccess(project?.id ? "Project changes saved." : "Project created as a draft. You can now add gallery images.");
      onSaved?.(next);
    } catch (requestError) { setError(apiErrorMessage(requestError, "Unable to save the project.")); }
    finally { setSaving(false); }
  };
  const statusAction = async (action) => {
    if (!project?.id || statusBusy || !isAdministrator) return;
    setStatusBusy(true); setError(""); setSuccess("");
    try {
      const next = await changeProjectStatus(project.id, action, action === "publish" ? backendDateTime(publishAt) : undefined);
      setProject(next); setForm(projectToForm(next)); setImages(next?.images || images);
      setSuccess(action === "publish" ? (publishAt ? "Project publication scheduled." : "Project published successfully.") : action === "unpublish" ? "Project moved back to draft." : "Project restored as a draft.");
      onSaved?.(next);
    } catch (requestError) {
      const issues = requestError?.response?.data?.errors;
      setError(Array.isArray(issues) && issues.length ? issues.join(" ") : apiErrorMessage(requestError, "Unable to update project status."));
    } finally { setStatusBusy(false); }
  };
  const updateGallery = (next) => { setImages(next); setProject((current) => current ? { ...current, images: next, image_count: next.length, featured_image: next.find((item) => item.is_featured) || null } : current); onSaved?.({ ...(project || {}), images: next, image_count: next.length }); };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !statusBusy) onClose?.(); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="project-editor-title">
        <header className={styles.header}>
          <div><span className={styles.kicker}>{isNew ? "New portfolio record" : `Project #${projectId}`}</span><h2 id="project-editor-title">{isNew ? "Create project" : project?.title_en || "Edit project"}</h2><p>Manage English/French project content, presentation, gallery and publication status.</p></div>
          <div className={styles.headerRight}>{project?.status ? <span className={`${styles.status} ${styles[`status_${project.status}`] || ""}`}>{project.status}</span> : null}<button ref={closeRef} type="button" className={styles.close} onClick={onClose} disabled={saving || statusBusy} aria-label="Close"><X size={19} /></button></div>
        </header>
        {loading ? <div className={styles.loading}><LoaderCircle size={20} className={styles.spin} /><span>Loading project…</span></div> : (
          <div className={styles.body}>
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            {success ? <div className={styles.success} role="status"><CheckCircle2 size={14} />{success}</div> : null}
            {readOnly ? <div className={styles.notice}><Eye size={15} /><span>This published/archived project is read-only for Editors. An Admin must move it back to draft before you can edit it.</span></div> : null}

            <section className={styles.section}>
              <div className={styles.sectionHead}><div><h3>Project settings</h3><p>Division, URL and portfolio ordering.</p></div></div>
              <div className={styles.settingsGrid}>
                <Field label="Division" required><AppSelect value={form.division_id} onChange={(value) => setValue("division_id", value)} options={divisionOptions} disabled={readOnly} ariaLabel="Project division" /></Field>
                <Field label="Slug" hint={slugLocked ? "Unpublish before changing the URL slug." : "Leave blank when creating to generate it from the English title."}><input value={form.slug} onChange={(event) => setValue("slug", event.target.value)} disabled={readOnly || slugLocked} placeholder="project-url-slug" /></Field>
                <Field label="Project year"><input value={form.project_year} onChange={(event) => setValue("project_year", event.target.value)} disabled={readOnly} placeholder="2026" /></Field>
                <Field label="Display order"><input type="number" value={form.display_order} onChange={(event) => setValue("display_order", event.target.value)} disabled={readOnly} /></Field>
                <label className={styles.toggleField}><input type="checkbox" checked={form.featured} onChange={(event) => setValue("featured", event.target.checked)} disabled={readOnly} /><span><strong>Featured project</strong><small>Prioritise this project in public project listings.</small></span></label>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}><div><h3>English content</h3><p>Public English project wording.</p></div></div>
              <div className={styles.twoCol}>
                <Field label="Title" required><input value={form.title_en} onChange={(event) => setValue("title_en", event.target.value)} disabled={readOnly} /></Field>
                <Field label="Location"><input value={form.location_en} onChange={(event) => setValue("location_en", event.target.value)} disabled={readOnly} /></Field>
              </div>
              <Field label="Summary"><textarea rows={3} value={form.summary_en} onChange={(event) => setValue("summary_en", event.target.value)} disabled={readOnly} /></Field>
              <Field label="Description"><textarea rows={6} value={form.description_en} onChange={(event) => setValue("description_en", event.target.value)} disabled={readOnly} /></Field>
              <Field label="Work Done"><textarea rows={3} value={form.work_done_en} onChange={(event) => setValue("work_done_en", event.target.value)} disabled={readOnly} /></Field>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}><div><h3>French content</h3><p>Public French project wording.</p></div></div>
              <div className={styles.twoCol}>
                <Field label="Title"><input value={form.title_fr} onChange={(event) => setValue("title_fr", event.target.value)} disabled={readOnly} /></Field>
                <Field label="Location"><input value={form.location_fr} onChange={(event) => setValue("location_fr", event.target.value)} disabled={readOnly} /></Field>
              </div>
              <Field label="Summary"><textarea rows={3} value={form.summary_fr} onChange={(event) => setValue("summary_fr", event.target.value)} disabled={readOnly} /></Field>
              <Field label="Description"><textarea rows={6} value={form.description_fr} onChange={(event) => setValue("description_fr", event.target.value)} disabled={readOnly} /></Field>
              <Field label="Work Done"><textarea rows={3} value={form.work_done_fr} onChange={(event) => setValue("work_done_fr", event.target.value)} disabled={readOnly} /></Field>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}><div><h3>Search presentation</h3><p>Optional project-specific SEO titles and descriptions.</p></div></div>
              <div className={styles.twoCol}>
                <Field label="English SEO title"><input value={form.seo_title_en} onChange={(event) => setValue("seo_title_en", event.target.value)} disabled={readOnly} /></Field>
                <Field label="French SEO title"><input value={form.seo_title_fr} onChange={(event) => setValue("seo_title_fr", event.target.value)} disabled={readOnly} /></Field>
                <Field label="English SEO description"><textarea rows={3} value={form.seo_description_en} onChange={(event) => setValue("seo_description_en", event.target.value)} disabled={readOnly} /></Field>
                <Field label="French SEO description"><textarea rows={3} value={form.seo_description_fr} onChange={(event) => setValue("seo_description_fr", event.target.value)} disabled={readOnly} /></Field>
              </div>
            </section>

            {project?.id ? <ProjectGalleryManager project={project} images={images} onChange={updateGallery} readOnly={readOnly} /> : <div className={styles.galleryNotice}><ArchiveRestore size={17} /><span>Save the project draft first, then the gallery uploader will become available.</span></div>}

            {project?.id && isAdministrator ? (
              <section className={styles.publishBox}>
                <div><h3>Publication</h3><p>Publishing makes this project available through the public Lambert API immediately; no frontend rebuild is required.</p></div>
                {project.status === "draft" ? <div className={styles.publishControls}><AppDatePicker className={styles.publishDate} value={publishAt} onChange={setPublishAt} mode="datetime" placeholder="Optional publication date and time" ariaLabel="Optional publication date and time" /><button type="button" onClick={() => statusAction("publish")} disabled={statusBusy}>{statusBusy ? <LoaderCircle size={14} className={styles.spin} /> : <Send size={14} />}{publishAt ? "Schedule publication" : "Publish now"}</button></div> : null}
                {project.status === "published" ? <button type="button" className={styles.secondaryAction} onClick={() => statusAction("unpublish")} disabled={statusBusy}>Move back to draft</button> : null}
                {project.status === "archived" ? <button type="button" className={styles.secondaryAction} onClick={() => statusAction("restore")} disabled={statusBusy}><ArchiveRestore size={14} /> Restore as draft</button> : null}
              </section>
            ) : null}
          </div>
        )}
        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onClose} disabled={saving || statusBusy}>Close</button>
          {!loading && !readOnly ? <button type="button" className={styles.save} onClick={save} disabled={saving || statusBusy}>{saving ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}{saving ? "Saving…" : project?.id ? "Save changes" : "Create draft"}</button> : null}
        </footer>
      </section>
    </div>
  );
}
