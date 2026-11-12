"use client";

import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, LoaderCircle, Star, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import { deleteProjectImage, projectAssetUrl, reorderProjectImages, updateProjectImage, uploadProjectImages } from "@/lib/api/projects";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import styles from "./ProjectGalleryManager.module.css";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

function sizeLabel(value) {
  const size = Number(value || 0);
  if (!size) return "—";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectGalleryManager({ project, images = [], onChange, readOnly = false }) {
  const inputRef = useRef(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [removeTarget, setRemoveTarget] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState(null);

  const featured = useMemo(() => images.find((item) => item.is_featured) ?? null, [images]);

  const chooseFiles = () => { if (!readOnly && !busy) inputRef.current?.click(); };
  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    setError("");
    for (const file of files) {
      if (!ACCEPTED.has(file.type)) { setError("Project images must be JPG, PNG or WEBP."); return; }
      if (file.size > MAX_FILE_BYTES) { setError("Each project image must be 8 MB or smaller."); return; }
    }
    setSelected(files.slice(0, 10));
  };
  const upload = async () => {
    if (!selected.length || !project?.id || busy || readOnly) return;
    setBusy(true); setError(""); setSuccess(""); setProgress(0);
    try {
      const next = await uploadProjectImages(project.id, selected, (event) => {
        if (event.total) setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      });
      onChange?.(next); setSelected([]); setSuccess("Project images uploaded successfully.");
    } catch (requestError) { setError(apiErrorMessage(requestError, "Unable to upload project images.")); }
    finally { setBusy(false); setProgress(null); }
  };
  const move = async (index, direction) => {
    if (busy || readOnly) return;
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const ordered = [...images];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setBusy(true); setError("");
    try { onChange?.(await reorderProjectImages(project.id, ordered.map((item) => item.id))); }
    catch (requestError) { setError(apiErrorMessage(requestError, "Unable to reorder project images.")); }
    finally { setBusy(false); }
  };
  const makeFeatured = async (image) => {
    if (busy || readOnly || image.is_featured) return;
    setBusy(true); setError("");
    try { onChange?.(await updateProjectImage(image.id, { is_featured: true })); setSuccess("Featured image updated."); }
    catch (requestError) { setError(apiErrorMessage(requestError, "Unable to update the featured image.")); }
    finally { setBusy(false); }
  };
  const startEdit = (image) => {
    if (readOnly) return;
    setEditingId(image.id);
    setEditForm({ alt_text_en: image.alt_text_en || "", alt_text_fr: image.alt_text_fr || "", caption_en: image.caption_en || "", caption_fr: image.caption_fr || "" });
  };
  const saveEdit = async (image) => {
    if (busy || readOnly) return;
    setBusy(true); setError("");
    try { onChange?.(await updateProjectImage(image.id, editForm)); setEditingId(null); setSuccess("Image details saved."); }
    catch (requestError) { setError(apiErrorMessage(requestError, "Unable to save image details.")); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!removeTarget || busy || readOnly) return;
    setBusy(true); setError("");
    try { onChange?.(await deleteProjectImage(removeTarget.id)); setRemoveTarget(null); setSuccess("Project image removed."); }
    catch (requestError) { setError(apiErrorMessage(requestError, "Unable to remove the image.")); }
    finally { setBusy(false); }
  };

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div><h3>Project gallery</h3><p>Upload JPG, PNG or WEBP images. The featured image is used on project cards and sharing previews.</p></div>
        <span className={styles.count}>{images.length}/30 images</span>
      </div>
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {success ? <div className={styles.success} role="status"><CheckCircle2 size={14} />{success}</div> : null}
      {!readOnly ? (
        <div className={styles.uploadBox}>
          <input ref={inputRef} className={styles.hidden} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} />
          <div className={styles.uploadLead}><span><ImagePlus size={19} /></span><div><strong>Add project images</strong><small>Up to 10 per upload · max 8 MB each</small></div></div>
          <button type="button" onClick={chooseFiles} disabled={busy}><Upload size={15} /> Choose images</button>
        </div>
      ) : null}
      {selected.length ? (
        <div className={styles.pending}>
          <div><strong>{selected.length} image{selected.length === 1 ? "" : "s"} ready</strong><span>{selected.map((file) => file.name).join(", ")}</span></div>
          {progress !== null ? <div className={styles.progress}><span style={{ width: `${progress}%` }} /></div> : null}
          <div className={styles.pendingActions}><button type="button" onClick={() => setSelected([])} disabled={busy}>Clear</button><button type="button" onClick={upload} disabled={busy}>{busy ? <LoaderCircle className={styles.spin} size={15} /> : <Upload size={15} />} Upload</button></div>
        </div>
      ) : null}
      {!images.length ? <div className={styles.empty}><ImagePlus size={24} /><strong>No project images yet</strong><span>Add at least one image before publishing this project.</span></div> : null}
      <div className={styles.grid}>
        {images.map((image, index) => (
          <article className={styles.item} key={image.id}>
            <div className={styles.visual}>
              <img src={projectAssetUrl(image.url)} alt={image.alt_text_en || ""} />
              {image.is_featured ? <span className={styles.featured}><Star size={11} fill="currentColor" /> Featured</span> : null}
            </div>
            <div className={styles.meta}><strong>{image.original_filename || `Image ${index + 1}`}</strong><span>{sizeLabel(image.file_size)}</span></div>
            {editingId === image.id ? (
              <div className={styles.editFields}>
                <input value={editForm.alt_text_en || ""} onChange={(event) => setEditForm((current) => ({ ...current, alt_text_en: event.target.value }))} placeholder="English alt text" />
                <input value={editForm.alt_text_fr || ""} onChange={(event) => setEditForm((current) => ({ ...current, alt_text_fr: event.target.value }))} placeholder="French alt text" />
                <input value={editForm.caption_en || ""} onChange={(event) => setEditForm((current) => ({ ...current, caption_en: event.target.value }))} placeholder="English caption (optional)" />
                <input value={editForm.caption_fr || ""} onChange={(event) => setEditForm((current) => ({ ...current, caption_fr: event.target.value }))} placeholder="French caption (optional)" />
                <div><button type="button" onClick={() => setEditingId(null)} disabled={busy}>Cancel</button><button type="button" onClick={() => saveEdit(image)} disabled={busy}>Save</button></div>
              </div>
            ) : (
              <div className={styles.actions}>
                <button type="button" onClick={() => move(index, -1)} disabled={busy || readOnly || index === 0} aria-label="Move image up"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={busy || readOnly || index === images.length - 1} aria-label="Move image down"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => makeFeatured(image)} disabled={busy || readOnly || image.is_featured} title={image.is_featured ? "Featured image" : "Make featured"}><Star size={14} /></button>
                <button type="button" onClick={() => startEdit(image)} disabled={busy || readOnly}>Edit details</button>
                <button type="button" className={styles.remove} onClick={() => setRemoveTarget(image)} disabled={busy || readOnly}><Trash2 size={14} /></button>
              </div>
            )}
          </article>
        ))}
      </div>
      {featured ? <p className={styles.featuredNote}>Current featured image: <strong>{featured.original_filename || `Image ${images.findIndex((item) => item.id === featured.id) + 1}`}</strong></p> : null}
      <ConfirmDialog open={Boolean(removeTarget)} title="Remove project image?" message="This removes the image from the project gallery and deletes the stored file. If it is featured, another image will be selected automatically." confirmLabel="Remove image" busy={busy} onConfirm={remove} onClose={() => !busy && setRemoveTarget(null)} />
    </section>
  );
}
