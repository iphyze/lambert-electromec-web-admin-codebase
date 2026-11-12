"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppDatePicker from "@/components/form/AppDatePicker";
import AppSelect from "@/components/form/AppSelect";
import MediaCategoryModal from "@/components/media/MediaCategoryModal";
import { apiErrorMessage } from "@/lib/api/client";
import {
  changeMediaItemStatus,
  createAdminMediaItem,
  getAdminMediaItem,
  listAdminMediaCategories,
  mediaAssetUrl,
  removeAdminMediaCoverImage,
  replaceAdminMediaCoverImage,
  replaceAdminMediaDocument,
  updateAdminMediaItem,
} from "@/lib/api/mediaCenter";
import { useAuthStore } from "@/stores/authStore";
import styles from "./MediaEditor.module.css";

const EMPTY = {
  category_id: "",
  slug: "",
  reference: "",
  title_en: "",
  title_fr: "",
  description_en: "",
  description_fr: "",
  featured: false,
  display_order: 0,
};

const ACCEPTED_DOCUMENTS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";

function itemToForm(item) {
  if (!item) return { ...EMPTY };
  return {
    category_id: String(item.category?.id || ""),
    slug: item.slug || "",
    reference: item.reference || "",
    title_en: item.title_en || "",
    title_fr: item.title_fr || "",
    description_en: item.description_en || "",
    description_fr: item.description_fr || "",
    featured: Boolean(item.featured),
    display_order: Number(item.display_order || 0),
  };
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

function backendDateTime(value) {
  if (!value) return undefined;
  return String(value).replace("T", " ").slice(0, 19);
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / (1024 ** index);
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function Field({ name, label, hint, error, required = false, children }) {
  const descriptionId = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <label className={`${styles.field} ${error ? styles.fieldInvalid : ""}`.trim()} data-field={name}>
      <span className={styles.fieldLabel}>{label}{required ? <b> *</b> : null}</span>
      {children}
      {error ? <small className={styles.fieldError} id={descriptionId} role="alert">{error}</small> : hint ? <small className={styles.fieldHint} id={descriptionId}>{hint}</small> : <span className={styles.fieldSpacer} aria-hidden="true" />}
    </label>
  );
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

function readinessField(issues = []) {
  const result = {};
  issues.forEach((issue) => {
    const value = String(issue).toLowerCase();
    if (value.includes("french title")) result.title_fr = issue;
    else if (value.includes("english title")) result.title_en = issue;
    else if (value.includes("category")) result.category_id = issue;
    else if (value.includes("document")) result.document = issue;
  });
  return result;
}

export default function MediaEditor({ itemId = null }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || "editor";
  const isAdministrator = ["admin", "super_admin"].includes(userRole);
  const [item, setItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [documentFile, setDocumentFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [loading, setLoading] = useState(Boolean(itemId));
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const isNew = !itemId && !item?.id;
  const readOnly = userRole === "editor" && item?.status && item.status !== "draft";

  const activeCategories = useMemo(
    () => categories.filter((category) => category.status === "active" || Number(category.id) === Number(item?.category?.id)),
    [categories, item],
  );
  const categoryOptions = useMemo(
    () => activeCategories.map((category) => ({
      value: String(category.id),
      label: `${category.name_en}${category.status === "inactive" ? " (Inactive)" : ""}`,
    })),
    [activeCategories],
  );

  const loadCategories = useCallback(async (signal) => {
    try {
      setCategories(await listAdminMediaCategories({ signal }));
    } catch (requestError) {
      if (requestError?.code !== "ERR_CANCELED") setError(apiErrorMessage(requestError, "Unable to load Media Center categories."));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCategories(controller.signal);
    return () => controller.abort();
  }, [loadCategories]);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      setForm({ ...EMPTY });
      setDocumentFile(null);
      setCoverImageFile(null);
      setCoverImagePreview("");
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getAdminMediaItem(itemId, { signal: controller.signal })
      .then((data) => {
        setItem(data);
        setForm(itemToForm(data));
      })
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") setError(apiErrorMessage(requestError, "Unable to load this Media Center item."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [itemId]);

  useEffect(() => () => {
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
  }, [coverImagePreview]);

  useEffect(() => {
    if (!form.category_id && activeCategories.length && isNew) {
      setForm((current) => ({ ...current, category_id: String(activeCategories[0].id) }));
    }
  }, [activeCategories, form.category_id, isNew]);

  const clearFieldError = (key) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearFieldError(key);
    if (error) setError("");
  };

  const validate = () => {
    const next = {};
    if (!form.category_id) next.category_id = "Please select a Media Center category.";
    if (!form.title_en.trim()) next.title_en = "English title is required.";
    if (isNew && !documentFile) next.document = "Please select the document to upload.";
    setFieldErrors(next);
    const first = Object.keys(next)[0];
    if (first) window.requestAnimationFrame(() => focusInvalidField(first));
    return Object.keys(next).length === 0;
  };

  const metadataPayload = () => ({
    category_id: Number(form.category_id),
    slug: form.slug.trim(),
    reference: form.reference,
    title_en: form.title_en,
    title_fr: form.title_fr,
    description_en: form.description_en,
    description_fr: form.description_fr,
    featured: Boolean(form.featured),
    display_order: Number(form.display_order || 0),
  });

  const handleFile = (file) => {
    setDocumentFile(file || null);
    clearFieldError("document");
    setUploadProgress(0);
  };

  const handleCoverImage = (file) => {
    if (!file) {
      setCoverImageFile(null);
      setCoverImagePreview("");
      clearFieldError("cover_image");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFieldErrors((current) => ({ ...current, cover_image: "Use a JPG, PNG or WEBP square image." }));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth !== image.naturalHeight) {
        URL.revokeObjectURL(objectUrl);
        setFieldErrors((current) => ({
          ...current,
          cover_image: `The cover image must be perfectly square (1:1). Selected image is ${image.naturalWidth} × ${image.naturalHeight} px.`,
        }));
        if (coverInputRef.current) coverInputRef.current.value = "";
        return;
      }
      setCoverImageFile(file);
      setCoverImagePreview(objectUrl);
      clearFieldError("cover_image");
      setUploadProgress(0);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setFieldErrors((current) => ({ ...current, cover_image: "Unable to read the selected image." }));
    };
    image.src = objectUrl;
  };

  const removeCoverImage = async () => {
    if (!item?.id || saving || readOnly) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const next = await removeAdminMediaCoverImage(item.id);
      setItem(next);
      setCoverImageFile(null);
      setCoverImagePreview("");
      if (coverInputRef.current) coverInputRef.current.value = "";
      setSuccess("Media Center cover image removed.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to remove the Media Center cover image."));
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (saving || readOnly || !validate()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    setUploadProgress(0);
    try {
      const wasNew = !item?.id;
      let next;
      if (wasNew) {
        next = await createAdminMediaItem(metadataPayload(), documentFile, coverImageFile, (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        });
      } else {
        next = await updateAdminMediaItem(item.id, metadataPayload());
        if (documentFile) {
          next = await replaceAdminMediaDocument(item.id, documentFile, (event) => {
            if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
          });
        }
        if (coverImageFile) {
          next = await replaceAdminMediaCoverImage(item.id, coverImageFile, (event) => {
            if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
          });
        }
      }
      setItem(next);
      setForm(itemToForm(next));
      setDocumentFile(null);
      setCoverImageFile(null);
      setCoverImagePreview("");
      if (coverInputRef.current) coverInputRef.current.value = "";
      setUploadProgress(0);
      setSuccess(wasNew ? "Media Center item created as a draft." : "Media Center changes saved.");
      if (wasNew && next?.id) router.replace(`/media-center/edit/?id=${encodeURIComponent(next.id)}`);
    } catch (requestError) {
      const message = apiErrorMessage(requestError, "Unable to save the Media Center item.");
      const lower = message.toLowerCase();
      const serverErrors = {};
      if (lower.includes("category")) serverErrors.category_id = message;
      else if (lower.includes("english title")) serverErrors.title_en = message;
      else if (lower.includes("cover image") || lower.includes("square")) serverErrors.cover_image = message;
      else if (lower.includes("document") || lower.includes("upload")) serverErrors.document = message;
      if (Object.keys(serverErrors).length) {
        setFieldErrors((current) => ({ ...current, ...serverErrors }));
        window.requestAnimationFrame(() => focusInvalidField(Object.keys(serverErrors)[0]));
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const statusAction = async (action) => {
    if (!item?.id || statusBusy || !isAdministrator) return;
    setStatusBusy(true);
    setError("");
    setSuccess("");
    try {
      const next = await changeMediaItemStatus(
        item.id,
        action,
        action === "publish" ? backendDateTime(publishAt) : undefined,
      );
      setItem(next);
      setForm(itemToForm(next));
      setDocumentFile(null);
      setSuccess(
        action === "publish"
          ? (publishAt ? "Media Center publication scheduled." : "Media Center item published successfully.")
          : action === "unpublish"
            ? "Media Center item moved back to draft."
            : action === "restore"
              ? "Media Center item restored as a draft."
              : "Status updated successfully.",
      );
    } catch (requestError) {
      const issues = requestError?.response?.data?.errors;
      if (Array.isArray(issues) && issues.length) {
        const readinessErrors = readinessField(issues);
        if (Object.keys(readinessErrors).length) {
          setFieldErrors((current) => ({ ...current, ...readinessErrors }));
          window.requestAnimationFrame(() => focusInvalidField(Object.keys(readinessErrors)[0]));
        }
        setError(issues.join(" "));
      } else {
        setError(apiErrorMessage(requestError, "Unable to update Media Center status."));
      }
    } finally {
      setStatusBusy(false);
    }
  };

  const handleQuickCategorySaved = (category) => {
    if (!category?.id) return;
    setCategories((current) => {
      const exists = current.some((entry) => Number(entry.id) === Number(category.id));
      return exists ? current.map((entry) => Number(entry.id) === Number(category.id) ? { ...entry, ...category } : entry) : [...current, category];
    });
    setValue("category_id", String(category.id));
  };

  if (loading) {
    return <div className={styles.loadingPage}><LoaderCircle size={22} className={styles.spin} /><span>Loading Media Center item…</span></div>;
  }

  const currentFile = item?.file || null;
  const fileUrl = currentFile?.url ? mediaAssetUrl(currentFile.url) : "";
  const currentCover = item?.cover_image || null;
  const coverUrl = coverImagePreview || (currentCover?.url ? mediaAssetUrl(currentCover.url) : "");

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div className={styles.headingGroup}>
          <Link className={styles.backLink} href="/media-center/"><ArrowLeft size={15} /> Media Center</Link>
          <span className={styles.kicker}>{isNew ? "New media record" : `Media item #${item?.id || itemId}`}</span>
          <div className={styles.titleRow}>
            <h1>{isNew ? "Create Media Center item" : item?.title_en || "Edit Media Center item"}</h1>
            {item?.status ? <span className={`${styles.status} ${styles[`status_${item.status}`] || ""}`}>{item.status}</span> : null}
          </div>
          <p>Manage bilingual resource details, the public cover image, document files and publication status.</p>
        </div>
        {!readOnly ? (
          <button className={styles.saveTop} type="button" onClick={save} disabled={saving || statusBusy}>
            {saving ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}
            {saving ? "Saving…" : item?.id ? "Save changes" : "Create draft"}
          </button>
        ) : null}
      </section>

      {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
      {success ? <div className={styles.successBanner} role="status"><CheckCircle2 size={15} />{success}</div> : null}
      {readOnly ? <div className={styles.noticeBanner}><Eye size={15} /><span>This published/archived item is read-only for Editors. An Admin must move it back to draft before you can edit it.</span></div> : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>Resource settings</h2><p>Category, URL, reference and public ordering.</p></div></div>
        <div className={styles.settingsGrid}>
          <Field name="category_id" label="Category" required error={fieldErrors.category_id}>
            <div className={styles.categoryPickerRow}>
              <AppSelect
                value={form.category_id}
                onChange={(value) => setValue("category_id", value)}
                options={categoryOptions}
                disabled={readOnly}
                ariaLabel="Media Center category"
                invalid={Boolean(fieldErrors.category_id)}
                ariaDescribedBy={fieldErrors.category_id ? "category_id-error" : undefined}
              />
              {isAdministrator && !readOnly ? <button className={styles.quickAddCategory} type="button" onClick={() => setQuickCategoryOpen(true)} aria-label="Create a Media Center category" title="Create category"><Plus size={17} /></button> : null}
            </div>
          </Field>
          <Field name="slug" label="Slug" hint={isNew ? "Generated automatically from the English title when this item is created." : "System-managed URL slug."}>
            <input value={form.slug || slugPreview(form.title_en)} disabled placeholder="Generated from English title" />
          </Field>
          <Field name="reference" label="Reference">
            <input value={form.reference} onChange={(event) => setValue("reference", event.target.value)} disabled={readOnly} placeholder="Optional document reference" />
          </Field>
          <Field name="display_order" label="Display order">
            <input type="number" value={form.display_order} onChange={(event) => setValue("display_order", event.target.value)} disabled={readOnly} />
          </Field>
        </div>

        <button className={`${styles.featureToggle} ${form.featured ? styles.featureToggleOn : ""}`.trim()} type="button" onClick={() => !readOnly && setValue("featured", !form.featured)} disabled={readOnly} aria-pressed={form.featured}>
          <span className={styles.featureIcon}><Star size={17} /></span>
          <span className={styles.featureCopy}><strong>Featured resource</strong><small>Prioritise this document in public Media Center listings.</small></span>
          <span className={styles.switch} aria-hidden="true"><span /></span>
        </button>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>English content</h2><p>Public English resource wording.</p></div></div>
        <div className={styles.contentGrid}>
          <Field name="title_en" label="Title" required error={fieldErrors.title_en}>
            <input value={form.title_en} onChange={(event) => setValue("title_en", event.target.value)} disabled={readOnly} aria-invalid={Boolean(fieldErrors.title_en)} />
          </Field>
          <Field name="description_en" label="Description">
            <textarea value={form.description_en} onChange={(event) => setValue("description_en", event.target.value)} disabled={readOnly} rows={6} />
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>French content</h2><p>Public French resource wording.</p></div></div>
        <div className={styles.contentGrid}>
          <Field name="title_fr" label="Title" error={fieldErrors.title_fr}>
            <input value={form.title_fr} onChange={(event) => setValue("title_fr", event.target.value)} disabled={readOnly} aria-invalid={Boolean(fieldErrors.title_fr)} />
          </Field>
          <Field name="description_fr" label="Description">
            <textarea value={form.description_fr} onChange={(event) => setValue("description_fr", event.target.value)} disabled={readOnly} rows={6} />
          </Field>
        </div>
      </section>

      <section className={styles.section} data-field="cover_image">
        <div className={styles.sectionHead}>
          <div>
            <h2>Media cover image</h2>
            <p>Upload one perfectly square image for this Media Center card. Recommended size: 877 × 877 px (1:1). JPG, PNG or WEBP.</p>
          </div>
        </div>
        <div className={`${styles.coverCard} ${fieldErrors.cover_image ? styles.coverCardInvalid : ""}`.trim()}>
          <div className={styles.coverPreview}>
            {coverUrl ? (
              <img src={coverUrl} alt="Media Center cover preview" />
            ) : (
              <span><ImagePlus size={30} /><small>No cover image</small></span>
            )}
          </div>
          <div className={styles.coverCopy}>
            <strong>{coverImageFile?.name || currentCover?.name || "Choose a square cover image"}</strong>
            <span>Displayed only as the visual image for this Media Center resource. It does not replace the downloadable document.</span>
            {coverImageFile ? <small>{formatBytes(coverImageFile.size)} · square image selected</small> : currentCover ? <small>{currentCover.width} × {currentCover.height} px · {formatBytes(currentCover.size_bytes)}</small> : <small>Recommended: 877 × 877 px</small>}
          </div>
          {!readOnly ? (
            <div className={styles.coverActions}>
              <button type="button" onClick={() => coverInputRef.current?.click()}><Upload size={14} />{coverUrl ? "Replace image" : "Choose image"}</button>
              {coverImageFile ? <button className={styles.coverRemove} type="button" onClick={() => handleCoverImage(null)}><Trash2 size={14} /> Clear selection</button> : currentCover ? <button className={styles.coverRemove} type="button" onClick={removeCoverImage} disabled={saving}><Trash2 size={14} /> Remove</button> : null}
            </div>
          ) : null}
          <input ref={coverInputRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleCoverImage(event.target.files?.[0] || null)} disabled={readOnly} />
        </div>
        {fieldErrors.cover_image ? <small className={styles.documentError} role="alert">{fieldErrors.cover_image}</small> : null}
      </section>

      <section className={styles.section} data-field="document">
        <div className={styles.sectionHead}><div><h2>Document</h2><p>PDF, Word, Excel, PowerPoint, CSV or TXT. Maximum configured size: 25 MB.</p></div></div>
        <div className={`${styles.documentCard} ${fieldErrors.document ? styles.documentCardInvalid : ""}`.trim()}>
          <div className={styles.documentIcon}><FileText size={25} /></div>
          <div className={styles.documentCopy}>
            {documentFile ? (
              <><strong>{documentFile.name}</strong><span>{formatBytes(documentFile.size)} · selected {item?.id ? "as replacement" : "for upload"}</span></>
            ) : currentFile ? (
              <><strong>{currentFile.name}</strong><span>{String(currentFile.extension || "file").toUpperCase()} · {formatBytes(currentFile.size_bytes)}</span></>
            ) : (
              <><strong>No document selected</strong><span>Choose the resource file that should be published with this Media Center item.</span></>
            )}
          </div>
          <div className={styles.documentActions}>
            {fileUrl ? <a href={fileUrl} target="_blank" rel="noreferrer"><Eye size={14} /> Open</a> : null}
            {fileUrl ? <a href={fileUrl} download><Download size={14} /> Download</a> : null}
            {!readOnly ? <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={14} />{currentFile ? "Replace" : "Choose file"}</button> : null}
          </div>
          <input ref={fileInputRef} className={styles.fileInput} type="file" accept={ACCEPTED_DOCUMENTS} onChange={(event) => handleFile(event.target.files?.[0] || null)} disabled={readOnly} />
        </div>
        {fieldErrors.document ? <small className={styles.documentError} role="alert">{fieldErrors.document}</small> : null}
        {saving && uploadProgress > 0 ? <div className={styles.progress}><span style={{ width: `${uploadProgress}%` }} /><small>{uploadProgress}%</small></div> : null}
      </section>

      {item?.id && isAdministrator ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><div><h2>Publication</h2><p>Publish immediately, schedule a future publication or move the item back to draft.</p></div></div>
          <div className={styles.publishGrid}>
            <div className={styles.publishState}><span>Status</span><strong className={`${styles.status} ${styles[`status_${item.status}`] || ""}`}>{item.status}</strong><small>{item.published_at ? `Publication: ${item.published_at}` : "Not published yet"}</small></div>
            {item.status === "draft" ? (
              <div className={styles.scheduleBox}>
                <AppDatePicker value={publishAt} onChange={setPublishAt} mode="datetime" placeholder="Publish now or choose a date" ariaLabel="Publication date and time" minDate={new Date()} />
                <button type="button" onClick={() => statusAction("publish")} disabled={statusBusy || saving}>{statusBusy ? <LoaderCircle className={styles.spin} size={14} /> : <CheckCircle2 size={14} />}{publishAt ? "Schedule publication" : "Publish now"}</button>
              </div>
            ) : item.status === "published" ? (
              <button className={styles.secondaryAction} type="button" onClick={() => statusAction("unpublish")} disabled={statusBusy || saving}>Move back to draft</button>
            ) : (
              <button className={styles.secondaryAction} type="button" onClick={() => statusAction("restore")} disabled={statusBusy || saving}>Restore as draft</button>
            )}
          </div>
        </section>
      ) : null}

      <div className={styles.bottomActions}>
        <Link href="/media-center/">Back to Media Center</Link>
        {!readOnly ? <button type="button" onClick={save} disabled={saving || statusBusy}>{saving ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}{saving ? "Saving…" : item?.id ? "Save changes" : "Create draft"}</button> : null}
      </div>

      <MediaCategoryModal open={quickCategoryOpen} quick onClose={() => setQuickCategoryOpen(false)} onSaved={handleQuickCategorySaved} />
    </div>
  );
}
