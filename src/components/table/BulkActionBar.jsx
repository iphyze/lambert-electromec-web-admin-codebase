"use client";

import styles from "./BulkActionBar.module.css";

export default function BulkActionBar({ count, singular = "record", plural, onClear, children }) {
  if (!count) return null;
  const noun = count === 1 ? singular : (plural || `${singular}s`);
  return <><div className={styles.reserve} aria-hidden="true" /><div className={styles.bar} role="status" aria-live="polite">
    <span className={styles.summary}><strong>{count}</strong> {noun} selected</span>
    <div className={styles.actions}>
      <button className={styles.clear} type="button" onClick={onClear}>Clear selection</button>
      {children}
    </div>
  </div></>;
}
