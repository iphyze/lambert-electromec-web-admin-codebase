"use client";

import {
  ArrowLeft,
  CircleOff,
  FileText,
  FolderTree,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import MediaCategoryModal from "@/components/media/MediaCategoryModal";
import { apiErrorMessage } from "@/lib/api/client";
import {
  deactivateAdminMediaCategory,
  deleteAdminMediaCategory,
  listAdminMediaCategories,
} from "@/lib/api/mediaCenter";
import { useAuthStore } from "@/stores/authStore";
import DataToolbar from "@/components/table/DataToolbar";
import DataTable from "@/components/table/DataTable";
import ListSummary from "@/components/table/ListSummary";
import StatusPill from "@/components/table/StatusPill";
import RowActions from "@/components/table/RowActions";
import tableStyles from "@/components/table/DataTable.module.css";
import styles from "./page.module.css";

export default function MediaCategoriesPage() {
  const user = useAuthStore((state) => state.user);
  const isAdministrator = ["admin", "super_admin"].includes(user?.role);
  const isSuperAdmin = user?.role === "super_admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState({ open: false, category: null });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try { setItems(await listAdminMediaCategories()); }
    catch (requestError) { setError(apiErrorMessage(requestError, "Unable to load Media Center categories.")); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((item) => item.status === "active").length,
    resources: items.reduce((sum, item) => sum + Number(item.items_count || 0), 0),
  }), [items]);

  if (user && !isAdministrator) {
    return (
      <section className={styles.accessDenied}>
        <span><ShieldCheck size={22} /></span>
        <h1>Administrator access required</h1>
        <p>Media Center categories can only be managed by Admin and Super Admin accounts.</p>
        <Link href="/media-center/"><ArrowLeft size={14} /> Back to Media Center</Link>
      </section>
    );
  }

  const destructive = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    setError("");
    try {
      if (confirm.type === "delete") await deleteAdminMediaCategory(confirm.item.id);
      else await deactivateAdminMediaCategory(confirm.item.id);
      setConfirm(null);
      await load({ refresh: true });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, confirm.type === "delete" ? "Unable to delete the category." : "Unable to deactivate the category."));
    } finally { setBusy(false); }
  };


  const columns = [
    { key: "category", label: "Category", identity: true, track: "minmax(230px,2fr)", render: (item) => <div className={tableStyles.identity}><span className={tableStyles.iconTile}><FolderTree size={18} /></span><div><strong title={item.name_en}>{item.name_en}</strong><small title={`${item.name_fr || ""} · /${item.slug}`}>{item.name_fr || "—"} · /{item.slug}</small></div></div> },
    { key: "status", label: "Status", track: "minmax(90px,.9fr)", render: (item) => <StatusPill value={item.status} /> },
    { key: "resources", label: "Resources", track: "minmax(90px,.75fr)", highlight: true, numeric: true, render: (item) => Number(item.items_count || 0) },
    { key: "published", label: "Published", track: "minmax(90px,.75fr)", numeric: true, render: (item) => Number(item.published_items_count || 0) },
    { key: "order", label: "Order", track: "minmax(80px,.6fr)", hideTablet: true, numeric: true, render: (item) => Number(item.display_order || 0) },
    { key: "actions", label: "Actions", track: "minmax(105px,.9fr)", actions: true, align: "right", render: (item) => <RowActions>
      <button type="button" onClick={() => setModal({ open: true, category: item })} aria-label={`Edit ${item.name_en}`} title="Edit category"><Pencil size={15} /></button>
      {item.status === "active" ? <button type="button" onClick={() => setConfirm({ type: "deactivate", item })} aria-label={`Deactivate ${item.name_en}`} title="Deactivate category"><CircleOff size={15} /></button> : null}
      {isSuperAdmin && Number(item.items_count || 0) === 0 ? <button type="button" onClick={() => setConfirm({ type: "delete", item })} aria-label={`Permanently delete ${item.name_en}`}><Trash2 size={15} /></button> : null}
    </RowActions> }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div><Link className={styles.backLink} href="/media-center/"><ArrowLeft size={14} /> Media Center</Link><span className={styles.kicker}>Media taxonomy</span><h1>Media categories</h1><p>Manage the bilingual categories used to organise Lambert’s public Media Center.</p></div>
        
      </section>

      <ListSummary label="Media category summary" items={[
      { icon: <FolderTree size={18} />, value: stats.total, label: "Total categories" },
      { icon: <FolderTree size={18} />, value: stats.active, label: "Active categories" },
      { icon: <FileText size={18} />, value: stats.resources, label: "Assigned resources" }
      ]} />

      {error ? <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => load({ refresh: true })}>Retry</button></div> : null}

      <DataToolbar title="Categories" description="Active categories can be assigned to Media Center resources." summary={`${stats.total} total`} onRefresh={() => load({ refresh: true })} refreshing={refreshing} action={<button type="button" onClick={() => setModal({ open: true, category: null })}><Plus size={16} /> New category</button>} />

      <DataTable label="Media categories" columns={columns} rows={items} loading={loading} total={items.length} emptyIcon={<FolderTree size={23} />} emptyTitle="No Media Center categories" emptyMessage="Create the first category to start organising public resources." />

      <div className={styles.note}><strong>Safe category management</strong><span>Categories that already contain Media Center resources cannot be permanently deleted. Deactivate them instead to preserve historical links and existing records.</span></div>

      <MediaCategoryModal open={modal.open} category={modal.category} onClose={() => setModal({ open: false, category: null })} onSaved={() => load({ refresh: true })} />
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.type === "delete" ? "Permanently delete category?" : "Deactivate category?"} message={confirm?.type === "delete" ? `“${confirm?.item?.name_en || "This category"}” will be permanently removed.` : `“${confirm?.item?.name_en || "This category"}” will no longer be available for new Media Center assignments or public filters. Existing records remain linked.`} confirmLabel={confirm?.type === "delete" ? "Delete permanently" : "Deactivate"} tone={confirm?.type === "delete" ? "danger" : "warning"} busy={busy} onConfirm={destructive} onClose={() => !busy && setConfirm(null)} />
    </div>
  );
}
