"use client";

import {
  CheckCircle2,
  Mail,
  MailWarning,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import EmailRoutingModal from "@/components/contacts/EmailRoutingModal";
import { apiErrorMessage } from "@/lib/api/client";
import { listAdminContactSubjects } from "@/lib/api/contacts";
import { useAuthStore } from "@/stores/authStore";
import DataToolbar from "@/components/table/DataToolbar";
import DataTable from "@/components/table/DataTable";
import ListSummary from "@/components/table/ListSummary";
import StatusPill from "@/components/table/StatusPill";
import RowActions from "@/components/table/RowActions";
import tableStyles from "@/components/table/DataTable.module.css";
import styles from "./page.module.css";

function EmailList({ emails = [], emptyLabel = "Not configured" }) {
  if (!emails.length) return <span className={styles.unconfigured}>{emptyLabel}</span>;
  const shown = emails.slice(0, 1);
  const remaining = emails.length - shown.length;
  return (
    <div className={styles.emailList}>
      {shown.map((email) => <span key={email} title={email}>{email}</span>)}
      {remaining > 0 ? <small>+{remaining} more</small> : null}
    </div>
  );
}

export default function EmailRoutingPage() {
  const user = useAuthStore((state) => state.user);
  const isAdministrator = ["admin", "super_admin"].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (!isAdministrator) {
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      setItems(await listAdminContactSubjects());
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load contact email routing."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdministrator]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const activeItems = items.filter((item) => item.status === "active");
    const configured = activeItems.filter((item) => (item.recipient_emails || []).length > 0).length;
    return { total: items.length, configured, active: activeItems.length, unconfigured: Math.max(0, activeItems.length - configured) };
  }, [items]);

  if (user && !isAdministrator) {
    return (
      <section className={styles.accessDenied}>
        <span><ShieldCheck size={22} /></span>
        <h1>Administrator access required</h1>
        <p>Email Routing can only be managed by Lambert Admin and Super Admin accounts.</p>
        <Link href="/dashboard/">Back to dashboard</Link>
      </section>
    );
  }


  const columns = [
    { key: "type", label: "Enquiry type", identity: true, track: "minmax(215px,2.1fr)", render: (item) => <div className={tableStyles.identity}><span className={tableStyles.iconTile}><Mail size={18} /></span><div><strong title={item.label_en || item.subject_key}>{item.label_en || item.subject_key}</strong><small title={item.label_fr || "—"}>{item.label_fr || "—"} · {item.subject_key}</small></div></div> },
    { key: "status", label: "Status", track: "minmax(90px,.85fr)", render: (item) => <StatusPill value={item.status} /> },
    { key: "recipients", label: "Primary recipients", highlight: true, track: "minmax(155px,1.5fr)", render: (item) => <EmailList emails={item.recipient_emails} /> },
    { key: "cc", label: "CC", track: "minmax(135px,1.2fr)", render: (item) => <EmailList emails={item.cc_emails} emptyLabel="No CC" /> },
    { key: "order", label: "Order", hideTablet: true, numeric: true, track: "minmax(70px,.6fr)", render: (item) => Number(item.display_order || 0) },
    { key: "actions", label: "Actions", actions: true, align: "right", track: "minmax(75px,.6fr)", render: (item) => <RowActions><button type="button" onClick={() => setEditing(item)} aria-label={`Edit routing for ${item.label_en || item.subject_key}`} title="Edit routing"><Pencil size={15} /></button></RowActions> }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <span className={styles.kicker}>Contact configuration</span>
          <h1>Email Routing</h1>
          <p>Control which Lambert inboxes receive each public website enquiry type without exposing destination addresses to the frontend.</p>
        </div>
      </section>

      <ListSummary label="Email routing summary" items={[
      { icon: <Mail size={18} />, value: stats.total, label: "Enquiry types" },
      { icon: <CheckCircle2 size={18} />, value: stats.configured, label: "Configured routes" },
      { icon: <MailWarning size={18} />, value: stats.unconfigured, label: "Need routing setup" }
      ]} />

      {error ? <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => load({ refresh: true })}>Retry</button></div> : null}

      <DataToolbar title="Subject routing" description={`${stats.active} active public subject${stats.active === 1 ? "" : "s"}. Labels and subject keys remain system-managed.`} summary={`${stats.unconfigured} need setup`} onRefresh={() => load({ refresh: true })} refreshing={refreshing} />

      <DataTable label="Subject routing" rowKey="subject_key" columns={columns} rows={items} loading={loading} total={items.length} emptyIcon={<Mail size={23} />} emptyTitle="No contact subjects found" emptyMessage="The backend did not return any contact routing records." />

      <div className={styles.note}>
        <ShieldCheck size={16} />
        <div><strong>Server-controlled routing</strong><span>Public contact forms submit a stable subject key only. Recipient and CC addresses are resolved from the backend database and are never supplied by the public frontend.</span></div>
      </div>

      <EmailRoutingModal
        open={Boolean(editing)}
        route={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          if (!updated) return;
          setItems((current) => current.map((item) => item.subject_key === updated.subject_key ? updated : item));
        }}
      />
    </div>
  );
}
