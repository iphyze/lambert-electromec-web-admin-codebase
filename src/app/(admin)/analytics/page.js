"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  ChartLine,
  Download,
  Eye,
  FileText,
  Globe,
  Inbox,
  MonitorSmartphone,
  MousePointerClick,
  RefreshCw,
  Route,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppDatePicker from "@/components/form/AppDatePicker";
import AppSelect from "@/components/form/AppSelect";
import TablePagination from "@/components/table/TablePagination";
import { apiErrorMessage } from "@/lib/api/client";
import { downloadAnalyticsExport, getAnalyticsSummary } from "@/lib/api/analytics";
import { useAuthStore } from "@/stores/authStore";
import styles from "./page.module.css";

const EXPORTS = [
  { value: "daily", label: "Daily totals (CSV)" },
  { value: "pages", label: "Pages (CSV)" },
  { value: "sources", label: "Traffic sources (CSV)" },
  { value: "events", label: "Key actions (CSV)" },
];
const SERIES = [
  { key: "visitors", label: "Visitors" },
  { key: "visits", label: "Visits" },
  { key: "pageviews", label: "Page views" },
];
const SOURCE_LABELS = { direct: "Direct", search: "Search engines", social: "Social media", referral: "Other websites", campaign: "Campaigns", internal: "Internal" };
const DEVICE_LABELS = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet" };
const LANGUAGE_LABELS = { en: "English", fr: "French" };
const EVENT_LABELS = {
  contact_submitted: "Contact enquiries sent",
  application_submitted: "Job applications sent",
  cv_uploaded: "CVs uploaded",
  media_opened: "Media Centre documents opened",
  media_downloaded: "Media Centre documents downloaded",
  assistant_question: "Questions asked to the assistant",
  phone_click: "Phone number taps",
  email_click: "Email address clicks",
  language_switch: "Language switches",
  outbound_click: "Links to other websites",
};
const OFFICE_LABELS = { NG: "Nigeria office", GH: "Ghana office", CI: "Côte d’Ivoire office" };
const PAGE_SIZE = 10;

function pad(value) { return String(value).padStart(2, "0"); }
function toYmd(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function addDays(date, days) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }

function presetRange(preset) {
  const today = new Date();
  switch (preset) {
    case "today": return { from: toYmd(today), to: toYmd(today) };
    case "yesterday": { const y = addDays(today, -1); return { from: toYmd(y), to: toYmd(y) }; }
    case "7d": return { from: toYmd(addDays(today, -6)), to: toYmd(today) };
    case "90d": return { from: toYmd(addDays(today, -89)), to: toYmd(today) };
    case "year": return { from: `${today.getFullYear()}-01-01`, to: toYmd(today) };
    case "30d":
    default: return { from: toYmd(addDays(today, -29)), to: toYmd(today) };
  }
}

