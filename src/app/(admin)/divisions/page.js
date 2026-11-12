"use client";

import { CircleOff, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DivisionModal from "@/components/divisions/DivisionModal";
import { apiErrorMessage } from "@/lib/api/client";
import { deactivateAdminDivision, deleteAdminDivision, listAdminDivisions } from "@/lib/api/divisions";
import { useAuthStore } from "@/stores/authStore";
import DataToolbar from "@/components/table/DataToolbar";
import DataTable from "@/components/table/DataTable";
import ListSummary from "@/components/table/ListSummary";
import StatusPill from "@/components/table/StatusPill";
import RowActions from "@/components/table/RowActions";
import tableStyles from "@/components/table/DataTable.module.css";
import styles from "./page.module.css";

export default function DivisionsPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "super_admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ open: false, division: null });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ refresh = false, signal } = {}) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try { setItems(await listAdminDivisions({ signal })); }
    catch (requestError) {
      if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") return;
      setError(apiErrorMessage(requestError, "Unable to load divisions."));
    } finally { if (!signal?.aborted) { setLoading(false); setRefreshing(false); } }
  }, []);

  useEffect(() => { const controller = new AbortController(); load({ signal: controller.signal }); return () => controller.abort(); }, [load]);
  const stats = useMemo(() => ({ active: items.filter((item) => item.status === "active").length, inactive: items.filter((item) => item.status === "inactive").length, projects: items.reduce((sum, item) => sum + Number(item.projects_count || 0), 0) }), [items]);

  const destructive = async () => {
    if (!confirm || busy) return;
    setBusy(true); setError("");
    try {
      if (confirm.type === "delete") await deleteAdminDivision(confirm.item.id); else await deactivateAdminDivision(confirm.item.id);
      setConfirm(null); await load({ refresh: true });
    } catch (requestError) { setError(apiErrorMessage(requestError, confirm.type === "delete" ? "Unable to delete the division." : "Unable to deactivate the division.")); }
    finally { setBusy(false); }
  };


  const columns = [
    { key: "division", label: "Division", identity: true, track: "minmax(220px,2.1fr)", render: (item) => <div className={tableStyles.identity}><span className={tableStyles.iconTile}><FolderTree size={18} /></span><div><strong title={item.name_en}>{item.name_en}</strong><small title={item.name_fr}>{item.name_fr || "—"}</small></div></div> },
    { key: "key", label: "Key / slug", track: "minmax(115px,1.15fr)", render: (item) => <div className={styles.keyCell}><code title={item.division_key}>{item.division_key}</code><span title={`/${item.slug}/`}>/{item.slug}/</span></div> },
    { key: "status", label: "Status", track: "minmax(86px,.8fr)", render: (item) => <StatusPill value={item.status} /> },
    { key: "projects", label: "Projects", track: "minmax(90px,.8fr)", highlight: true, numeric: true, render: (item) => <div className={styles.projectCount}><strong>{Number(item.projects_count || 0)}</strong><span>{Number(item.published_projects_count || 0)} published</span></div> },
    { key: "order", label: "Order", track: "minmax(75px,.55fr)", hideTablet: true, numeric: true, render: (item) => Number(item.display_order || 0) },
    { key: "actions", label: "Actions", track: "minmax(115px,1fr)", align: "right", actions: true, render: (item) => <RowActions>
      <button type="button" onClick={() => setModal({ open: true, division: item })} aria-label={`Edit ${item.name_en}`} title="Edit division"><Pencil size={15} /></button>
      {item.status === "active" ? <button type="button" onClick={() => setConfirm({ type: "deactivate", item })} aria-label={`Deactivate ${item.name_en}`} title="Deactivate division"><CircleOff size={15} /></button> : null}
      {isSuperAdmin && Number(item.projects_count || 0) === 0 ? <button type="button" onClick={() => setConfirm({ type: "delete", item })} aria-label={`Permanently delete ${item.name_en}`}><Trash2 size={15} /></button> : null}
    </RowActions> }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div><span className={styles.kicker}>Project taxonomy</span><h1>Divisions</h1><p>Manage the divisions available for Lambert projects and leave room for new business divisions in future.</p></div>
        
      </section>

      <ListSummary label="Division summary" items={[
      { icon: <FolderTree size={18} />, value: items.length, label: "Total divisions" },
      { icon: <FolderTree size={18} />, value: stats.active, label: "Active divisions" },
      { icon: <FolderTree size={18} />, value: stats.projects, label: "Projects assigned" }
      ]} />

      {error ? <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => load({ refresh: true })}>Retry</button></div> : null}

      <DataToolbar title="Division registry" description="Division keys are permanent identifiers; names, slugs, order and active status can be managed here." summary={`${stats.inactive} inactive`} onRefresh={() => load({ refresh: true })} refreshing={refreshing} action={<button type="button" onClick={() => setModal({ open: true, division: null })}><Plus size={16} /> Add division</button>} />

      <DataTable label="Division registry" columns={columns} rows={items} loading={loading} total={items.length} emptyIcon={<FolderTree size={23} />} emptyTitle="No divisions found" emptyMessage="Create a division to begin classifying projects." />

      <div className={styles.futureNote}><strong>Designed for future divisions</strong><span>A new division created here becomes available to the project editor and public project-division API automatically. The current public Divisions microsite sections can remain bespoke until Lambert supplies content/design for a future division.</span></div>

      <DivisionModal open={modal.open} division={modal.division} onClose={() => setModal({ open: false, division: null })} onSaved={() => load({ refresh: true })} />
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.type === "delete" ? "Permanently delete division?" : "Deactivate division?"} message={confirm?.type === "delete" ? `“${confirm?.item?.name_en || "This division"}” will be permanently removed. This is only allowed because no projects use it.` : `“${confirm?.item?.name_en || "This division"}” will no longer be available for new project assignments or public filters. Existing project records remain linked.`} confirmLabel={confirm?.type === "delete" ? "Delete permanently" : "Deactivate"} tone={confirm?.type === "delete" ? "danger" : "warning"} busy={busy} onConfirm={destructive} onClose={() => !busy && setConfirm(null)} />
    </div>
  );
}
