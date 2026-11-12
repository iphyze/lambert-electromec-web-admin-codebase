"use client";

import {
  Archive,
  CheckCircle2,
  Eye,
  FileText,
  FolderTree,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import TableCheckbox from "@/components/table/TableCheckbox";
import TablePagination from "@/components/table/TablePagination";
import { apiErrorMessage } from "@/lib/api/client";
import {
  archiveAdminMediaItem,
  deleteAdminMediaItem,
  listAdminMediaCategories,
  listAdminMediaItems,
} from "@/lib/api/mediaCenter";
import { useAuthStore } from "@/stores/authStore";
import DataToolbar from "@/components/table/DataToolbar";
import DataTable from "@/components/table/DataTable";
import ListSummary from "@/components/table/ListSummary";
import BulkActionBar from "@/components/table/BulkActionBar";
import FilterDrawer from "@/components/table/FilterDrawer";
import StatusPill from "@/components/table/StatusPill";
import RowActions from "@/components/table/RowActions";
import TableDate from "@/components/table/TableDate";
import tableStyles from "@/components/table/DataTable.module.css";
import styles from "./page.module.css";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / (1024 ** index);
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

export default function MediaCenterPage() {
  const user = useAuthStore((state) => state.user);
  const isAdministrator = ["admin", "super_admin"].includes(user?.role);
  const isSuperAdmin = user?.role === "super_admin";
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({ status: "", category_id: "", search: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await listAdminMediaCategories());
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load Media Center categories."));
    }
  }, []);

  const loadItems = useCallback(async ({ page = 1, refresh = false, signal } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await listAdminMediaItems({
        page,
        limit: pagination.limit,
        status: filters.status || undefined,
        category_id: filters.category_id || undefined,
        search: debouncedSearch || undefined,
      }, { signal });
      setItems(response.items);
      setPagination(response.pagination);
      setSelectedIds(new Set());
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") return;
      setError(apiErrorMessage(requestError, "Unable to load Media Center resources."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, filters.category_id, filters.status, pagination.limit]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => {
    const controller = new AbortController();
    loadItems({ page: 1, signal: controller.signal });
    return () => controller.abort();
  }, [loadItems]);

  const categoryOptions = useMemo(() => [
    { value: "", label: "All categories" },
    ...categories.map((category) => ({ value: String(category.id), label: category.name_en })),
  ], [categories]);

  const pageStats = useMemo(() => ({
    featured: items.filter((item) => item.featured).length,
    published: items.filter((item) => item.status === "published").length,
  }), [items]);

  const selectableItems = useMemo(
    () => isAdministrator ? items.filter((item) => item.status !== "archived") : [],
    [isAdministrator, items],
  );
  const selectableIds = useMemo(() => selectableItems.map((item) => Number(item.id)), [selectableItems]);
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelectableSelected = selectableIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const changePageLimit = (limit) => {
    if (!Number.isFinite(limit) || limit < 1 || limit === pagination.limit) return;
    setPagination((current) => ({ ...current, page: 1, limit }));
  };

  const toggleSelection = (id) => {
    const numericId = Number(id);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(numericId)) next.delete(numericId);
      else next.add(numericId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelectableSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const runDestructiveAction = async () => {
    if (!confirm || actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      let postActionError = "";
      if (confirm.type === "delete") {
        await deleteAdminMediaItem(confirm.item.id);
      } else if (confirm.type === "bulk-archive") {
        const ids = Array.from(selectedIds);
        const results = await Promise.allSettled(ids.map((id) => archiveAdminMediaItem(id)));
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length) {
          postActionError = failed.length === ids.length
            ? "Unable to archive the selected Media Center items."
            : `${ids.length - failed.length} item${ids.length - failed.length === 1 ? "" : "s"} archived, but ${failed.length} could not be archived.`;
        }
      } else {
        await archiveAdminMediaItem(confirm.item.id);
      }
      setConfirm(null);
      setSelectedIds(new Set());
      await loadItems({ page: pagination.page, refresh: true });
      if (postActionError) setError(postActionError);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, confirm.type === "delete" ? "Unable to delete this Media Center item." : "Unable to archive this Media Center item."));
    } finally {
      setActionBusy(false);
    }
  };

  const drawerFields = [
    { key: "status", label: "Status", options: STATUS_OPTIONS, isSearchable: false },
    { key: "category_id", label: "Category", options: categoryOptions, isSearchable: true }
  ];


  const columns = [
    ...(isAdministrator ? [{ key: "select", label: "Select", track: "44px", selection: true, header: <TableCheckbox checked={allSelectableSelected} indeterminate={!allSelectableSelected && someSelectableSelected} onChange={toggleSelectAll} disabled={!selectableIds.length} ariaLabel="Select all archiveable Media Center items on this page" />, render: (item) => item.status !== "archived" ? <TableCheckbox checked={selectedIds.has(Number(item.id))} onChange={() => toggleSelection(item.id)} ariaLabel={`Select ${item.title_en}`} /> : null }] : []),
    { key: "resource", label: "Resource", identity: true, track: "minmax(210px,2.2fr)", render: (item) => <div className={tableStyles.identity}><span className={tableStyles.iconTile}><FileText size={20} /></span><div><strong title={item.title_en}>{item.title_en}</strong><small title={`/${item.slug}/`}>/{item.slug}/ {item.reference ? `· ${item.reference}` : ""} {item.featured ? <em><Star size={10} /> Featured</em> : null}</small></div></div> },
    { key: "category", label: "Category", track: "minmax(90px,1fr)", render: (item) => item.category?.name_en || "—" },
    { key: "file", label: "File", track: "minmax(90px,.8fr)", highlight: true, render: (item) => <span className={styles.fileMeta}><strong>{String(item.file?.extension || "file").toUpperCase()}</strong><span>{formatBytes(item.file?.size_bytes)}</span></span> },
    { key: "status", label: "Status", track: "minmax(95px,.8fr)", render: (item) => <StatusPill value={item.status} /> },
    { key: "updated", label: "Updated", track: "minmax(112px,1fr)", hideTablet: true, render: (item) => <TableDate value={item.updated_at} /> },
    { key: "actions", label: "Actions", track: "minmax(110px,auto)", actions: true, align: "right", render: (item) => <RowActions>
      <Link href={`/media-center/view/?id=${item.id}`} aria-label={`View ${item.title_en}`}><Eye size={15} /></Link>
      {(user?.role !== "editor" || item.status === "draft") ? <Link href={`/media-center/edit/?id=${item.id}`} aria-label={`Edit ${item.title_en}`}><Pencil size={15} /></Link> : null}
      {isAdministrator && item.status !== "archived" ? <button type="button" onClick={() => setConfirm({ type: "archive", item })} aria-label={`Archive ${item.title_en}`}><Archive size={15} /></button> : null}
      {isSuperAdmin && item.status === "archived" ? <button type="button" onClick={() => setConfirm({ type: "delete", item })} aria-label={`Permanently delete ${item.title_en}`}><Trash2 size={15} /></button> : null}
    </RowActions> }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <span className={styles.kicker}>Resource management</span>
          <h1>Media Center</h1>
          <p>Manage Lambert’s public documents, bilingual resource content, categories and publication workflow.</p>
        </div>

      </section>

      <ListSummary label="Media Center summary" items={[
      { icon: <FileText size={18} />, value: Number(pagination.total || 0).toLocaleString(), label: "Matching resources" },
      { icon: <Star size={18} />, value: pageStats.featured, label: "Featured on this page" },
      { icon: <CheckCircle2 size={18} />, value: pageStats.published, label: "Published on this page" }
      ]} />

      {error ? <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => loadItems({ page: pagination.page, refresh: true })}>Retry</button></div> : null}

      <DataToolbar
        search={filters.search}
        onSearchChange={(value) => setFilter("search", value)}
        searchPlaceholder="Search title, slug, reference or file..."
        searchLabel="Search Media Center"
        filters={filters}
        filterFields={drawerFields}
        onOpenFilters={() => setFiltersOpen(true)}
        onFilterChange={(key, value) => setFilter(key, value)}
        onClearFilters={() => setFilters((current) => ({ ...current, status: "", category_id: "" }))}
        onRefresh={() => loadItems({ page: pagination.page, refresh: true })}
        refreshing={refreshing}
        action={<>{isAdministrator ? <Link href="/media-center/categories/"><FolderTree size={15} /> Categories</Link> : null}<Link href="/media-center/new/"><Plus size={16} /> New resource</Link></>}
      />
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} applied={filters} fields={drawerFields} onApply={(applied) => setFilters((current) => ({ ...current, ...applied }))} />

      <DataTable label="Media Center resources" columns={columns} rows={items} loading={loading} total={pagination.total} page={pagination.page} limit={pagination.limit} selectedRow={(item) => selectedIds.has(Number(item.id))} emptyIcon={<FileText size={23} />} emptyTitle="No Media Center resources found" emptyMessage="Adjust the filters or create a new resource." />
      <TablePagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} limit={pagination.limit} limitOptions={[12,25,50,100]} loading={loading || refreshing} onPageChange={(page) => loadItems({ page })} onLimitChange={changePageLimit} noun="resources" />

      {isAdministrator ? <BulkActionBar count={selectedCount} singular="resource" onClear={() => setSelectedIds(new Set())}><button type="button" onClick={() => setConfirm({ type: "bulk-archive", count: selectedCount })}><Archive size={15} /> Archive selected</button></BulkActionBar> : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === "delete" ? "Permanently delete resource?" : confirm?.type === "bulk-archive" ? "Archive selected resources?" : "Archive Media Center resource?"}
        message={confirm?.type === "delete" ? `“${confirm?.item?.title_en || "This resource"}” and its uploaded document will be permanently removed.` : confirm?.type === "bulk-archive" ? `${confirm?.count || selectedCount} selected resource${(confirm?.count || selectedCount) === 1 ? "" : "s"} will be moved to Archived.` : `“${confirm?.item?.title_en || "This resource"}” will be removed from the active workflow and moved to Archived.`}
        confirmLabel={confirm?.type === "delete" ? "Delete permanently" : confirm?.type === "bulk-archive" ? "Archive selected" : "Archive resource"}
        tone={confirm?.type === "delete" ? "danger" : "warning"}
        busy={actionBusy}
        onConfirm={runDestructiveAction}
        onClose={() => !actionBusy && setConfirm(null)}
      />
    </div>
  );
}
