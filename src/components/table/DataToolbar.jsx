"use client";

import { Children, Fragment, isValidElement } from "react";
import { Filter, RefreshCw, Search, X } from "lucide-react";
import styles from "./DataToolbar.module.css";

export default function DataToolbar({
  title, description, summary, search = "", onSearchChange,
  searchPlaceholder = "Search records...", searchLabel = "Search records",
  filters = {}, filterFields = [], onFilterChange, onClearFilters,
  onOpenFilters, onRefresh, refreshing = false, action = null,
}) {
  const active = filterFields.filter(({ key }) => String(filters[key] ?? "") !== "");
  const hasSearch = typeof onSearchChange === "function";
  const hasFilters = filterFields.length > 0;
  const actions = action && isValidElement(action) && action.type === Fragment
    ? Children.toArray(action.props.children).filter(Boolean)
    : Children.toArray(action).filter(Boolean);
  return (
    <section className={styles.toolbar} aria-label={title || "List tools"}>
      <div className={styles.card}>
        {hasSearch ? (
          <label className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <input type="search" value={search ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} aria-label={searchLabel} />
            {search ? <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={() => onSearchChange("")}><X size={15} /></button> : null}
          </label>
        ) : !hasFilters ? <div className={styles.description}><div className={styles.headline}><h2>{title || "Records"}</h2>{summary ? <span className={styles.count}>{summary}</span> : null}</div>{description ? <p>{description}</p> : null}</div> : null}
        {hasFilters ? <button type="button" className={styles.filters} onClick={onOpenFilters} aria-haspopup="dialog" aria-label={`Filters${active.length ? `, ${active.length} active` : ""}`}><Filter size={16} /> Filters {active.length ? <span className={styles.count}>{active.length}</span> : null}</button> : null}
        <div className={styles.trailing}>
          {onRefresh ? <button type="button" className={styles.refresh} onClick={onRefresh} disabled={refreshing} title="Refresh list" aria-label="Refresh list"><RefreshCw size={17} className={refreshing ? styles.spinning : ""} /></button> : null}
          {actions.length ? <div className={styles.actions}>{actions.map((entry, i) => <span key={entry.key ?? i} className={i === actions.length - 1 ? styles.primary : styles.secondary}>{entry}</span>)}</div> : null}
        </div>
      </div>
      {active.length ? <div className={styles.chips} aria-label="Active filters">
        {active.map((field) => { const value = String(filters[field.key]); const chosen = field.options?.find((option) => String(option.value) === value); return <button type="button" key={field.key} className={styles.chip} onClick={() => onFilterChange?.(field.key, "")} aria-label={`Remove ${field.label} filter`}>{field.label}: <strong>{chosen?.label || value}</strong><X size={13} /></button>; })}
        <button type="button" className={styles.clearAll} onClick={onClearFilters}>Clear all</button>
      </div> : null}
    </section>
  );
}
