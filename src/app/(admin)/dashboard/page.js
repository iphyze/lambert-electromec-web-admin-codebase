"use client";

import Link from "next/link";
import {
  Activity, ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2,
  FilePlus2, Files, FolderTree, Mail, RefreshCw, Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { getAnalyticsSummary } from "@/lib/api/analytics";
import { listAdminContactMessages } from "@/lib/api/contacts";
import { listAdminFacilityProjects } from "@/lib/api/facilityProjects";
import { useAuthStore } from "@/stores/authStore";
import styles from "./page.module.css";

const nf = new Intl.NumberFormat();
const SOURCE_NAMES = { search: "Search", social: "Social", direct: "Direct", referral: "Other websites", internal: "Other websites", campaign: "Campaigns" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ACTION_NAMES = {
  "project.created": "Project created", "project.updated": "Project updated", "project.publish": "Project published",
  "project.unpublish": "Project unpublished", "project.archive": "Project archived", "project.archived": "Project archived",
  "project.restore": "Project restored", "project.deleted": "Project deleted", "project.images_uploaded": "Images uploaded",
  "project.image_updated": "Project image updated", "project.image_deleted": "Project image deleted",
  "project.images_reordered": "Images reordered", "media_item.created": "Media item created",
  "media_item.updated": "Media item updated", "media_item.publish": "Media item published",
  "media_item.unpublish": "Media item unpublished", "media_item.archive": "Media item archived",
  "media_item.archived": "Media item archived", "media_item.restore": "Media item restored",
  "media_item.deleted": "Media item deleted", "media_item.file_replaced": "Media file replaced",
  "division.created": "Division created", "division.updated": "Division updated",
  "division.deactivated": "Division deactivated", "division.deleted": "Division deleted",
  "media_category.created": "Category created", "media_category.updated": "Category updated",
  "media_category.deactivated": "Category deactivated", "media_category.deleted": "Category deleted",
  "contact.read": "Enquiry read", "contact.replied": "Enquiry replied", "contact.archive": "Enquiry archived",
  "contact.restore": "Enquiry restored", "contact.deleted": "Enquiry deleted",
  "contact.email.retry": "Email delivery retried", "contact.routing.updated": "Email routing updated",
  "auth.login": "Signed in",
};

function number(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, n) : 0; }
function fmt(value) { return nf.format(number(value)); }
function percent(numerator, denominator) { return denominator > 0 ? Math.min(100, Math.max(0, (number(numerator) / number(denominator)) * 100)) : 0; }
function ymd(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dateRange(days) { const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - days + 1); return { from: ymd(start), to: ymd(end), compare: true }; }
function localDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}
function relativeTime(value) {
  const date = localDate(value);
  if (!date) return "—";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const [count, unit] = abs < 60 ? [seconds, "second"] : abs < 3600 ? [Math.round(seconds / 60), "minute"] : abs < 86400 ? [Math.round(seconds / 3600), "hour"] : [Math.round(seconds / 86400), "day"];
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" }).format(count, unit);
}
function clockTime(value) { const date = localDate(value); return date ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) : "—"; }
function actionLabel(item) { return ACTION_NAMES[item?.action] || String(item?.action || "Activity").replace(/[._]/g, " ").replace(/^./, (c) => c.toUpperCase()); }
function actionTone(item) {
  const action = String(item?.action || "").toLowerCase();
  if (/delet|deactivat/.test(action)) return "red";
  if (/contact|routing|email/.test(action)) return "amber";
  if (/updat|replac|reorder|read|restore/.test(action)) return "blue";
  return "green";
}
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"; }
function initials(name) { return String(name || "?").trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() || "").join("") || "?"; }
function seriesLabel(value, index, length) {
  if (length <= 7) return String(value || "").slice(0, 12);
  const parsed = localDate(value);
  return parsed ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(parsed) : String(value || index + 1).slice(0, 7);
}
function smoothLine(values, x, y) {
  if (!values.length) return "";
  if (values.length === 1) return `M${x(0)},${y(values[0])}`;
  let path = `M${x(0)},${y(values[0])}`;
  for (let i = 1; i < values.length; i += 1) {
    const midX = (x(i - 1) + x(i)) / 2;
    const midY = (y(values[i - 1]) + y(values[i])) / 2;
    path += ` Q${x(i - 1)},${y(values[i - 1])} ${midX},${midY}`;
  }
  return `${path} T${x(values.length - 1)},${y(values[values.length - 1])}`;
}
function Panel({ title, action, children, className = "", label }) {
  return <article className={`${styles.card} ${className}`} aria-label={label || title}>
    <div className={styles.cardHead}><h2>{title}</h2>{action || <span className={styles.cardMark} aria-hidden="true" />}</div>
    <div className={styles.cardContent}>{children}</div>
  </article>;
}
function PillLink({ href, children }) { return <Link className={styles.pillLink} href={href}>{children}<ArrowUpRight size={12} aria-hidden="true" /></Link>; }
function CardSkeleton({ size = "default" }) { return <div className={`${styles.skeletonCard} ${size === "tall" ? styles.skeletonTall : ""}`} aria-label="Loading widget" aria-busy="true"><span className={styles.skeletonLine} /><span className={styles.skeletonValue} /><span className={styles.skeletonChart} /></div>; }
function WidgetError({ message, retry }) { return <div className={styles.widgetError} role="alert"><strong>Unable to load this widget.</strong><span>{message}</span><button type="button" onClick={retry}>Retry</button></div>; }
function Empty({ children }) { return <div className={styles.emptyState}><Activity size={18} aria-hidden="true" /><span>{children}</span></div>; }
function HiddenTable({ caption, headings, rows }) { return <table className={styles.srOnly}><caption>{caption}</caption><thead><tr>{headings.map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${index}-${row[0]}`}>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}</tbody></table>; }
function Status({ state, retry, children, size }) {
  if (state.loading && !state.data) return <CardSkeleton size={size} />;
  if (state.error && !state.data) return <WidgetError message={state.error} retry={retry} />;
  if (!state.data) return <Empty>No information has been recorded yet.</Empty>;
  return <>{state.error && <div className={styles.staleWarning} role="alert">Refresh failed. Showing earlier data. <button type="button" onClick={retry}>Retry</button></div>}{children}</>;
}

function VisitorsCard({ state, retry }) {
  const totals = state.data?.totals;
  const change = state.data?.changes?.visitors;
  const hasChange = change !== null && change !== undefined && Number.isFinite(Number(change));
  return <Panel title="Website visitors" action={<span className={styles.subtlePill}>Visitors</span>}>
    <Status state={state} retry={retry}>
      {totals && (number(totals.visitors) || number(totals.visits) || number(totals.pageviews)) ? <>
        <div className={styles.heroNumberRow}><strong className={styles.bigValue}>{fmt(totals.visitors)}</strong>{hasChange && <span className={`${styles.changePill} ${Number(change) < 0 ? styles.negative : Number(change) > 0 ? styles.positive : styles.neutral}`}>{Number(change) > 0 ? "+" : ""}{Number(change).toFixed(1)}%</span>}</div>
        <p className={styles.metricFoot}>{fmt(totals.pageviews)} page views · {fmt(totals.visits)} visits</p>
      </> : <Empty>No visits recorded yet — statistics appear once the website tracker is live.</Empty>}
      <Link href="/analytics" className={styles.fullAction}>View statistics <ArrowUpRight size={15} /></Link>
    </Status>
  </Panel>;
}

function TrafficTrend({ points }) {
  const [active, setActive] = useState(null);
  const list = Array.isArray(points) ? points : [];
  const visitors = list.map((p) => number(p.visitors));
  const views = list.map((p) => number(p.pageviews));
  const max = Math.max(1, ...visitors, ...views);
  const w = 520, h = 224, left = 36, right = 12, top = 28, bottom = 186;
  const x = (i) => left + (list.length === 1 ? (w - left - right) / 2 : i / Math.max(1, list.length - 1) * (w - left - right));
  const y = (value) => bottom - number(value) / max * (bottom - top);
  const visitorPath = smoothLine(visitors, x, y);
  const viewsPath = smoothLine(views, x, y);
  const area = list.length ? `${visitorPath} L${x(list.length - 1)},${bottom} L${x(0)},${bottom} Z` : "";
  const peak = visitors.indexOf(Math.max(...visitors, 0));
  const chosen = active !== null ? active : peak;
  const interval = Math.max(1, Math.ceil(list.length / 6));
  return <div className={styles.chartFrame}>
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.svgChart} role="img" aria-label={`Daily visitors and page views. Maximum ${fmt(max)}. Busiest day: ${list[peak]?.label || "not available"}, ${fmt(visitors[peak])} visitors.`}>
      {[0, 1, 2, 3].map((i) => <g key={i}><line x1={left} x2={w - right} y1={y(max * i / 3)} y2={y(max * i / 3)} className={styles.gridLine} /><text x={left - 7} y={y(max * i / 3) + 3} textAnchor="end" className={styles.axisText}>{fmt(Math.round(max * i / 3))}</text></g>)}
      <path d={area} className={styles.trendArea} />
      <path d={viewsPath} className={styles.dashedLine} />
      <path d={visitorPath} className={styles.trendLine} />
      {list.map((p, i) => (i % interval === 0 || i === list.length - 1) && <text key={`label-${i}`} x={x(i)} y={h - 12} textAnchor="middle" className={styles.axisText}>{seriesLabel(p.label || p.key, i, list.length)}</text>)}
      {list.map((point, i) => <rect key={`hit-${i}`} x={x(i) - (w - left - right) / Math.max(2, list.length) / 2} y={top} width={(w - left - right) / Math.max(2, list.length)} height={bottom - top} fill="transparent" tabIndex={0} aria-label={`${point.label || point.key}: ${fmt(point.visitors)} visitors, ${fmt(point.pageviews)} page views`} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />)}
      {list.length > 0 && chosen >= 0 && <g className={styles.peakMark}><circle cx={x(chosen)} cy={y(visitors[chosen])} r="5" className={styles.chartDot} /><rect x={Math.max(6, Math.min(w - 82, x(chosen) - 38))} y={Math.max(2, y(visitors[chosen]) - 31)} width="76" height="22" rx="9" className={styles.valueBubble} /><text x={Math.max(6, Math.min(w - 82, x(chosen) - 38)) + 38} y={Math.max(2, y(visitors[chosen]) - 31) + 15} textAnchor="middle" className={styles.bubbleText}>{fmt(visitors[chosen])}</text></g>}
    </svg>
    <div className={styles.chartLegend}><span className={styles.legendVisitors} /> Visitors <span className={styles.legendViews} /> Page views</div>
    <HiddenTable caption="Daily traffic trend" headings={["Day", "Visitors", "Page views"]} rows={list.map((p) => [p.label || p.key, fmt(p.visitors), fmt(p.pageviews)])} />
  </div>;
}
function TrafficTrendCard({ state, retry }) {
  const points = state.data?.timeseries?.points || [];
  return <Panel title="Traffic trend" action={<PillLink href="/analytics">View</PillLink>}>
    <Status state={state} retry={retry} size="tall">{points.length && points.some((p) => number(p.visitors) || number(p.pageviews)) ? <TrafficTrend points={points} /> : <Empty>No daily traffic data for this period.</Empty>}</Status>
  </Panel>;
}

function sourceRows(items) {
  const grouped = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const label = SOURCE_NAMES[String(item?.value || "").toLowerCase()] || "Other websites";
    grouped.set(label, number(grouped.get(label)) + number(item?.visits));
  });
  return ["Search", "Social", "Direct", "Other websites", "Campaigns"].map((label) => ({ label, count: grouped.get(label) || 0 })).filter((row) => row.count > 0);
}
function SourcesGraphic({ rows }) {
  const [active, setActive] = useState(null);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  let offset = 0;
  const segments = rows.map((row, index) => { const width = row.count / total * 480; const entry = { ...row, index, x: offset, width, pct: row.count / total * 100 }; offset += width; return entry; });
  const largest = [...segments].sort((a, b) => b.count - a.count).slice(0, 2);
  return <>
    <div className={styles.sourcesGraphic}>
      <svg viewBox="0 0 500 100" className={styles.svgChart} role="img" aria-label={`Traffic sources: ${rows.map((row) => `${row.label} ${Math.round(percent(row.count, total))}%`).join(", ")}`}>
        <rect x="10" y="48" width="480" height="26" rx="10" className={styles.sourceTrack} />
        <clipPath id="lambertSourcesClip"><rect x="10" y="48" width="480" height="26" rx="10" /></clipPath>
        <g clipPath="url(#lambertSourcesClip)">{segments.map((s) => <rect key={s.label} x={10 + s.x} y="48" width={s.width} height="26" className={styles[`sourceTone${s.index % 5}`]} tabIndex={0} role="button" aria-label={`${s.label}: ${fmt(s.count)} visits, ${s.pct.toFixed(1)} percent`} onFocus={() => setActive(s.index)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(s.index)} onMouseLeave={() => setActive(null)}><title>{`${s.label}: ${fmt(s.count)} visits (${s.pct.toFixed(1)}%)`}</title></rect>)}</g>
        {largest.map((s, i) => { const boxX = Math.max(10, Math.min(438, 10 + s.x + s.width / 2 - 26)); return <g key={`top-${s.label}`}><rect x={boxX} y={i === 0 ? 8 : 28} width="52" height="18" rx="9" className={styles.valueBubble} /><text x={boxX + 26} y={(i === 0 ? 8 : 28) + 12.5} textAnchor="middle" className={styles.bubbleText}>{s.pct.toFixed(0)}%</text></g>; })}
      </svg>
      {active !== null && segments[active] && <div className={styles.chartNote} role="status">{segments[active].label}: {fmt(segments[active].count)} visits</div>}
    </div>
    <div className={styles.sourceLegend}>{segments.map((s) => <div key={s.label}><i className={styles[`sourceDot${s.index % 5}`]} /><span>{s.label}</span><strong>{s.pct.toFixed(0)}%</strong></div>)}</div>
    <HiddenTable caption="Visits by source" headings={["Source", "Visits", "Percent"]} rows={segments.map((s) => [s.label, fmt(s.count), `${s.pct.toFixed(1)}%`])} />
  </>;
}
function TrafficSourcesCard({ state, retry }) {
  const rows = sourceRows(state.data?.sources);
  return <Panel title="Traffic sources" action={<span className={styles.subtlePill}>By visit</span>}>
    <Status state={state} retry={retry}>{rows.length ? <SourcesGraphic rows={rows} /> : <Empty>Traffic sources will appear when visits are recorded.</Empty>}</Status>
  </Panel>;
}

function DailyBars({ points }) {
  const [active, setActive] = useState(null);
  const list = Array.isArray(points) ? points : [];
  const values = list.map((p) => number(p.pageviews));
  const max = Math.max(1, ...values);
  const highest = values.indexOf(Math.max(...values, 0));
  const w = 520, top = 30, bottom = 184, left = 30, right = 12;
  const cell = (w - left - right) / Math.max(1, list.length);
  const barWidth = Math.min(28, cell * .62);
  const interval = Math.max(1, Math.ceil(list.length / 7));
  const chosen = active === null ? highest : active;
  return <div className={styles.chartFrame}>
    <svg viewBox="0 0 520 224" className={styles.svgChart} role="img" aria-label={`Page views by day. Maximum ${fmt(max)} views on ${list[highest]?.label || "an unknown day"}.`}>
      <defs><pattern id="lambertBarHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" x2="0" y1="0" y2="6" className={styles.hatchLine} /></pattern></defs>
      {[0, 1, 2].map((i) => <g key={i}><line x1={left} x2={w - right} y1={bottom - (bottom - top) * i / 2} y2={bottom - (bottom - top) * i / 2} className={styles.gridLine} /><text className={styles.axisText} x={left - 5} y={bottom - (bottom - top) * i / 2 + 3} textAnchor="end">{fmt(Math.round(max * i / 2))}</text></g>)}
      {list.map((point, i) => { const height = values[i] / max * (bottom - top); const bx = left + i * cell + (cell - barWidth) / 2; return <g key={`bar-${i}`}>
        <rect x={bx} y={bottom - height} width={barWidth} height={height} rx={Math.min(6, height / 2)} className={i === highest ? styles.barHigh : styles.barMuted} />
        {i !== highest && <rect x={bx} y={bottom - height} width={barWidth} height={height} rx={Math.min(6, height / 2)} fill="url(#lambertBarHatch)" pointerEvents="none" />}
        <rect x={left + i * cell} y={top} width={cell} height={bottom - top} fill="transparent" tabIndex={0} aria-label={`${point.label || point.key}: ${fmt(point.pageviews)} page views`} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />
        {(i % interval === 0 || i === list.length - 1) && <text x={left + i * cell + cell / 2} y="208" textAnchor="middle" className={styles.axisText}>{seriesLabel(point.label || point.key, i, list.length)}</text>}
      </g>; })}
      {list.length && chosen >= 0 && <g><rect x={Math.max(6, Math.min(w - 78, left + chosen * cell + cell / 2 - 36))} y={Math.max(3, bottom - values[chosen] / max * (bottom - top) - 29)} width="72" height="22" rx="9" className={styles.valueBubble} /><text x={Math.max(6, Math.min(w - 78, left + chosen * cell + cell / 2 - 36)) + 36} y={Math.max(3, bottom - values[chosen] / max * (bottom - top) - 29) + 15} textAnchor="middle" className={styles.bubbleText}>{fmt(values[chosen])}</text></g>}
    </svg>
    <HiddenTable caption="Daily page views" headings={["Day", "Page views"]} rows={list.map((p) => [p.label || p.key, fmt(p.pageviews)])} />
  </div>;
}
function PageViewsCard({ state, retry }) {
  const points = state.data?.timeseries?.points || [];
  return <Panel title="Page views by day" action={<span className={styles.subtlePill}>Daily</span>}>
    <Status state={state} retry={retry} size="tall">{points.length && points.some((p) => number(p.pageviews)) ? <DailyBars points={points} /> : <Empty>No page views in this period.</Empty>}</Status>
  </Panel>;
}

function arc(x, y, radius, from, to) {
  const a = (angle) => [x + radius * Math.cos(angle * Math.PI / 180), y - radius * Math.sin(angle * Math.PI / 180)];
  const [x1, y1] = a(from), [x2, y2] = a(to);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${radius},${radius} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}
function ResponseGauge({ contacts }) {
  const [focus, setFocus] = useState(false);
  const statuses = contacts?.by_status || {};
  const newCount = number(statuses.new), readCount = number(statuses.read), replied = number(statuses.replied);
  const eligible = newCount + readCount + replied;
  const rate = percent(replied, eligible);
  const activeSegments = Math.round(rate / 100 * 34);
  return <>
    <div className={styles.gaugeWrap}>
      <svg viewBox="0 0 280 174" className={styles.gaugeSvg} role="img" tabIndex={0} aria-label={`${rate.toFixed(0)} percent response rate: ${fmt(replied)} replied out of ${fmt(eligible)} current enquiries`} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onMouseEnter={() => setFocus(true)} onMouseLeave={() => setFocus(false)}>
        {Array.from({ length: 34 }, (_, i) => <path key={i} d={arc(140, 146, 104, 180 - i * 180 / 34 - 1.1, 180 - (i + 1) * 180 / 34 + 1.1)} className={i < activeSegments ? styles.gaugeFilled : styles.gaugeEmpty} />)}
        <text x="140" y="125" textAnchor="middle" className={styles.gaugeNumber}>{rate.toFixed(0)}%</text>
        <text x="140" y="148" textAnchor="middle" className={styles.gaugeCaption}>Responded</text>
      </svg>
      {focus && <span className={styles.gaugeTooltip} role="status">{fmt(replied)} replied / {fmt(eligible)} active enquiries</span>}
    </div>
    <HiddenTable caption="Enquiry response calculation" headings={["Status", "Count"]} rows={[["New", fmt(newCount)], ["Read", fmt(readCount)], ["Replied", fmt(replied)]]} />
    <Link className={styles.softCallout} href="/contacts"><span className={styles.alertDot} />{fmt(newCount)} new {newCount === 1 ? "enquiry" : "enquiries"} waiting<ArrowUpRight size={13} /></Link>
  </>;
}
function EnquiryRateCard({ state, retry }) {
  return <Panel title="Enquiry response rate" action={<PillLink href="/contacts">Manage</PillLink>}>
    <Status state={state} retry={retry} size="tall">{state.data?.contacts && ["new", "read", "replied"].some((key) => number(state.data.contacts?.by_status?.[key])) ? <ResponseGauge contacts={state.data.contacts} /> : <Empty>No active enquiries to calculate a response rate.</Empty>}</Status>
  </Panel>;
}

function contentMetrics(summary) {
  const projects = summary?.projects || {};
  const media = summary?.media_center || {};
  const divisions = summary?.divisions || {};
  return [
    {
      kind: "projects", title: "Projects", href: "/projects", noun: "published",
      value: number(projects.by_status?.published), total: number(projects.total),
      pending: number(projects.by_status?.draft), pendingLabel: "draft", plural: "projects",
    },
    {
      kind: "media", title: "Media", href: "/media-center", noun: "published",
      value: number(media.by_status?.published), total: number(media.total),
      pending: number(media.by_status?.draft), pendingLabel: "draft", plural: "media items",
    },
    {
      kind: "divisions", title: "Divisions", href: "/divisions", noun: "active",
      value: number(divisions.by_status?.active), total: number(divisions.total),
      pending: number(divisions.by_status?.inactive), pendingLabel: "inactive", plural: "divisions",
    },
  ];
}
function SummaryQuickActions({ showMessages }) {
  return <nav className={styles.quickActions} aria-label="Content quick actions">
    <Link href="/projects/new"><BriefcaseBusiness size={14} aria-hidden="true" /> New project</Link>
    <Link href="/media-center/new"><FilePlus2 size={14} aria-hidden="true" /> Upload document</Link>
    {showMessages ? <Link href="/contacts"><Mail size={14} aria-hidden="true" /> Messages</Link> : <Link href="/media-center"><Files size={14} aria-hidden="true" /> Media Centre</Link>}
  </nav>;
}
function ContentSummaryRow({ state, facility, showMessages, retrySummary, retryFacility }) {
  const data = state.data || {};
  const cards = [
    { label: "Projects", icon: BriefcaseBusiness, href: "/projects", data: data.projects, published: "published", draft: "draft" },
    { label: "Facility Projects", icon: Building2, href: "/facility-management/projects", facility: true },
    { label: "Media Centre", icon: Files, href: "/media-center", data: data.media_center, published: "published", draft: "draft" },
    { label: "Divisions", icon: FolderTree, href: "/divisions", data: data.divisions, active: "active" },
    { label: "Media Categories", icon: FilePlus2, href: "/media-center/categories", data: data.media_categories, active: "active" },
    ...(showMessages ? [{ label: "Contact Messages", icon: Mail, href: "/contacts", data: data.contacts, active: "new", activeLabel: "new" }] : []),
  ];
  const isPending = state.loading && !state.data;
  const failed = state.error && !state.data;
  return <section className={styles.summarySection} aria-label="Website content summary">
    <div className={styles.summaryHeading}>
      <div className={styles.summaryTitle}><h2>Content summary</h2><span className={styles.quietText}>Live CMS totals</span></div>
      <SummaryQuickActions showMessages={showMessages} />
    </div>
    <div className={styles.summaryTiles}>{cards.map(({ label, icon: Icon, href, data: record, facility: isFacility, published, draft, active, activeLabel }) => {
      const unresolved = isFacility ? facility.loading && !facility.data : isPending;
      const fault = isFacility ? facility.error && !facility.data : failed;
      const value = isFacility ? facility.data?.pagination?.total : record?.total;
      const valid = value !== undefined && value !== null && Number.isFinite(Number(value));
      const errorHandler = isFacility ? retryFacility : retrySummary;
      // Editors can view these totals, but category/division administration remains restricted.
      const canOpen = showMessages || !["Divisions", "Media Categories"].includes(label);
      const Tile = canOpen ? Link : "div";
      return <article className={`${styles.summaryTile} ${canOpen ? "" : styles.staticTile}`} key={label}>
        <Tile {...(canOpen ? { href, "aria-label": `Open ${label}` } : { "aria-label": `${label} summary (administrator access required)` })} className={styles.summaryTileLink}>
          <div className={styles.summaryTileHead}><span className={styles.summaryIcon}><Icon size={16} strokeWidth={1.7} /></span>{canOpen && <ArrowUpRight size={14} aria-hidden="true" />}</div>
          <span className={styles.summaryLabel}>{label}</span>
          <strong className={styles.summaryNumber}>{unresolved ? "···" : valid ? fmt(value) : "—"}</strong>
          {isFacility ? <div className={styles.summaryChips}>
        {facility.data?.published != null && <span>{fmt(facility.data.published)} published</span>}
        {facility.data?.draft != null && <span>{fmt(facility.data.draft)} draft</span>}
        {facility.data?.published == null && <span>Breakdown unavailable</span>}
      </div> : <div className={styles.summaryChips}>
            {published && <><span>{fmt(record?.by_status?.[published])} published</span><span>{fmt(record?.by_status?.[draft])} draft</span></>}
            {active && <span>{fmt(record?.by_status?.[active])} {activeLabel || "active"}</span>}
          </div>}
        </Tile>
        {fault && <button type="button" className={styles.summaryRetry} onClick={errorHandler}>Retry count</button>}
      </article>;
    })}</div>
  </section>;
}
function PublicationDonut({ metric }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const rate = percent(metric.value, metric.total);
  const rounded = Math.round(rate);
  const progress = `${rate} ${100 - rate}`;

  return <div className={styles.publicationMetric}>
    <svg viewBox="0 0 180 180" className={styles.publicationSvg} role="img" tabIndex={0}
      aria-label={`${metric.title}: ${fmt(metric.value)} of ${fmt(metric.total)} ${metric.noun}, ${rounded} percent`}
      onFocus={() => setShowTooltip(true)} onBlur={() => setShowTooltip(false)}
      onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <circle cx="90" cy="90" r="77" className={styles.donutTrack} />
      {rate > 0 && <circle cx="90" cy="90" r="77" pathLength="100"
        className={styles.donutProgress} strokeDasharray={progress}
        style={{ "--donut-fill": progress }} transform="rotate(-90 90 90)" />}
      <text className={styles.donutValue} x="90" y="91" textAnchor="middle">
        <tspan className={styles.donutNumber}>{rounded}</tspan><tspan className={styles.donutPercent}>%</tspan>
      </text>
      <text className={styles.donutInnerLabel} x="90" y="115" textAnchor="middle">{metric.noun}</text>
    </svg>
    {showTooltip && <span className={styles.donutTooltip} role="status">
      {fmt(metric.value)} of {fmt(metric.total)} {metric.plural}
    </span>}
  </div>;
}

function PublicationProgressCard({ metric, index, state, retry, restricted }) {
  // Editors can inspect division totals but cannot navigate to division administration.
  const action = restricted
    ? <span className={styles.subtlePill}>Overview</span>
    : <PillLink href={metric.href}>View</PillLink>;
  const pendingText = metric.kind === "divisions"
    ? `${fmt(metric.pending)} ${metric.pending === 1 ? "division is" : "divisions are"} inactive`
    : `${fmt(metric.pending)} ${metric.pending === 1 ? "item is" : "items are"} still in draft`;
  const completeText = metric.kind === "divisions" ? "All divisions active" : "All published";

  return <Panel title={metric.title} action={action}
    className={`${styles.publishingCard} ${styles[`publicationTone${index}`]}`}>
    <Status state={state} retry={retry} size="tall">
      <div className={styles.publicationCardBody}>
        <PublicationDonut metric={metric} />
        <p className={styles.publicationCount}>
          <strong>{fmt(metric.value)}</strong> of <strong>{fmt(metric.total)}</strong> {metric.noun}
        </p>
        <div className={styles.publicationChips}>
          <span className={styles.publishedChip}>{fmt(metric.value)} {metric.noun}</span>
          <span className={styles.pendingChip}>{fmt(metric.pending)} {metric.pendingLabel}</span>
        </div>
        <p className={styles.publicationNote}>
          {metric.total === 0
            ? `No ${metric.plural} recorded yet`
            : metric.pending > 0
              ? pendingText
              : <><CheckCircle2 size={13} aria-hidden="true" /> {completeText}</>}
        </p>
      </div>
      <HiddenTable caption={`${metric.title} publishing progress`}
        headings={["State", "Count"]}
        rows={[[metric.noun, fmt(metric.value)], [metric.pendingLabel, fmt(metric.pending)], ["Total", fmt(metric.total)]]} />
    </Status>
  </Panel>;
}

function PublishingProgressSection({ state, retry, editor }) {
  return <section className={styles.publishingSection} aria-labelledby="publishing-progress-title">
    <h2 id="publishing-progress-title" className={styles.sectionTitle}>Publishing progress</h2>
    <div className={styles.publishingGrid}>
      {contentMetrics(state.data).map((metric, index) => <PublicationProgressCard
        key={metric.kind} metric={metric} index={index} state={state} retry={retry}
        restricted={editor && metric.kind === "divisions"}
      />)}
    </div>
  </section>;
}

function EnquiryRows({ state, retry }) {
  if (state.loading && !state.data) return <div className={styles.rowSkeleton} aria-busy="true">Loading latest enquiries…</div>;
  if (state.error && !state.data) return <WidgetError message={state.error} retry={retry} />;
  const items = state.data?.items || [];
  if (!items.length) return <p className={styles.quietText}>No enquiries have been received yet.</p>;
  return <>{state.error && <div className={styles.staleWarning} role="alert">Messages could not refresh. <button type="button" onClick={retry}>Retry</button></div>}<ul className={styles.enquiryList}>{items.slice(0, 4).map((item) => {
    const name = item.full_name || "Website visitor";
    return <li key={item.id}><Link className={styles.enquiryLink} href={`/contacts/view/?id=${encodeURIComponent(item.id)}`}><span className={styles.initialAvatar}>{initials(name)}</span><span className={styles.enquiryText}><strong>{name}</strong><small>{item.subject?.label_en || item.subject?.key || "General enquiry"}</small></span><span className={styles.enquiryTime}><span className={`${styles.enquiryStatus} ${styles[`status_${item.status}`] || ""}`}>{String(item.status || "read")}</span><time dateTime={item.created_at}>{relativeTime(item.created_at)}</time></span></Link></li>;
  })}</ul></>;
}
function LatestEnquiriesCard({ state, retry }) {
  return <Panel title="Latest enquiries" action={<PillLink href="/contacts">All messages</PillLink>} className={styles.latestEnquiriesCard}>
    <div className={styles.cardBody}><EnquiryRows state={state} retry={retry} /></div>
  </Panel>;
}
function startOfWeek() { const now = new Date(); now.setHours(0, 0, 0, 0); now.setDate(now.getDate() - (now.getDay() + 6) % 7); return now; }
function ActivityTimeline({ items }) {
  const weekStart = startOfWeek();
  const days = WEEKDAYS.map((label, index) => { const date = new Date(weekStart); date.setDate(date.getDate() + index); return { label, date, id: ymd(date) }; });
  const current = ymd(new Date());
  const currentWeek = days.map((day) => ({ ...day, actions: items.filter((item) => { const date = localDate(item.created_at); return date && ymd(date) === day.id; }) }));
  const weekEvents = currentWeek.reduce((count, day) => count + day.actions.length, 0);
  return <>
    <div className={styles.timelineScroller} tabIndex={0} role="region" aria-label="Activity timeline, horizontally scrollable on small screens">
    <div className={styles.timeline} role="group" aria-label="Activity this Monday through Sunday">
      <svg className={styles.timelineSvg} viewBox="0 0 700 120" preserveAspectRatio="none" role="img" aria-label={`${weekEvents} recent actions plotted between Monday and Sunday`}>
        {[1, 2, 3, 4, 5, 6].map((day) => <line key={day} x1={day * 100} x2={day * 100} y1="0" y2="120" className={styles.timelineGridLine} />)}
      </svg>
      {currentWeek.map((day) => <div key={day.id} className={`${styles.timelineDay} ${day.id === current ? styles.todayDay : ""}`}>
        <div className={styles.timelineDayLabel}><strong>{day.label}</strong><small>{day.date.getDate()}</small></div>
        <div className={styles.timelineTrack}>{day.actions.map((item, index) => { const tipId = `activity-tip-${day.id}-${item.id || index}`; return <div key={`${item.id || item.action}-${index}`} className={styles.activityEvent}><div className={`${styles.activityPill} ${styles[`tone_${actionTone(item)}`]}`} tabIndex={0} aria-describedby={tipId} aria-label={`${actionLabel(item)} by ${item.admin?.name || item.admin?.email || "System"} at ${clockTime(item.created_at)}`}>{actionLabel(item)}</div><span id={tipId} className={styles.activityTooltip} role="tooltip">{item.admin?.name || item.admin?.email || "System"} · {clockTime(item.created_at)}</span></div>; })}</div>
        {day.id === current && <span className={styles.todayMarker} aria-hidden="true" />}
      </div>)}
    </div>
    </div>
    <HiddenTable caption="This week's content activity" headings={["Date", "Action", "By"]} rows={items.filter((item) => { const date = localDate(item.created_at); return date && date >= weekStart; }).map((item) => [item.created_at, actionLabel(item), item.admin?.name || item.admin?.email || "System"])} />
  </>;
}
function ActivityCard({ state, retry }) {
  const items = (Array.isArray(state.data?.recent_activity) ? state.data.recent_activity : []).filter(Boolean);
  return <Panel title="This week's activity" action={<span className={styles.subtlePill}><CalendarDays size={12} /> Mon – Sun</span>} className={styles.activityCard}>
    <Status state={state} retry={retry} size="tall"><>
      <ActivityTimeline items={items} />
      <div className={styles.sectionHeading}><h3>Recent actions</h3><span className={styles.quietText}>Latest 5</span></div>
      {items.length ? <ul className={styles.recentList}>{items.slice(0, 5).map((item, index) => <li key={item.id || `${item.action}-${index}`}><span className={`${styles.recentIcon} ${styles[`tone_${actionTone(item)}`]}`}><Activity size={13} /></span><span><strong>{actionLabel(item)}</strong><small>{item.admin?.name || item.admin?.email || "System"}</small></span><time dateTime={item.created_at} title={item.created_at}>{relativeTime(item.created_at)}</time></li>)}</ul> : <Empty>No recent activity yet. New CMS actions will appear here.</Empty>}
    </></Status>
  </Panel>;
}
export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState({ data: null, loading: true, error: "" });
  const [analytics, setAnalytics] = useState({ data: null, loading: true, error: "" });
  const [messages, setMessages] = useState({ data: null, loading: true, error: "" });
  const [facility, setFacility] = useState({ data: null, loading: true, error: "" });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [salutation, setSalutation] = useState("Welcome");
  useEffect(() => { setSalutation(greeting()); }, []);

  const loadSummary = useCallback(async ({ signal } = {}) => {
    setSummary((old) => ({ ...old, loading: true, error: "" }));
    try {
      const data = await getDashboardSummary({ signal });
      if (!signal?.aborted) { setSummary({ data, loading: false, error: "" }); setLastUpdated(new Date()); }
    } catch (error) {
      if (!signal?.aborted) setSummary((old) => ({ ...old, loading: false, error: apiErrorMessage(error, "Please retry the content summary.") }));
    }
  }, []);
  const loadFacility = useCallback(async ({ signal } = {}) => {
    setFacility((old) => ({ ...old, loading: true, error: "" }));
    try {
      const [allResult, publishedResult, draftResult] = await Promise.allSettled([
        listAdminFacilityProjects({ limit: 1 }, { signal }),
        listAdminFacilityProjects({ limit: 1, status: "published" }, { signal }),
        listAdminFacilityProjects({ limit: 1, status: "draft" }, { signal }),
      ]);
      if (allResult.status === "rejected") throw allResult.reason;
      const data = allResult.value;
      if (!signal?.aborted) setFacility({ data: {
        ...data,
        published: publishedResult.status === "fulfilled" ? publishedResult.value?.pagination?.total : undefined,
        draft: draftResult.status === "fulfilled" ? draftResult.value?.pagination?.total : undefined,
      }, loading: false, error: "" });
    } catch (error) {
      if (!signal?.aborted) setFacility((old) => ({ ...old, loading: false, error: apiErrorMessage(error, "Facility project count unavailable.") }));
    }
  }, []);
  const loadAnalytics = useCallback(async ({ signal } = {}) => {
    if (!isAdmin) return;
    setAnalytics((old) => ({ ...old, loading: true, error: "" }));
    try {
      const data = await getAnalyticsSummary(dateRange(days), { signal });
      if (!signal?.aborted) { setAnalytics({ data, loading: false, error: "" }); setLastUpdated(new Date()); }
    } catch (error) {
      if (!signal?.aborted) setAnalytics((old) => ({ ...old, loading: false, error: apiErrorMessage(error, "Please retry website statistics.") }));
    }
  }, [days, isAdmin]);
  const loadMessages = useCallback(async ({ signal } = {}) => {
    if (!isAdmin) return;
    setMessages((old) => ({ ...old, loading: true, error: "" }));
    try {
      const data = await listAdminContactMessages({ page: 1, limit: 4 }, { signal });
      if (!signal?.aborted) { setMessages({ data, loading: false, error: "" }); setLastUpdated(new Date()); }
    } catch (error) {
      if (!signal?.aborted) setMessages((old) => ({ ...old, loading: false, error: apiErrorMessage(error, "Please retry the latest messages.") }));
    }
  }, [isAdmin]);

  useEffect(() => { const controller = new AbortController(); loadSummary({ signal: controller.signal }); loadFacility({ signal: controller.signal }); return () => controller.abort(); }, [loadSummary, loadFacility]);
  useEffect(() => {
    if (!isAdmin) { setAnalytics({ data: null, loading: false, error: "" }); return undefined; }
    const controller = new AbortController();
    setAnalytics({ data: null, loading: true, error: "" });
    loadAnalytics({ signal: controller.signal });
    return () => controller.abort();
  }, [loadAnalytics, isAdmin]);
  useEffect(() => {
    if (!isAdmin) { setMessages({ data: null, loading: false, error: "" }); return undefined; }
    const controller = new AbortController();
    loadMessages({ signal: controller.signal });
    return () => controller.abort();
  }, [loadMessages, isAdmin]);

  const refreshing = summary.loading || facility.loading || (isAdmin && (analytics.loading || messages.loading));
  const refresh = () => { loadSummary(); loadFacility(); if (isAdmin) { loadAnalytics(); loadMessages(); } };

  return <div className={styles.page}>
    <header className={styles.pageHead}>
      <div><h1>{salutation}, {user?.first_name || "there"}</h1><p>Here&apos;s what&apos;s happening on the Lambert website</p></div>
      <div className={styles.headActions}>
        {isAdmin && <div className={styles.periodSelect} role="group" aria-label="Analytics period">{[7, 30].map((period) => <button key={period} type="button" aria-pressed={days === period} className={days === period ? styles.periodActive : ""} onClick={() => setDays(period)}>{period} days</button>)}</div>}
        <button type="button" className={styles.refreshButton} aria-label="Refresh dashboard" title={lastUpdated ? `Updated ${clockTime(lastUpdated)}` : "Refresh dashboard"} disabled={refreshing} onClick={refresh}><RefreshCw size={16} className={refreshing ? styles.spinning : ""} aria-hidden="true" /></button>
      </div>
    </header>
    {isAdmin ? <div className={styles.dashboardGrid}>
      <VisitorsCard state={analytics} retry={loadAnalytics} />
      <TrafficTrendCard state={analytics} retry={loadAnalytics} />
      <TrafficSourcesCard state={analytics} retry={loadAnalytics} />
      <PublishingProgressSection state={summary} retry={loadSummary} />
      <ActivityCard state={summary} retry={loadSummary} />
      <PageViewsCard state={analytics} retry={loadAnalytics} />
      <EnquiryRateCard state={summary} retry={loadSummary} />
      <LatestEnquiriesCard state={messages} retry={loadMessages} />
      <ContentSummaryRow state={summary} facility={facility} showMessages retrySummary={loadSummary} retryFacility={loadFacility} />
    </div> : <div className={styles.dashboardGrid}>
      <PublishingProgressSection state={summary} retry={loadSummary} editor />
      <ActivityCard state={summary} retry={loadSummary} />
      <ContentSummaryRow state={summary} facility={facility} retrySummary={loadSummary} retryFacility={loadFacility} />
    </div>}
  </div>;
}
