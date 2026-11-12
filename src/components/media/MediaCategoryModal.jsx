"use client";

import { CheckCircle2, LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AppSelect from "@/components/form/AppSelect";
import { apiErrorMessage } from "@/lib/api/client";
import {
  createAdminMediaCategory,
  updateAdminMediaCategory,
} from "@/lib/api/mediaCenter";
import styles from "./MediaCategoryModal.module.css";

const EMPTY = { name_en: "", name_fr: "", slug: "", status: "active", display_order: 0 };
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function fromCategory(item) {
  return item
    ? {
        name_en: item.name_en || "",
        name_fr: item.name_fr || "",
        slug: item.slug || "",
        status: item.status || "active",
        display_order: Number(item.display_order || 0),
      }
    : { ...EMPTY };
}

function slugPreview(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export default function MediaCategoryModal({ open, category = null, onClose, onSaved, quick = false }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef(null);
  const editing = Boolean(category?.id);
  const quickCreate = quick && !editing;

  useEffect(() => {
    if (!open) return;
    setForm(fromCategory(category));
    setErrors({});
    setError("");
  }, [open, category]);

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

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const save = async () => {
    if (busy) return;
    const nextErrors = {};
    if (!form.name_en.trim()) nextErrors.name_en = "English category name is required.";
    if (!form.name_fr.trim()) nextErrors.name_fr = "French category name is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    setError("");
    try {
      const payload = {
        name_en: form.name_en,
        name_fr: form.name_fr,
        slug: editing ? form.slug : "",
        status: quickCreate ? "active" : form.status,
        display_order: quickCreate ? 0 : Number(form.display_order || 0),
      };
      const next = editing
        ? await updateAdminMediaCategory(category.id, payload)
        : await createAdminMediaCategory(payload);
      onSaved?.(next);
      onClose?.();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to save the Media Center category."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose?.();
    }}>
      <section className={`${styles.modal} ${quickCreate ? styles.quickModal : ""}`.trim()} role="dialog" aria-modal="true" aria-labelledby="media-category-title">
        <header>
          <div>
            <span>{editing ? "Category configuration" : quickCreate ? "Quick category setup" : "Media taxonomy"}</span>
            <h2 id="media-category-title">{editing ? "Edit category" : "Create category"}</h2>
            <p>{quickCreate ? "Add the bilingual category name. Its URL slug will be generated automatically." : "Categories organise Media Center resources on the public website."}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </header>

        <div className={styles.body}>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          <div className={styles.twoCol}>
            <label className={errors.name_en ? styles.invalidField : ""}>
              <span>English name *</span>
              <input value={form.name_en} onChange={(event) => setValue("name_en", event.target.value)} placeholder="e.g. Corporate Publications" aria-invalid={Boolean(errors.name_en)} />
              {errors.name_en ? <small className={styles.fieldError}>{errors.name_en}</small> : null}
            </label>
            <label className={errors.name_fr ? styles.invalidField : ""}>
              <span>French name *</span>
              <input value={form.name_fr} onChange={(event) => setValue("name_fr", event.target.value)} placeholder="Nom français" aria-invalid={Boolean(errors.name_fr)} />
              {errors.name_fr ? <small className={styles.fieldError}>{errors.name_fr}</small> : null}
            </label>
          </div>

          {!quickCreate ? (
            <div className={styles.twoCol}>
              <label>
                <span>URL slug</span>
                <input value={form.slug || slugPreview(form.name_en)} disabled />
                <small>Generated automatically and kept stable after creation.</small>
              </label>
              <label>
                <span>Status</span>
                <AppSelect value={form.status} onChange={(value) => setValue("status", value)} options={STATUS_OPTIONS} ariaLabel="Category status" isSearchable={false} />
              </label>
              <label>
                <span>Display order</span>
                <input type="number" value={form.display_order} onChange={(event) => setValue("display_order", event.target.value)} />
              </label>
            </div>
          ) : null}

          <div className={styles.note}>
            <CheckCircle2 size={15} />
            <div><strong>Reusable category</strong><span>Once created, this category becomes available immediately in the Media Center editor and public filters.</span></div>
          </div>
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" onClick={save} disabled={busy}>
            {busy ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}
            {busy ? "Saving…" : editing ? "Save changes" : "Create category"}
          </button>
        </footer>
      </section>
    </div>
  );
}
