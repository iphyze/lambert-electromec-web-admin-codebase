"use client";

import {
  Archive,
  BriefcaseBusiness,
  Eye,
  Image as ImageIcon,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import TableCheckbox from "@/components/table/TableCheckbox";
import TablePagination from "@/components/table/TablePagination";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { apiErrorMessage } from "@/lib/api/client";
import { listAdminDivisions } from "@/lib/api/divisions";
import {
  archiveAdminProject,
  deleteAdminProject,
  listAdminProjects,
  projectAssetUrl,
} from "@/lib/api/projects";
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

function ProjectThumb({ item }) {
  if (!item.featured_image?.url) {
    return (
      <span className={styles.thumbPlaceholder}>
        <ImageIcon size={20} />
      </span>
    );
  }

  return (
    <img
      src={projectAssetUrl(item.featured_image.url)}
      alt={item.featured_image.alt_text_en || ""}
    />
  );
}

export default function ProjectsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdministrator = ["admin", "super_admin"].includes(user?.role);
  const isSuperAdmin = user?.role === "super_admin";
  const [items, setItems] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({ status: "", division_id: "", search: "" });
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

  const loadDivisions = useCallback(async () => {
    try {
      setDivisions(await listAdminDivisions());
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load divisions."));
    }
  }, []);

  const loadProjects = useCallback(async ({ page = 1, refresh = false, signal } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await listAdminProjects(
        {
          page,
          limit: pagination.limit,
          status: filters.status || undefined,
          division_id: filters.division_id || undefined,
          search: debouncedSearch || undefined,
        },
        { signal },
      );
      setItems(response.items);
      setPagination(response.pagination);
      setSelectedIds(new Set());
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") return;
      setError(apiErrorMessage(requestError, "Unable to load projects."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, filters.division_id, filters.status, pagination.limit]);

  useEffect(() => {
    loadDivisions();
  }, [loadDivisions]);

  useEffect(() => {
    const controller = new AbortController();
    loadProjects({ page: 1, signal: controller.signal });
    return () => controller.abort();
  }, [loadProjects]);

  const divisionOptions = useMemo(
    () => [
      { value: "", label: "All divisions" },
      ...divisions.map((item) => ({ value: String(item.id), label: item.name_en })),
    ],
    [divisions],
  );

  const pageStats = useMemo(
    () => ({
      featured: items.filter((item) => item.featured).length,
    }),
    [items],
  );

  const selectableItems = useMemo(
    () => (isAdministrator ? items.filter((item) => item.status !== "archived") : []),
    [isAdministrator, items],
  );
  const selectableIds = useMemo(() => selectableItems.map((item) => Number(item.id)), [selectableItems]);
  const selectedCount = selectedIds.size;
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelectableSelected = selectableIds.some((id) => selectedIds.has(id));

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
      if (allSelectableSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
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
        await deleteAdminProject(confirm.item.id);
      } else if (confirm.type === "bulk-archive") {
        const ids = Array.from(selectedIds);
        const results = await Promise.allSettled(ids.map((id) => archiveAdminProject(id)));
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length) {
          postActionError = failed.length === ids.length
            ? "Unable to archive the selected projects. Please try again."
            : `${ids.length - failed.length} project${ids.length - failed.length === 1 ? "" : "s"} archived, but ${failed.length} could not be archived.`;
        }
      } else {
        await archiveAdminProject(confirm.item.id);
      }

      setConfirm(null);
      setSelectedIds(new Set());
      await loadProjects({ page: pagination.page, refresh: true });
      if (postActionError) setError(postActionError);
    } catch (requestError) {
      setError(
        apiErrorMessage(
          requestError,
          confirm.type === "delete" ? "Unable to delete the project." : "Unable to archive the project.",
        ),
      );
    } finally {
      setActionBusy(false);
    }
  };

  const drawerFields = [
    { key: "status", label: "Status", options: STATUS_OPTIONS, isSearchable: false },
    { key: "division_id", label: "Division", options: divisionOptions, isSearchable: true }
  ];


  const columns = [
    ...(isAdministrator ? [{ key: "select", label: "Select", selection: true, track: "44px", header: <TableCheckbox checked={allSelectableSelected} indeterminate={!allSelectableSelected && someSelectableSelected} onChange={toggleSelectAll} disabled={!selectableIds.length || loading} ariaLabel="Select all archiveable projects on this page" />, render: (item) => <TableCheckbox checked={selectedIds.has(Number(item.id))} onChange={() => toggleSelection(item.id)} disabled={item.status === "archived"} ariaLabel={`Select ${item.title_en}`} /> }] : []),
    { key: "project", label: "Project", identity: true, track: "minmax(225px,2.4fr)", render: (item) => <div className={tableStyles.identity}><span className={tableStyles.thumb}><ProjectThumb item={item} /></span><div><strong title={item.title_en}>{item.title_en}</strong><small title={`/${item.slug}/`}>/{item.slug}/ {item.featured ? <em><Star size={10} fill="currentColor" /> Featured</em> : null}</small></div></div> },
    { key: "division", label: "Division", track: "minmax(95px,1fr)", render: (item) => item.division?.name_en || "—" },
    { key: "status", label: "Status", track: "minmax(95px,.8fr)", render: (item) => <StatusPill value={item.status} /> },
    { key: "images", label: "Images", track: "minmax(75px,.7fr)", numeric: true, highlight: true, render: (item) => <span className={styles.imageCount}><ImageIcon size={13} /> {Number(item.image_count || 0)}</span> },
    { key: "updated", label: "Updated", track: "minmax(110px,1fr)", hideTablet: true, render: (item) => <TableDate value={item.updated_at} /> },
    { key: "actions", label: "Actions", track: "minmax(116px,auto)", actions: true, align: "right", render: (item) => <RowActions>
      <Link href={`/projects/view/?id=${item.id}`} aria-label={`View ${item.title_en}`} title="View project"><Eye size={15} /></Link>
      <Link href={`/projects/edit/?id=${item.id}`} aria-label={`Edit ${item.title_en}`} title="Edit project"><Pencil size={15} /></Link>
      {isAdministrator && item.status !== "archived" ? <button type="button" onClick={() => setConfirm({ type: "archive", item })} aria-label={`Archive ${item.title_en}`} title="Archive project"><Archive size={15} /></button> : null}
      {isSuperAdmin && item.status === "archived" ? <button type="button" onClick={() => setConfirm({ type: "delete", item })} aria-label={`Permanently delete ${item.title_en}`} title="Delete permanently"><Trash2 size={15} /></button> : null}
    </RowActions> }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <span className={styles.kicker}>Portfolio management</span>
          <h1>Projects</h1>
          <p>Manage Lambert’s project portfolio, bilingual content, galleries and publication workflow.</p>
        </div>

      </section>

      <ListSummary label="Project summary" items={[
      { icon: <BriefcaseBusiness size={18} />, value: Number(pagination.total || 0).toLocaleString(), label: "Matching projects" },
      { icon: <Star size={18} />, value: pageStats.featured, label: "Featured on this page" },
      { icon: <ImageIcon size={18} />, value: items.reduce((sum, item) => sum + Number(item.image_count || 0), 0), label: "Images on this page" }
      ]} />

      {error ? (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => loadProjects({ page: pagination.page, refresh: true })}>Retry</button>
        </div>
      ) : null}

      <DataToolbar
        search={filters.search}
        onSearchChange={(value) => setFilter("search", value)}
        searchPlaceholder="Search title, slug or location..."
        searchLabel="Search projects"
        filters={filters}
        filterFields={drawerFields}
        onOpenFilters={() => setFiltersOpen(true)}
        onFilterChange={(key, value) => setFilter(key, value)}
        onClearFilters={() => setFilters((current) => ({ ...current, status: "", division_id: "" }))}
        onRefresh={() => loadProjects({ page: pagination.page, refresh: true })}
        refreshing={refreshing}
        action={<Link href="/projects/new/"><Plus size={16} /> New project</Link>}
      />
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} applied={filters} fields={drawerFields} onApply={(applied) => setFilters((current) => ({ ...current, ...applied }))} />

      <DataTable label="Projects" columns={columns} rows={items} loading={loading} total={pagination.total} page={pagination.page} limit={pagination.limit} selectedRow={(item) => selectedIds.has(Number(item.id))} emptyIcon={<BriefcaseBusiness size={23} />} emptyTitle="No projects found" emptyMessage="Adjust the filters or create a new project." />
      <TablePagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} limit={pagination.limit} limitOptions={[12,25,50,100]} loading={loading} onPageChange={(page) => loadProjects({ page })} onLimitChange={changePageLimit} noun="projects" />

      {isAdministrator ? <BulkActionBar count={selectedCount} singular="project" onClear={() => setSelectedIds(new Set())}><button type="button" onClick={() => setConfirm({ type: "bulk-archive", count: selectedCount })}><Archive size={15} /> Archive selected</button></BulkActionBar> : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === "delete"
            ? "Permanently delete project?"
            : confirm?.type === "bulk-archive"
              ? `Archive ${confirm?.count || selectedCount} selected projects?`
              : "Archive project?"
        }
        message={
          confirm?.type === "delete"
            ? `This permanently deletes “${confirm?.item?.title_en || "this project"}” and all stored gallery images. This cannot be undone.`
            : confirm?.type === "bulk-archive"
              ? `The selected ${confirm?.count || selectedCount} project${(confirm?.count || selectedCount) === 1 ? "" : "s"} will be removed from the active workflow and moved to Archived.`
              : `“${confirm?.item?.title_en || "This project"}” will be removed from the active workflow and moved to Archived.`
        }
        confirmLabel={
          confirm?.type === "delete"
            ? "Delete permanently"
            : confirm?.type === "bulk-archive"
              ? "Archive selected"
              : "Archive project"
        }
        tone={confirm?.type === "delete" ? "danger" : "warning"}
        busy={actionBusy}
        onConfirm={runDestructiveAction}
        onClose={() => !actionBusy && setConfirm(null)}
      />
    </div>
  );
}
