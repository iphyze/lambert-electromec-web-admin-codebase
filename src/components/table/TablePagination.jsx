"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import AppSelect from "@/components/form/AppSelect";
import styles from "./TablePagination.module.css";

// Edge cases: (1,1) -> [1]; (1,2) -> [1,2];
// (1,20) -> [1,2,3,"…",20]; (20,20) -> [1,"…",18,19,20];
// (4,8) -> [1,"…",3,4,5,"…",8]; (6,20) -> [1,"…",5,6,7,"…",20].
export function paginationRange(currentPage, totalPages) {
  const last = Math.max(1, Math.trunc(Number(totalPages) || 1));
  const current = Math.min(last, Math.max(1, Math.trunc(Number(currentPage) || 1)));
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, ...(current === 3 ? [4] : []), "…", last];
  if (current >= last - 2) return [1, "…", ...(current === last - 2 ? [last - 3] : []), last - 2, last - 1, last];
  return [1, "…", current - 1, current, current + 1, "…", last];
}

export default function TablePagination({
  page = 1, totalPages = 1, total = 0, limit = 20,
  limitOptions = [10, 25, 50, 100], loading = false,
  onPageChange, onLimitChange, noun = "records",
}) {
  const last = Math.max(1, Number(totalPages) || 1);
  const current = Math.min(last, Math.max(1, Number(page) || 1));
  const count = Math.max(0, Number(total) || 0);
  const perPage = Math.max(1, Number(limit) || 1);
  const from = count ? (current - 1) * perPage + 1 : 0;
  const to = Math.min(count, current * perPage);
  return <nav className={styles.pagination} aria-label="Pagination" aria-busy={loading || undefined}>
    <div className={styles.summary} aria-live="polite">
      {count ? <span>Showing <strong>{from.toLocaleString()}–{to.toLocaleString()}</strong> of <strong>{count.toLocaleString()}</strong> {noun}</span> : <span>No results</span>}
      <span className={styles.spinnerSlot} aria-hidden="true">{loading ? <LoaderCircle className={styles.spinner} size={14} /> : null}</span>
    </div>
    <div className={styles.right}>
      <label className={styles.pageSize}><span>Rows per page</span>
        <AppSelect className={styles.pageSizeSelect} value={String(limit)} onChange={(value) => onLimitChange?.(Number(value))} options={limitOptions.map((n) => ({ value: String(n), label: String(n) }))} ariaLabel="Rows per page" isSearchable={false} disabled={loading} menuPlacement="top" />
      </label>
      <div className={styles.controls}>
        <button type="button" className={styles.navButton} onClick={() => onPageChange?.(current - 1)} disabled={loading || current <= 1} aria-label="Previous page"><ChevronLeft size={16} /><span className={styles.navText}>Prev</span></button>
        <div className={styles.pageNumbers}>
          {paginationRange(current, last).map((value, index) => typeof value === "number"
            ? <button type="button" key={value} className={`${styles.pageButton} ${value === current ? styles.activePage : ""}`} onClick={() => onPageChange?.(value)} disabled={loading || value === current} aria-label={`Page ${value}`} aria-current={value === current ? "page" : undefined}>{value}</button>
            : <span key={`ellipsis-${index}`} aria-hidden="true" className={styles.ellipsis}>…</span>)}
        </div>
        <span className={styles.compactPage} aria-live="polite">Page <strong>{current}</strong> of {last}</span>
        <button type="button" className={styles.navButton} onClick={() => onPageChange?.(current + 1)} disabled={loading || current >= last} aria-label="Next page"><span className={styles.navText}>Next</span><ChevronRight size={16} /></button>
      </div>
    </div>
  </nav>;
}
