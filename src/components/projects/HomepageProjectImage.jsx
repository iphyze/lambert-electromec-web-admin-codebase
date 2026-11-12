"use client";

import { ImageIcon, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import {
  deleteProjectHomepageImage,
  uploadProjectHomepageImage,
} from "@/lib/api/projects";
import styles from "./HomepageProjectImage.module.css";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

function formatBytes(value = 0) {
  const bytes = Number(value || 0);
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HomepageProjectImage({ project, image, onChange, readOnly = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const pickFile = () => {
    if (!readOnly && !busy) inputRef.current?.click();
  };

  const upload = async (file) => {
    if (!file || !project?.id || busy || readOnly) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Homepage images must be JPG, PNG or WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Homepage images must be 8 MB or smaller.");
      return;
    }

    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const next = await uploadProjectHomepageImage(project.id, file, (event) => {
        if (!event?.total) return;
        setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      });
      onChange?.(next);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to upload the homepage image."));
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!image || !project?.id || busy || readOnly) return;
    setBusy(true);
    setError("");
    try {
      await deleteProjectHomepageImage(project.id);
      onChange?.(null);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to remove the homepage image."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <strong>Homepage featured image</strong>
          <p>Optional dedicated landscape image for the homepage slider only. It is not added to the project gallery or project page.</p>
        </div>
        <span>Recommended: 16:9 or wide landscape</span>
      </div>

      <div className={`${styles.card} ${image ? styles.hasImage : ""}`.trim()}>
        <div className={styles.preview}>
          {image?.url ? (
            <img src={image.url} alt={image.alt_text_en || project?.title_en || "Homepage project"} />
          ) : (
            <div className={styles.emptyPreview} aria-hidden="true">
              <ImageIcon size={24} />
            </div>
          )}
        </div>

        <div className={styles.copy}>
          <strong>{image ? "Dedicated homepage image selected" : "Using project featured image as fallback"}</strong>
          <p>
            {image
              ? `${image.original_filename || "Homepage image"}${image.file_size ? ` · ${formatBytes(image.file_size)}` : ""}`
              : "Choose a separate image if the homepage slider needs a different crop or composition."}
          </p>
          {busy && progress > 0 ? <small>Uploading… {progress}%</small> : null}
          {error ? <small className={styles.error} role="alert">{error}</small> : null}
        </div>

        <div className={styles.actions}>
          <input
            ref={inputRef}
            className={styles.fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={readOnly || busy}
            onChange={(event) => upload(event.target.files?.[0])}
          />
          <button type="button" onClick={pickFile} disabled={readOnly || busy}>
            {busy ? <LoaderCircle size={14} className={styles.spin} /> : <Upload size={14} />}
            {image ? "Replace" : "Choose image"}
          </button>
          {image ? (
            <button className={styles.remove} type="button" onClick={remove} disabled={readOnly || busy}>
              <Trash2 size={14} /> Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