function safeNumber(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function formatNumber(value) { return safeNumber(value).toLocaleString(); }
function formatDuration(seconds) {
  const total = Math.max(0, Math.round(safeNumber(seconds)));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes ? `${minutes}m ${pad(rest)}s` : `${rest}s`;
}
function formatPercent(value) { return `${safeNumber(value).toFixed(1)}%`; }
function formatRangeLabel(from, to) {
  const format = (value) => new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  return from === to ? format(from) : `${format(from)} – ${format(to)}`;
}
function sourceLabel(value) { return SOURCE_LABELS[value] || value; }
function countryLabel(code) {
  if (!code || code === "--") return "Unknown";
  try { return new Intl.DisplayNames(undefined, { type: "region" }).of(code) || code; } catch { return code; }
}
function eventLabel(event, label) {
  if (event === "phone_click") return OFFICE_LABELS[label] || label;
  if (event === "language_switch") return LANGUAGE_LABELS[label] || label;
  return label;
}

function Sparkline({ points, metric, label }) {
  const values = (Array.isArray(points) ? points : []).map((p) => Math.max(0, safeNumber(p[metric])));
  if (!values.length || !values.some(Boolean)) return <span className={styles.sparkEmpty} aria-hidden="true" />;
  const max = Math.max(1, ...values), min = Math.min(...values);
  const x = (index) => 4 + index / Math.max(1, values.length - 1) * 102;
  const y = (value) => 32 - (value - min) / Math.max(1, max - min) * 23;
  const path = values.map((value, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  return <svg className={styles.sparkline} viewBox="0 0 110 38" role="img" aria-label={`${label} mini trend, ${values.length} periods`}><path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function MetricCard({ icon: Icon, label, value, change, invert = false, note, points, metric }) {
  const hasChange = change !== undefined && change !== null && Number.isFinite(Number(change));
  const positive = hasChange && (invert ? change < 0 : change > 0);
  const negative = hasChange && (invert ? change > 0 : change < 0);
  return <article className={styles.metricCard}>
    <div className={styles.metricTop}><span className={styles.metricIcon}><Icon size={17} strokeWidth={1.7} /></span>{metric && <Sparkline points={points} metric={metric} label={label} />}</div>
    <p className={styles.metricLabel}>{label}</p>
    <strong className={styles.metricValue}>{value}</strong>
    {hasChange ? <div className={styles.metricFoot}><span className={positive ? styles.changeUp : negative ? styles.changeDown : styles.changeFlat}>
      {change > 0 ? <ArrowUpRight size={12} /> : change < 0 ? <ArrowDownRight size={12} /> : null}
      {change > 0 ? "+" : change < 0 ? "−" : ""}{Math.abs(Number(change)).toFixed(1)}%</span><small>vs previous period</small></div>
    : <div className={styles.metricFoot}><small>{note || "Current period"}</small></div>}
  </article>;
}

function Panel({ icon: Icon, title, description, action, children, className = "" }) {
  return (
    <article className={`${styles.panel} ${className}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleWrap}>
          <span className={styles.panelIcon}><Icon size={17} /></span>
          <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

function EmptyRow({ children = "No data for this period yet." }) {
  return <div className={styles.emptyRow}>{children}</div>;
}

function BarList({ rows, valueKey = "visits", label = (row) => row.value, suffix = "", maxRows = 8 }) {
  const visible = (rows || []).slice(0, maxRows);
  const max = Math.max(1, ...visible.map((row) => safeNumber(row[valueKey])));
  const total = (rows || []).reduce((sum, row) => sum + safeNumber(row[valueKey]), 0) || 1;
  if (!visible.length) return <EmptyRow />;
  return (
    <ul className={styles.barList}>
      {visible.map((row) => {
        const value = safeNumber(row[valueKey]);
        return (
          <li key={`${row.value}-${row.label || ""}`}>
            <div className={styles.barTrack}><span style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></div>
            <span className={styles.barLabel} title={label(row)}>{label(row)}</span>
            <strong>{formatNumber(value)}{suffix}</strong>
            <small>{((value / total) * 100).toFixed(0)}%</small>
          </li>
        );
      })}
    </ul>
  );
}

function TrendChart({ points = [], previous = [], metric, compare }) {
  const [active, setActive] = useState(null);
  const width = 760;
  const height = 240;
  const pad = { top: 16, right: 16, bottom: 30, left: 44 };
  const values = points.map((point) => safeNumber(point[metric]));
  const previousValues = compare ? previous.map((point) => safeNumber(point[metric])) : [];
  const max = Math.max(4, ...values, ...previousValues);
  const niceMax = Math.ceil(max / 4) * 4;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (index) => pad.left + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (value) => pad.top + innerH - (value / niceMax) * innerH;
  const line = (series) => series.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const area = values.length ? `${line(values)} L${x(values.length - 1).toFixed(1)},${pad.top + innerH} L${x(0).toFixed(1)},${pad.top + innerH} Z` : "";
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const metricLabel = SERIES.find((item) => item.key === metric)?.label || metric;
  const total = values.reduce((sum, value) => sum + value, 0);
  const peakIndex = values.indexOf(Math.max(...values, 0));
  const summary = points.length
    ? `${metricLabel}: ${formatNumber(total)} in total; highest ${formatNumber(values[peakIndex] || 0)} on ${points[peakIndex]?.label || ""}.`
    : `${metricLabel}: no data.`;
  const activePoint = active !== null ? points[active] : null;

  return (
    <div className={styles.chartWrap}>
      <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
        <defs><linearGradient id="analyticsAreaGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity="0.22" /><stop offset="1" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((step) => {
          const value = (niceMax / 4) * step;
          return (
            <g key={step}>
              <line className={styles.gridLine} x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} />
              <text className={styles.axisLabel} x={pad.left - 8} y={y(value) + 3} textAnchor="end">{formatNumber(value)}</text>
            </g>
          );
        })}
        {points.map((point, index) => (index % labelEvery === 0 || index === points.length - 1 ? (
          <text key={point.key} className={styles.axisLabel} x={x(index)} y={height - 8} textAnchor="middle">{point.label}</text>
        ) : null))}
        {compare && previousValues.length ? <path className={styles.previousLine} d={line(previousValues.slice(0, values.length))} /> : null}
        {values.length ? <path className={styles.area} d={area} /> : null}
        {values.length ? <path className={styles.line} d={line(values)} /> : null}
        {points.map((point, index) => (
          <rect
            key={`hit-${point.key}`}
            className={styles.hitArea}
            x={x(index) - innerW / Math.max(1, points.length) / 2}
            y={pad.top}
            width={innerW / Math.max(1, points.length)}
            height={innerH}
            tabIndex={0}
            aria-label={`${point.label}: ${formatNumber(point[metric])} ${metricLabel.toLowerCase()}`}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
          />
        ))}
        {activePoint ? (
          <g>
            <line className={styles.cursorLine} x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + innerH} />
            <circle className={styles.dot} cx={x(active)} cy={y(values[active])} r="4.5" />
          </g>
        ) : null}
      </svg>
      {activePoint ? (
        <div className={styles.tooltip} style={{ left: `${(x(active) / width) * 100}%` }} role="status">
          <strong>{activePoint.label}</strong>
          <span>{formatNumber(activePoint[metric])} {metricLabel.toLowerCase()}</span>
          {compare && previous[active] ? <small>Previous: {formatNumber(previous[active][metric])}</small> : null}
        </div>
      ) : null}
      <table className={styles.visuallyHidden}>
        <caption>{metricLabel} per {points.length === 24 ? "hour" : "day"}</caption>
        <thead><tr><th>Period</th><th>{metricLabel}</th></tr></thead>
        <tbody>{points.map((point) => <tr key={`row-${point.key}`}><td>{point.label}</td><td>{safeNumber(point[metric])}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function LoadingWidgets() {
  return <div className={styles.loadingWidgets} aria-busy="true" aria-label="Loading website statistics">
    <div className={styles.skeletonToolbar} />
    <div className={styles.metricGrid}>{Array.from({ length: 8 }, (_, i) => <div key={i} className={styles.skeletonMetric}><i /><b /><span /></div>)}</div>
    <div className={styles.skeletonChart} /><div className={styles.skeletonChart} />
  </div>;
}
function SourceShare({ sources }) {
  const labels = ["Search engines", "Social media", "Direct", "Other websites", "Campaigns"];
  const sums = new Map();
  (sources || []).forEach((row) => {
    const key = sourceLabel(row.value);
    const mapped = labels.includes(key) ? key : "Other websites";
    sums.set(mapped, (sums.get(mapped) || 0) + Math.max(0, safeNumber(row.visits)));
  });
  const items = labels.map((label, i) => ({ label, value: sums.get(label) || 0, tone: i })).filter((item) => item.value > 0);
  const total = items.reduce((a, item) => a + item.value, 0);
  const top = [...items].sort((a, b) => b.value - a.value).slice(0, 2);
  if (!total) return <EmptyRow>No traffic sources recorded yet.</EmptyRow>;
  return <div className={styles.sourceShare}>
    <div className={styles.sharePeaks}>{top.map((row) => <span key={row.label}>{row.label} · {(row.value / total * 100).toFixed(0)}%</span>)}</div>
    <div className={styles.shareBar} role="img" aria-label={items.map((r) => `${r.label} ${(r.value / total * 100).toFixed(1)}%`).join(", ")}>
      {items.map((row) => <span key={row.label} className={styles[`shareTone${row.tone}`]} style={{ width: `${row.value / total * 100}%` }} title={`${row.label}: ${formatNumber(row.value)} visits`} tabIndex={0} />)}
    </div>
    <ul className={styles.shareLegend}>{items.map((row) => <li key={row.label}><i className={styles[`shareTone${row.tone}`]} /><span>{row.label}</span><strong>{(row.value / total * 100).toFixed(0)}%</strong></li>)}</ul>
    <table className={styles.visuallyHidden}><caption>Visits by source</caption><tbody>{items.map((row) => <tr key={row.label}><th>{row.label}</th><td>{row.value}</td></tr>)}</tbody></table>
  </div>;
}
function DeviceShare({ items }) {
  const rows = (items || []).filter((row) => safeNumber(row.visits) > 0);
  const total = rows.reduce((sum, row) => sum + safeNumber(row.visits), 0);
  if (!total) return <EmptyRow>No device data for this period.</EmptyRow>;
  const r = 47, circ = 2 * Math.PI * r;
  let sum = 0;
  return <div className={styles.deviceGroup}>
    <svg viewBox="0 0 144 144" className={styles.deviceDonut} role="img" aria-label={rows.map((row) => `${DEVICE_LABELS[row.value] || row.value} ${formatPercent(safeNumber(row.visits) / total * 100)}`).join(", ")}>
      <circle cx="72" cy="72" r={r} className={styles.deviceTrack} />
      {rows.map((row, i) => { const amount = safeNumber(row.visits) / total * circ; const offset = sum; sum += amount; return <circle key={row.value} cx="72" cy="72" r={r} className={styles[`deviceTone${i % 3}`]} strokeDasharray={`${amount} ${circ}`} strokeDashoffset={-offset} transform="rotate(-90 72 72)" />; })}
      <text x="72" y="72" className={styles.donutCenter} textAnchor="middle">{formatNumber(total)}</text>
      <text x="72" y="90" className={styles.donutCaption} textAnchor="middle">visits</text>
    </svg>
    <ul className={styles.deviceLegend}>{rows.map((row, i) => <li key={row.value}><span className={styles[`deviceKey${i % 3}`]} />{DEVICE_LABELS[row.value] || row.value}<strong>{(safeNumber(row.visits) / total * 100).toFixed(0)}%</strong></li>)}</ul>
    <table className={styles.visuallyHidden}><caption>Device visits</caption><tbody>{rows.map((row) => <tr key={row.value}><th>{row.value}</th><td>{row.visits}</td></tr>)}</tbody></table>
  </div>;
}
function LanguageSplit({ rows }) {
  const en = safeNumber(rows?.find((item) => item.value === "en")?.visits);
  const fr = safeNumber(rows?.find((item) => item.value === "fr")?.visits);
  const total = en + fr;
  if (!total) return <EmptyRow>No language data for this period.</EmptyRow>;
  return <div className={styles.languageSplit}>
    <div className={styles.languageLegends}><span>English <b>{(en / total * 100).toFixed(0)}%</b></span><span>French <b>{(fr / total * 100).toFixed(0)}%</b></span></div>
    <div className={styles.languageBar} role="img" aria-label={`English: ${formatNumber(en)} visits, French: ${formatNumber(fr)} visits`}><span style={{ width: `${en / total * 100}%` }} /><span style={{ width: `${fr / total * 100}%` }} /></div>
    <table className={styles.visuallyHidden}><caption>Visits by language</caption><tbody><tr><th>English</th><td>{en}</td></tr><tr><th>French</th><td>{fr}</td></tr></tbody></table>
  </div>;
}
function Events({ events, detail }) {
  if (!events?.length) return <EmptyRow>No key actions recorded yet.</EmptyRow>;
  return <><ul className={styles.actionList}>{events.map((event, i) => <li key={event.value}>
    <span className={`${styles.actionIcon} ${styles[`actionTone${i % 4}`]}`}><MousePointerClick size={15} /></span>
    <span className={styles.actionName}>{EVENT_LABELS[event.value] || event.value}</span>
    <strong>{formatNumber(event.events)}</strong><small>{formatPercent(event.conversion_rate)}</small>
  </li>)}</ul>
    {detail?.length ? <><h3 className={styles.subheading}>Action details</h3><ul className={styles.detailList}>{detail.slice(0, 8).map((item) => <li key={`${item.event}-${item.label}`}><span>{EVENT_LABELS[item.event] || item.event}</span><code>{eventLabel(item.event, item.label)}</code><strong>{formatNumber(item.events)}</strong></li>)}</ul></> : null}
  </>;
}

export default function WebsiteStatisticsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdministrator = ["admin", "super_admin"].includes(user?.role);
  const [preset, setPreset] = useState("30d");
  const [range, setRange] = useState(() => presetRange("30d"));
  const [compare, setCompare] = useState(true);
  const [metric, setMetric] = useState("visitors");
  const [pageTab, setPageTab] = useState("top");
  const [pageIndex, setPageIndex] = useState(1);
  const [exportType, setExportType] = useState("daily");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ signal, refresh = false } = {}) => {
    if (!isAdministrator) { setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      setData(await getAnalyticsSummary({ ...range, compare }, { signal }));
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") return;
      setError(apiErrorMessage(requestError, "Unable to load website statistics."));
    } finally {
      if (!signal?.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [compare, isAdministrator, range]);

  useEffect(() => {
    const controller = new AbortController();
    load({ signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  // Keep the "live" numbers fresh while the tab is visible.
  useEffect(() => {
    if (!isAdministrator) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load({ refresh: true });
    }, 60000);
    return () => clearInterval(timer);
  }, [isAdministrator, load]);

  useEffect(() => { setPageIndex(1); }, [pageTab, data]);

  const changePreset = (value) => {
    setPreset(value);
    if (value !== "custom") setRange(presetRange(value));
  };
  const changeCustom = (key, value) => {
    if (!value) return;
    setPreset("custom");
    setRange((current) => {
      const next = { ...current, [key]: value };
      if (next.from > next.to) return { from: value, to: value };
      return next;
    });
  };

  const runExport = async () => {
    if (exporting) return;
    setExporting(true);
    setError("");
    try { await downloadAnalyticsExport({ ...range, report: exportType }); }
    catch (requestError) { setError(apiErrorMessage(requestError, "The report could not be exported.")); }
    finally { setExporting(false); }
  };

  const totals = data?.totals || {};
  const changes = compare ? data?.changes || {} : {};
  const pageRows = useMemo(() => {
    if (pageTab === "entry") return data?.entry_pages || [];
    if (pageTab === "exit") return data?.exit_pages || [];
    return data?.top_pages || [];
  }, [data, pageTab]);
  const pagedRows = pageRows.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE);

  if (user && !isAdministrator) {
    return (
      <section className={styles.accessDenied}>
        <span><ShieldCheck size={22} /></span>
        <h1>Administrator access required</h1>
        <p>Website statistics are available to administrators.</p>
        <Link href="/dashboard/">Back to dashboard</Link>
      </section>
    );
  }

  const points = data?.timeseries?.points || [];
  const liveVisitors = safeNumber(data?.realtime?.visitors);
  const kpis = [
    { icon: Users, label: "Visitors", value: formatNumber(totals.visitors), change: changes.visitors, metric: "visitors" },
    { icon: Eye, label: "Page views", value: formatNumber(totals.pageviews), change: changes.pageviews, metric: "pageviews" },
    { icon: Route, label: "Visits", value: formatNumber(totals.visits), change: changes.visits, metric: "visits" },
    { icon: FileText, label: "Pages per visit", value: safeNumber(totals.pages_per_visit).toFixed(2), change: changes.pages_per_visit },
    { icon: Timer, label: "Avg. visit duration", value: formatDuration(totals.avg_visit_seconds), change: changes.avg_visit_seconds },
    { icon: UserCheck, label: "Bounce rate", value: formatPercent(totals.bounce_rate), change: changes.bounce_rate, invert: true, note: "Single-page visits under 10 seconds" },
    { icon: Inbox, label: "Enquiries", value: formatNumber(totals.enquiries), change: changes.enquiries },
    { icon: MousePointerClick, label: "Job applications", value: formatNumber(totals.applications), change: changes.applications },
  ];

  return <div className={styles.page}>
    <header className={styles.pageHead}>
      <div><span className={styles.kicker}>Insights</span><h1>Website Statistics</h1><p>Understand website traffic, visitors and actions with anonymous, cookie-free analytics.</p></div>
      <div className={styles.headActions}>
        <span className={styles.livePill}><i className={styles.liveDot} aria-hidden="true" /> {data?.realtime?.visitors == null ? "—" : formatNumber(liveVisitors)} {liveVisitors === 1 ? "visitor" : "visitors"} now</span>
        <button className={styles.iconButton} type="button" onClick={() => load({ refresh: true })} disabled={refreshing || loading} title="Refresh statistics" aria-label="Refresh statistics"><RefreshCw size={16} className={refreshing ? styles.spinning : ""} /></button>
      </div>
    </header>

    <section className={styles.toolbar} aria-label="Analytics filters and export">
      <div className={styles.toolbarLeft}>
        <div className={styles.presetGroup} role="group" aria-label="Statistics period">
          {["today", "yesterday", "7d", "30d", "90d", "year", "custom"].map((key) => <button type="button" key={key} aria-pressed={preset === key} className={preset === key ? styles.presetActive : ""} onClick={() => changePreset(key)}>{key === "today" ? "Today" : key === "year" ? "Year" : key === "yesterday" ? "Yesterday" : key === "custom" ? "Custom" : key}</button>)}
        </div>
        {preset === "custom" ? <div className={styles.customRange}><AppDatePicker value={range.from} onChange={(value) => changeCustom("from", value)} maxDate={new Date()} clearable={false} ariaLabel="Start date" /><span>to</span><AppDatePicker value={range.to} onChange={(value) => changeCustom("to", value)} maxDate={new Date()} clearable={false} ariaLabel="End date" /></div> : <span className={styles.rangeLabel}><CalendarRange size={14} />{formatRangeLabel(range.from, range.to)}</span>}
      </div>
      <div className={styles.toolbarRight}>
        <button type="button" className={`${styles.toggle} ${compare ? styles.toggleOn : ""}`} role="switch" aria-checked={compare} onClick={() => setCompare((value) => !value)}><span /><strong>Compare</strong></button>
        <AppSelect className={styles.exportSelect} value={exportType} onChange={setExportType} options={EXPORTS} isSearchable={false} ariaLabel="Report type" />
        <button className={styles.exportButton} type="button" disabled={exporting || loading} onClick={runExport}><Download size={15} />{exporting ? "Exporting…" : "Export"}</button>
      </div>
    </section>
    {error && <div className={styles.errorBanner} role="alert"><div><strong>Statistics could not be loaded.</strong><p>{error}</p></div><button type="button" onClick={() => load({ refresh: true })}>Retry</button></div>}
    {data?.enabled === false && <div className={styles.noticeBanner} role="status">Statistics collection is switched off in System Settings. Earlier records remain available below.</div>}
    {loading && !data ? <LoadingWidgets /> : <>
      <section className={styles.metricGrid} aria-label="Website key figures">{kpis.map((item) => <MetricCard key={item.label} {...item} points={points} />)}</section>
      <Panel icon={ChartLine} title="Traffic trend" description={data?.timeseries?.granularity === "hour" ? "Traffic by hour" : "Daily visits over the selected period"} className={styles.trendPanel} action={<div className={styles.segmented} role="group" aria-label="Trend metric">{SERIES.map((item) => <button key={item.key} type="button" aria-pressed={metric === item.key} className={metric === item.key ? styles.segmentActive : ""} onClick={() => setMetric(item.key)}>{item.label}</button>)}</div>}>
        {points.some((point) => safeNumber(point[metric])) ? <TrendChart points={points} previous={data?.previous_timeseries?.points || []} metric={metric} compare={compare} /> : <EmptyRow>No visits recorded yet — the trend appears when tracking data is available.</EmptyRow>}
        {compare && <p className={styles.legend}><span className={styles.legendCurrent} />Current period<span className={styles.legendPrevious} />Previous period</p>}
      </Panel>
      <section className={styles.panelGrid} aria-label="Detailed website analytics">
        <Panel icon={FileText} title="Pages" description="Most viewed, entry and exit pages" className={styles.widePanel} action={<div className={styles.segmented} role="group" aria-label="Page type">{[["top", "Top"], ["entry", "Entry"], ["exit", "Exit"]].map(([key, label]) => <button type="button" key={key} aria-pressed={pageTab === key} className={pageTab === key ? styles.segmentActive : ""} onClick={() => setPageTab(key)}>{label}</button>)}</div>}>
          {pagedRows.length ? <div className={styles.tableWrap}><table className={styles.table}><thead>{pageTab === "top" ? <tr><th>Page</th><th>Views</th><th>Visitors</th><th>Avg. time</th><th>Scroll</th></tr> : <tr><th>Page</th><th>Visits</th><th>Visitors</th><th>Bounce rate</th><th>Avg. visit</th></tr>}</thead><tbody>{pagedRows.map((row) => <tr key={row.value}><td><code title={row.value}>{row.value}</code></td>{pageTab === "top" ? <><td>{formatNumber(row.pageviews)}</td><td>{formatNumber(row.visitors)}</td><td>{formatDuration(row.avg_engaged_seconds)}</td><td>{row.avg_scroll_pct == null ? "—" : `${row.avg_scroll_pct}%`}</td></> : <><td>{formatNumber(row.visits)}</td><td>{formatNumber(row.visitors)}</td><td>{formatPercent(row.bounce_rate)}</td><td>{formatDuration(row.avg_engaged_seconds)}</td></>}</tr>)}</tbody></table></div> : <EmptyRow>No page statistics for this period.</EmptyRow>}
          {pageRows.length > PAGE_SIZE && <TablePagination page={pageIndex} totalPages={Math.ceil(pageRows.length / PAGE_SIZE)} total={pageRows.length} limit={PAGE_SIZE} limitOptions={[PAGE_SIZE]} onPageChange={setPageIndex} noun="pages" />}
        </Panel>
        <Panel icon={Route} title="Traffic sources" description="Where visitors come from" className={styles.sourcePanel}>
          <SourceShare sources={data?.sources} /><h3 className={styles.subheading}>Referring websites</h3><BarList rows={data?.referrers} maxRows={6} />{data?.campaigns?.length ? <><h3 className={styles.subheading}>Campaigns</h3><BarList rows={data.campaigns} maxRows={5} /></> : null}
        </Panel>
        <Panel icon={MonitorSmartphone} title="Devices" description="How people browse your site" className={styles.thirdPanel}>
          <DeviceShare items={data?.devices} /><h3 className={styles.subheading}>Browsers</h3><BarList rows={data?.browsers} maxRows={6} /><h3 className={styles.subheading}>Operating systems</h3><BarList rows={data?.operating_systems} maxRows={6} />
        </Panel>
        <Panel icon={MousePointerClick} title="Key actions" description="Interaction and conversion metrics" className={styles.thirdPanel}>
          <Events events={data?.events} detail={data?.event_labels} />
        </Panel>
        <Panel icon={Globe} title="Audience location & language" description="Visitors by region and site language" className={styles.thirdPanel}>
          <h3 className={styles.subheading}>Countries</h3>{data?.country_source === "cloudflare" ? <BarList rows={data?.countries} label={(row) => countryLabel(row.value)} maxRows={8} /> : <EmptyRow>Countries appear when the site is behind Cloudflare.</EmptyRow>}
          <h3 className={styles.subheading}>Languages</h3><LanguageSplit rows={data?.languages} />
        </Panel>
      </section>
    </>}
  </div>;
}
