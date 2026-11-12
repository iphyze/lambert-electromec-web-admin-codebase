"use client";

import {
  KeyRound,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdministratorModal, { AdministratorPasswordModal } from "@/components/administrators/AdministratorModal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import TablePagination from "@/components/table/TablePagination";
import { apiErrorMessage } from "@/lib/api/client";
import { listAdministrators, revokeAdministratorSessions } from "@/lib/api/administrators";
import { useAuthStore } from "@/stores/authStore";
import DataToolbar from "@/components/table/DataToolbar";
import DataTable from "@/components/table/DataTable";
import ListSummary from "@/components/table/ListSummary";
import FilterDrawer from "@/components/table/FilterDrawer";
import StatusPill from "@/components/table/StatusPill";
import RowActions from "@/components/table/RowActions";
import TableDate from "@/components/table/TableDate";
import tableStyles from "@/components/table/DataTable.module.css";
import styles from "./page.module.css";

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Disabled" },
];

function roleLabel(role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Editor";
}

function initials(item) {
  return `${item?.first_name?.[0] || ""}${item?.last_name?.[0] || ""}`.toUpperCase() || "A";
}

export default function AdministratorsPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "super_admin";
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, super_admins: 0, restricted: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({ role: "", status: "", search: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState({ open: false, item: null });
  const [passwordReset, setPasswordReset] = useState({ open: false, item: null });
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const loadAdministrators = useCallback(async ({ page = 1, refresh = false, signal } = {}) => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await listAdministrators(
        {
          page,
          limit: pagination.limit,
          role: filters.role || undefined,
          status: filters.status || undefined,
          search: debouncedSearch || undefined,
        },
        { signal },
      );
      setItems(response.items);
      setSummary(response.summary);
      setPagination(response.pagination);
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") return;
      setError(apiErrorMessage(requestError, "Unable to load administrators."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, filters.role, filters.status, isSuperAdmin, pagination.limit]);

  useEffect(() => {
    const controller = new AbortController();
    loadAdministrators({ page: 1, signal: controller.signal });
    return () => controller.abort();
  }, [loadAdministrators]);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const changePageLimit = (limit) => {
    if (!Number.isFinite(limit) || limit < 1 || limit === pagination.limit) return;
    setPagination((current) => ({ ...current, page: 1, limit }));
  };

  const refreshAfterSave = async () => {
    setNotice("");
    await loadAdministrators({ page: pagination.page, refresh: true });
  };

  const revokeSessions = async () => {
    if (!confirm?.item || actionBusy) return;
    setActionBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await revokeAdministratorSessions(confirm.item.id);
      setNotice(message);
      setConfirm(null);
      await loadAdministrators({ page: pagination.page, refresh: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to revoke administrator sessions."));
    } finally {
      setActionBusy(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className={styles.restricted}>
        <span><ShieldCheck size={22} /></span>
        <h1>Super Admin access required</h1>
        <p>Administrator account management is restricted to Lambert Super Admin users.</p>
      </div>
    );
  }

  const drawerFields = [
    { key: "role", label: "Role", options: ROLE_OPTIONS, isSearchable: false },
    { key: "status", label: "Status", options: STATUS_OPTIONS, isSearchable: false }
  ];


  const columns = [
    { key: "administrator", label: "Administrator", identity: true, track: "minmax(235px,2.3fr)", render: (item) => <div className={tableStyles.identity}><span className={tableStyles.avatar} data-role={item.role} aria-hidden="true">{initials(item)}</span><div><strong title={`${item.first_name} ${item.last_name}`}>{item.first_name} {item.last_name} {Number(item.id) === Number(user?.id) ? <em>You</em> : null}</strong><small title={item.email}>{item.email}</small></div></div> },
    { key: "role", label: "Role", track: "minmax(90px,.8fr)", render: (item) => <StatusPill value={item.role} label={roleLabel(item.role)} /> },
    { key: "status", label: "Status", track: "minmax(93px,.8fr)", render: (item) => <StatusPill value={item.status} /> },
    { key: "last", label: "Last sign in", highlight: true, track: "minmax(125px,1fr)", render: (item) => <TableDate value={item.last_login_at} /> },
    { key: "updated", label: "Updated", hideTablet: true, track: "minmax(110px,.9fr)", render: (item) => <TableDate value={item.updated_at} /> },
    { key: "actions", label: "Actions", actions: true, align: "right", track: "minmax(94px,.85fr)", render: (item) => <RowActions>
      <button type="button" onClick={() => setEditor({ open: true, item })} aria-label={`Edit ${item.first_name} ${item.last_name}`} title="Edit administrator"><Pencil size={15} /></button>
      <button type="button" onClick={() => setPasswordReset({ open: true, item })} disabled={Number(item.id) === Number(user?.id)} aria-label={`Reset password for ${item.first_name} ${item.last_name}`} title="Reset password"><KeyRound size={15} /></button>
      <button type="button" onClick={() => setConfirm({ item })} disabled={Number(item.id) === Number(user?.id)} aria-label={`Revoke sessions for ${item.first_name} ${item.last_name}`} title="Revoke sessions"><LogOut size={15} /></button>
    </RowActions> }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <span className={styles.kicker}>Access management</span>
          <h1>Administrators</h1>
          <p>Manage Lambert CMS users, permissions, account availability and authenticated sessions.</p>
        </div>

      </section>

      <ListSummary label="Administrator summary" items={[
      { icon: <Users size={18} />, value: summary.total.toLocaleString(), label: "Total administrators" },
      { icon: <UserCheck size={18} />, value: summary.active.toLocaleString(), label: "Active accounts" },
      { icon: <ShieldCheck size={18} />, value: summary.super_admins.toLocaleString(), label: "Super Admin accounts" },
      { icon: <UserX size={18} />, value: summary.restricted.toLocaleString(), label: "Suspended or disabled" }
      ]} />

      {error ? (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => loadAdministrators({ page: pagination.page, refresh: true })}>Retry</button>
        </div>
      ) : null}
      {notice ? <div className={styles.noticeBanner} role="status">{notice}</div> : null}

      <DataToolbar
        search={filters.search}
        onSearchChange={(value) => setFilter("search", value)}
        searchPlaceholder="Search name or email..."
        searchLabel="Search administrators"
        filters={filters}
        filterFields={drawerFields}
        onOpenFilters={() => setFiltersOpen(true)}
        onFilterChange={(key, value) => setFilter(key, value)}
        onClearFilters={() => setFilters((current) => ({ ...current, role: "", status: "" }))}
        onRefresh={() => loadAdministrators({ page: pagination.page, refresh: true })}
        refreshing={refreshing}
        action={<button type="button" onClick={() => setEditor({ open: true, item: null })}><Plus size={16} /> New administrator</button>}
      />
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} applied={filters} fields={drawerFields} onApply={(applied) => setFilters((current) => ({ ...current, ...applied }))} />

      <DataTable label="Administrators" columns={columns} rows={items} loading={loading} total={pagination.total} page={pagination.page} limit={pagination.limit} emptyIcon={<Users size={23} />} emptyTitle="No administrators found" emptyMessage="Try another filter or create a new administrator." />
      <TablePagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} limit={pagination.limit} limitOptions={[12,25,50,100]} loading={loading || refreshing} onPageChange={(page) => loadAdministrators({ page })} onLimitChange={changePageLimit} noun="administrators" />

      <AdministratorModal
        open={editor.open}
        administrator={editor.item}
        currentUserId={user?.id}
        onClose={() => setEditor({ open: false, item: null })}
        onSaved={refreshAfterSave}
      />

      <AdministratorPasswordModal
        open={passwordReset.open}
        administrator={passwordReset.item}
        onClose={() => setPasswordReset({ open: false, item: null })}
        onReset={refreshAfterSave}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Revoke administrator sessions?"
        message={confirm?.item ? `All existing sessions for ${confirm.item.first_name} ${confirm.item.last_name} will be invalidated. They will need to sign in again.` : ""}
        confirmLabel="Revoke sessions"
        tone="danger"
        busy={actionBusy}
        onClose={() => !actionBusy && setConfirm(null)}
        onConfirm={revokeSessions}
      />
    </div>
  );
}
