"use client";

import {
  Archive,
  BriefcaseBusiness,
  Eye,
  Mail,
  MailWarning,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import TableCheckbox from "@/components/table/TableCheckbox";
import TablePagination from "@/components/table/TablePagination";
import { apiErrorMessage } from "@/lib/api/client";
import {
  changeAdminContactStatus,
  deleteAdminContactMessage,
  listAdminContactMessages,
  listAdminContactSubjects,
} from "@/lib/api/contacts";
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
  { value: "new", label: "New / unread" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

const EMAIL_STATUS_OPTIONS = [
  { value: "", label: "All delivery states" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "not_configured", label: "Not configured" },
];

function deliveryLabel(status) {
  return String(status || "pending").replaceAll("_", " ");
}

export default function ContactsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdministrator = ["admin", "super_admin"].includes(user?.role);
  const isSuperAdmin = user?.role === "super_admin";
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [summary, setSummary] = useState({ total: 0, new: 0, read: 0, replied: 0, archived: 0, email_failed: 0, email_not_configured: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({ status: "", subject: "", email_status: "", search: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const loadSubjects = useCallback(async () => {
    if (!isAdministrator) return;
    try {
      setSubjects(await listAdminContactSubjects());
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load contact subjects."));
    }
  }, [isAdministrator]);

  const loadMessages = useCallback(async ({ page = 1, refresh = false, signal } = {}) => {
    if (!isAdministrator) {
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await listAdminContactMessages({
        page,
        limit: pagination.limit,
        status: filters.status || undefined,
        subject: filters.subject || undefined,
        email_status: filters.email_status || undefined,
        search: debouncedSearch || undefined,
      }, { signal });
      setItems(response.items);
      setSummary(response.summary);
      setPagination(response.pagination);
      setSelectedIds(new Set());
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") return;
      setError(apiErrorMessage(requestError, "Unable to load contact messages."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, filters.email_status, filters.status, filters.subject, isAdministrator, pagination.limit]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => {
    const controller = new AbortController();
    loadMessages({ page: 1, signal: controller.signal });
    return () => controller.abort();
  }, [loadMessages]);

  const subjectOptions = useMemo(() => [
    { value: "", label: "All subjects" },
    ...subjects.map((subject) => ({
      value: subject.subject_key,
      label: subject.status === "inactive" ? `${subject.label_en} (inactive)` : subject.label_en,
    })),
  ], [subjects]);

  const selectableIds = useMemo(
    () => items.filter((item) => item.status !== "archived").map((item) => Number(item.id)),
    [items],
  );
  const selectedCount = selectedIds.size;
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelectableSelected = selectableIds.some((id) => selectedIds.has(id));
  const deliveryAttention = summary.email_failed + summary.email_not_configured;

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const changePageLimit = (limit) => {
    if (!Number.isFinite(limit) || limit < 1 || limit === pagination.limit) return;
    setPagination((current) => ({ ...current, page: 1, limit }));
  };

  const toggleSelection = (id) => {
    const numericId = Number(id);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(numericId)) next.delete(numericId); else next.add(numericId);
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
        await deleteAdminContactMessage(confirm.item.id);
      } else if (confirm.type === "bulk-archive") {
        const ids = Array.from(selectedIds);
        const results = await Promise.allSettled(ids.map((id) => changeAdminContactStatus(id, "archive")));
        const failed = results.filter((result) => result.status === "rejected");
        if (failed.length) {
          postActionError = failed.length === ids.length
            ? "Unable to archive the selected contact messages."
            : `${ids.length - failed.length} message${ids.length - failed.length === 1 ? "" : "s"} archived, but ${failed.length} could not be archived.`;
        }
      } else {
        await changeAdminContactStatus(confirm.item.id, "archive");
      }
      setConfirm(null);
      setSelectedIds(new Set());
      await loadMessages({ page: pagination.page, refresh: true });
      if (postActionError) setError(postActionError);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, confirm.type === "delete" ? "Unable to permanently delete this message." : "Unable to archive this message."));
    } finally {
      setActionBusy(false);
    }
  };

  if (!isAdministrator) {
    return (
      <section className={styles.accessState}>
        <span><MailWarning size={22} /></span>
        <h1>Administrator access required</h1>
        <p>Contact Messages is available to Lambert Admin and Super Admin accounts.</p>
        <Link href="/dashboard/">Back to dashboard</Link>
      </section>
    );
  }

  const drawerFields = [
    { key: "status", label: "Status", options: STATUS_OPTIONS, isSearchable: false },
    { key: "subject", label: "Subject", options: subjectOptions, isSearchable: true },
    { key: "email_status", label: "Email delivery", options: EMAIL_STATUS_OPTIONS, isSearchable: false }
  ];


  const columns = [
    { key: "select", label: "Select", selection: true, track: "44px", header: <TableCheckbox checked={allSelectableSelected} indeterminate={!allSelectableSelected && someSelectableSelected} onChange={toggleSelectAll} disabled={!selectableIds.length} ariaLabel="Select all archiveable contact messages on this page" />, render: (item) => item.status !== "archived" ? <TableCheckbox checked={selectedIds.has(Number(item.id))} onChange={() => toggleSelection(item.id)} ariaLabel={`Select message from ${item.full_name}`} /> : null },
    { key: "contact", label: "Contact", identity: true, track: "minmax(205px,2fr)", render: (item) => <div className={tableStyles.identity}><span className={tableStyles.avatar} aria-hidden="true">{String(item.full_name || "?").trim().split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase() || "?"}</span><div><strong title={item.full_name}>{item.full_name}</strong><small title={item.email}>{item.email}{item.phone ? ` · ${item.phone}` : ""}</small>{item.has_cv ? <em><BriefcaseBusiness size={10} /> CV attached</em> : null}</div></div> },
    { key: "subject", label: "Subject", track: "minmax(110px,1.25fr)", render: (item) => <span className={styles.subjectCell}><strong title={item.subject?.label_en || item.subject?.key || "—"}>{item.subject?.label_en || item.subject?.key || "—"}</strong><span>{item.subject?.key || "—"}</span></span> },
    { key: "status", label: "Status", track: "minmax(90px,.8fr)", render: (item) => <StatusPill value={item.status} /> },
    { key: "delivery", label: "Email delivery", track: "minmax(105px,1fr)", highlight: true, render: (item) => <StatusPill value={item.email_delivery?.status || "pending"} label={deliveryLabel(item.email_delivery?.status)} /> },
    { key: "received", label: "Received", track: "minmax(110px,1fr)", hideTablet: true, render: (item) => <TableDate value={item.created_at} /> },
    { key: "actions", label: "Actions", track: "minmax(70px,.65fr)", align: "right", actions: true, render: (item) => <RowActions>
      <Link href={`/contacts/view/?id=${item.id}`} aria-label={`View message from ${item.full_name}`}><Eye size={15} /></Link>
      {item.status !== "archived" ? <button type="button" onClick={() => setConfirm({ type: "archive", item })} aria-label={`Archive message from ${item.full_name}`}><Archive size={15} /></button> : null}
      {isSuperAdmin && item.status === "archived" ? <button type="button" onClick={() => setConfirm({ type: "delete", item })} aria-label={`Permanently delete message from ${item.full_name}`}><Trash2 size={15} /></button> : null}
    </RowActions> }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <span className={styles.kicker}>Enquiry management</span>
          <h1>Contact Messages</h1>
          <p>Review website enquiries and job applications, track handling status, CVs and email delivery.</p>
        </div>
      </section>

      <ListSummary label="Contact message summary" items={[
      { icon: <Mail size={18} />, value: Number(pagination.total || 0).toLocaleString(), label: "Matching messages" },
      { icon: <MailWarning size={18} />, value: summary.new.toLocaleString(), label: "New messages" },
      { icon: <RefreshCw size={18} />, value: deliveryAttention.toLocaleString(), label: "Delivery attention" }
      ]} />

      {error ? <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => loadMessages({ page: pagination.page, refresh: true })}>Retry</button></div> : null}

      <DataToolbar
        search={filters.search}
        onSearchChange={(value) => setFilter("search", value)}
        searchPlaceholder="Search name, email, phone or message..."
        searchLabel="Search contact messages"
        filters={filters}
        filterFields={drawerFields}
        onOpenFilters={() => setFiltersOpen(true)}
        onFilterChange={(key, value) => setFilter(key, value)}
        onClearFilters={() => setFilters((current) => ({ ...current, status: "", subject: "", email_status: "" }))}
        onRefresh={() => loadMessages({ page: pagination.page, refresh: true })}
        refreshing={refreshing}
        action={null}
      />
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} applied={filters} fields={drawerFields} onApply={(applied) => setFilters((current) => ({ ...current, ...applied }))} />

      <DataTable label="Contact messages" columns={columns} rows={items} loading={loading} total={pagination.total} page={pagination.page} limit={pagination.limit} selectedRow={(item) => selectedIds.has(Number(item.id))} unreadRow={(item) => item.status === "new"} onRowClick={(item) => router.push(`/contacts/view/?id=${item.id}`)} emptyIcon={<Mail size={23} />} emptyTitle="No contact messages found" emptyMessage="Adjust the filters or wait for a new website enquiry." />
      <TablePagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} limit={pagination.limit} limitOptions={[12,25,50,100]} loading={loading || refreshing} onPageChange={(page) => loadMessages({ page })} onLimitChange={changePageLimit} noun="messages" />

      <BulkActionBar count={selectedCount} singular="message" onClear={() => setSelectedIds(new Set())}><button type="button" onClick={() => setConfirm({ type: "bulk-archive", count: selectedCount })}><Archive size={15} /> Archive selected</button></BulkActionBar>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === "delete" ? "Permanently delete message?" : confirm?.type === "bulk-archive" ? "Archive selected messages?" : "Archive contact message?"}
        message={confirm?.type === "delete" ? `The message from “${confirm?.item?.full_name || "this contact"}” and any attached CV will be permanently removed.` : confirm?.type === "bulk-archive" ? `${confirm?.count || selectedCount} selected message${(confirm?.count || selectedCount) === 1 ? "" : "s"} will be moved to Archived.` : `The message from “${confirm?.item?.full_name || "this contact"}” will be moved to Archived.`}
        confirmLabel={confirm?.type === "delete" ? "Delete permanently" : confirm?.type === "bulk-archive" ? "Archive selected" : "Archive message"}
        tone={confirm?.type === "delete" ? "danger" : "warning"}
        busy={actionBusy}
        onConfirm={runDestructiveAction}
        onClose={() => !actionBusy && setConfirm(null)}
      />
    </div>
  );
}
