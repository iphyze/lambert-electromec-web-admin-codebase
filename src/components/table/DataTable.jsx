"use client";

import { useId } from "react";
import styles from "./DataTable.module.css";

/**
 * Accessible grid-based table: each row is a single independent card.
 * Columns: {key, label, track, align, hideTablet, highlight, selection,
 *           actions, render(item), header?, mobileHide? }.
 */
export default function DataTable({
  label, columns, rows = [], rowKey = "id", loading = false,
  total, page = 1, limit, emptyTitle = "No records found", emptyMessage = "Try another filter.",
  emptyIcon = null, emptyAction = null, rowClassName,
  onRowClick, rowHref, selectedRow, unreadRow,
}) {
  const descriptionId = useId();
  const trackFor = (column) => column.selection ? "48px" : column.track || "minmax(92px,1fr)";
  const template = columns.map(trackFor).join(" ");
  const tabletTemplate = columns.filter((column) => !column.hideTablet).map(trackFor).join(" ");
  const tableTracks = { "--table-columns": template, "--table-columns-tablet": tabletTemplate };
  const firstRowIndex = Math.max(0, (Number(page) - 1) * Number(limit || rows.length || 1));
  const keyFor = (row) => typeof rowKey === "function" ? rowKey(row) : row[rowKey];
  return (
    <section className={styles.tableSection} aria-labelledby={descriptionId}>
      <h2 id={descriptionId} className={styles.srOnly}>{label}</h2>
      <div role="table" aria-label={label} aria-rowcount={Number.isFinite(Number(total)) ? Number(total) + 1 : undefined} className={styles.table} aria-busy={loading || undefined}>
        <div role="rowgroup" className={styles.headerGroup}>
          <div role="row" aria-rowindex={1} className={styles.header} style={tableTracks}>
            {columns.map((column, index) => (
              <div key={column.key} role="columnheader" aria-label={column.label || (column.selection ? "Select" : undefined)} className={[styles.headerCell, (column.align === "right" || column.numeric || column.actions) ? styles.right : "", column.hideTablet ? styles.hideTablet : "", column.selection ? styles.selection : ""].filter(Boolean).join(" ")}>
                {column.selection ? <span className={styles.headerCheckbox}>{column.header ?? column.label}</span> : column.header ?? column.label}
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup" className={styles.rows}>
          {loading ? Array.from({ length: 6 }, (_, index) => (
            <div key={`skeleton-${index}`} role="row" className={`${styles.row} ${styles.skeleton}`} style={tableTracks} aria-label="Loading record">
              {columns.map((column) => <div role="cell" key={column.key} className={`${styles.cell} ${column.hideTablet ? styles.hideTablet : ""}`}><span className={styles.skeletonBar} /></div>)}
            </div>
          )) : rows.length ? rows.map((row, index) => {
            const clickable = Boolean(onRowClick || rowHref);
            return <div
              key={keyFor(row)} role="row" aria-rowindex={firstRowIndex + index + 2} tabIndex={clickable ? 0 : undefined}
              className={[styles.row, selectedRow?.(row) ? styles.selected : "", unreadRow?.(row) ? styles.unread : "", clickable ? styles.clickable : "", rowClassName?.(row) || ""].filter(Boolean).join(" ")}
              style={tableTracks}
              onClick={clickable ? (event) => {
                if (event.target.closest("a, button, input, label, [role='menu']")) return;
                if (onRowClick) onRowClick(row);
                else if (rowHref) window.location.assign(rowHref(row));
              } : undefined}
              onKeyDown={clickable ? (event) => {
                if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
                event.preventDefault();
                if (onRowClick) onRowClick(row);
                else if (rowHref) window.location.assign(rowHref(row));
              } : undefined}
            >
              {columns.map((column) => <div key={column.key} role="cell" aria-label={column.label || undefined} className={[styles.cell, column.selection ? styles.selection : "", column.actions ? styles.actionsCell : "", column.hideTablet ? styles.hideTablet : "", column.mobileHide ? styles.hideMobile : "", (column.align === "right" || column.numeric || column.actions) ? styles.right : "", column.numeric ? styles.numeric : "", column.identity ? styles.identityCell : ""].filter(Boolean).join(" ")}>
                {!column.selection && !column.actions && !column.identity && !column.mobileHide ? <span className={styles.mobileLabel} aria-hidden="true">{column.label}</span> : null}
                <div className={styles.value}>{column.render?.(row)}</div>
              </div>)}
            </div>;
          }) : (
            <div className={styles.empty} role="row"><div role="cell" className={styles.emptyInner}>
              {emptyIcon ? <div className={styles.emptyIcon}>{emptyIcon}</div> : null}
              <strong>{emptyTitle}</strong><p>{emptyMessage}</p>{emptyAction}
            </div></div>
          )}
        </div>
      </div>
    </section>
  );
}
