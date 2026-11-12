"use client";

import { CheckCircle2, LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AppSelect from "@/components/form/AppSelect";
import { apiErrorMessage } from "@/lib/api/client";
import { createAdminDivision, updateAdminDivision } from "@/lib/api/divisions";
import styles from "./DivisionModal.module.css";

const EMPTY = { name_en: "", name_fr: "", division_key: "", slug: "", status: "active", display_order: 0 };
const STATUS_OPTIONS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }];

function fromDivision(item) {
  return item ? { name_en: item.name_en || "", name_fr: item.name_fr || "", division_key: item.division_key || "", slug: item.slug || "", status: item.status || "active", display_order: Number(item.display_order || 0) } : { ...EMPTY };
}

export default function DivisionModal({ open, division = null, onClose, onSaved, quick = false }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const closeRef = useRef(null);
  const editing = Boolean(division?.id);
  const quickCreate = quick && !editing;

  useEffect(() => { if (open) { setForm(fromDivision(division)); setError(""); setSuccess(""); } }, [open, division]);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const keydown = (event) => { if (event.key === "Escape" && !busy) onClose?.(); };
    document.addEventListener("keydown", keydown);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => { window.clearTimeout(timer); document.removeEventListener("keydown", keydown); previous?.focus?.(); };
  }, [open, busy, onClose]);

  if (!open) return null;
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (busy) return;
    if (!form.name_en.trim() || !form.name_fr.trim()) { setError("English and French division names are required."); return; }
    setBusy(true); setError(""); setSuccess("");
    try {
      const payload = { name_en: form.name_en, name_fr: form.name_fr, slug: form.slug, status: form.status, display_order: Number(form.display_order || 0) };
      if (!editing) payload.division_key = form.division_key;
      const next = editing ? await updateAdminDivision(division.id, payload) : await createAdminDivision(payload);
      setForm(fromDivision(next)); setSuccess(editing ? "Division updated successfully." : "Division created successfully."); onSaved?.(next); onClose?.();
    } catch (requestError) { setError(apiErrorMessage(requestError, "Unable to save the division.")); }
    finally { setBusy(false); }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose?.(); }}>
      <section className={`${styles.modal} ${quickCreate ? styles.quickModal : ""}`.trim()} role="dialog" aria-modal="true" aria-labelledby="division-modal-title">
        <header><div><span>{editing ? "Division configuration" : quickCreate ? "Quick division setup" : "Future-ready taxonomy"}</span><h2 id="division-modal-title">{editing ? "Edit division" : quickCreate ? "Create division" : "Add division"}</h2><p>{quickCreate ? "Add the bilingual division name. Its key and URL slug will be generated automatically." : "Divisions classify projects and are exposed through the public API automatically."}</p></div><button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button></header>
        <div className={styles.body}>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          {success ? <div className={styles.success} role="status"><CheckCircle2 size={14} />{success}</div> : null}
          <div className={styles.twoCol}>
            <label><span>English name *</span><input value={form.name_en} onChange={(event) => setValue("name_en", event.target.value)} placeholder="e.g. Infrastructure" /></label>
            <label><span>French name *</span><input value={form.name_fr} onChange={(event) => setValue("name_fr", event.target.value)} placeholder="Nom français" /></label>
          </div>
          {!quickCreate ? (
            <>
              <div className={styles.twoCol}>
                <label><span>Division key</span><input value={form.division_key} onChange={(event) => setValue("division_key", event.target.value)} disabled={editing} placeholder="infrastructure" /><small>{editing ? "Stable identifiers cannot be changed after creation." : "Leave blank to generate from the English name."}</small></label>
                <label><span>URL slug</span><input value={form.slug} onChange={(event) => setValue("slug", event.target.value)} placeholder="infrastructure" /><small>Used for project filtering and future public division routing.</small></label>
              </div>
              <div className={styles.twoCol}>
                <label><span>Status</span><AppSelect value={form.status} onChange={(value) => setValue("status", value)} options={STATUS_OPTIONS} ariaLabel="Division status" /></label>
                <label><span>Display order</span><input type="number" value={form.display_order} onChange={(event) => setValue("display_order", event.target.value)} /></label>
              </div>
            </>
          ) : null}
          <div className={styles.note}><strong>{quickCreate ? "Automatic setup" : "Future division support"}</strong><span>{quickCreate ? "The division is created as Active and its stable key and URL slug are generated from the English name. You can fine-tune its order later from Divisions." : "Creating a division here immediately makes it available for project assignment and public division filters. No Projects API code change is required."}</span></div>
        </div>
        <footer><button type="button" onClick={onClose} disabled={busy}>Close</button><button type="button" onClick={save} disabled={busy}>{busy ? <LoaderCircle className={styles.spin} size={15} /> : <Save size={15} />}{busy ? "Saving…" : editing ? "Save changes" : "Create division"}</button></footer>
      </section>
    </div>
  );
}
