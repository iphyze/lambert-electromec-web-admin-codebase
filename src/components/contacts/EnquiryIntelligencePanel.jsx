"use client";

import {
  AlertCircle,
  Check,
  Clock3,
  Copy,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiErrorMessage } from "@/lib/api/client";
import {
  getAdminContactAiAnalysis,
  runAdminContactAiAnalysis,
} from "@/lib/api/contacts";
import styles from "./EnquiryIntelligencePanel.module.css";

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function humanize(value) {
  if (!value) return "—";
  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function providerLabel(provider) {
  if (provider === "openai") return "OpenAI";
  if (provider === "local") return "Local fallback";
  return provider ? humanize(provider) : "—";
}

function generatorLabel(generatedBy) {
  if (!generatedBy) return "System";
  const name = [generatedBy.first_name, generatedBy.last_name].filter(Boolean).join(" ");
  return name || generatedBy.email || "Administrator";
}

async function copyText(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function EnquiryIntelligencePanel({ submissionId }) {
  const [data, setData] = useState({ latest: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async ({ signal } = {}) => {
    if (!submissionId) return;
    setLoading(true);
    setError("");
    try {
      const result = await getAdminContactAiAnalysis(submissionId, { signal });
      setData(result);
      const nextLatest = result?.latest || null;
      setSelectedId(nextLatest?.id ?? null);
      setReplyDraft(nextLatest?.suggested_reply || "");
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED" || requestError?.name === "CanceledError") return;
      setError(apiErrorMessage(requestError, "Unable to load Enquiry Intelligence."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    const controller = new AbortController();
    load({ signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const activeAnalysis = useMemo(() => {
    const history = data?.history || [];
    if (selectedId) return history.find((entry) => entry.id === selectedId) || data?.latest || null;
    return data?.latest || null;
  }, [data, selectedId]);

  const replyChanged = Boolean(activeAnalysis?.suggested_reply || replyDraft)
    && replyDraft !== (activeAnalysis?.suggested_reply || "");

  const selectAnalysis = (analysis) => {
    setSelectedId(analysis.id);
    setReplyDraft(analysis.suggested_reply || "");
    setCopied(false);
    setNotice("");
  };

  const generate = async () => {
    if (!submissionId || busy) return;
    const action = data?.history?.length ? "regenerate" : "analyse";
    setBusy(true);
    setError("");
    setNotice("");
    setCopied(false);
    try {
      const analysis = await runAdminContactAiAnalysis(submissionId, action);
      const history = [analysis, ...(data?.history || []).filter((entry) => entry.id !== analysis.id)].slice(0, 10);
      setData({ latest: analysis, history });
      setSelectedId(analysis.id);
      setReplyDraft(analysis.suggested_reply || "");
      setNotice(analysis.provider === "local"
        ? "Analysis completed using Lambert's local fallback."
        : "Enquiry Intelligence analysis completed.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to analyse this enquiry."));
    } finally {
      setBusy(false);
    }
  };

  const copyReply = async () => {
    if (!replyDraft.trim()) return;
    try {
      await copyText(replyDraft);
      setCopied(true);
      setNotice("Suggested reply copied. Review it before sending through your approved email workflow.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy the suggested reply. Please select and copy it manually.");
    }
  };

  const restoreReply = () => {
    setReplyDraft(activeAnalysis?.suggested_reply || "");
    setCopied(false);
  };

  if (loading) {
    return (
      <section className={styles.panel}>
        <div className={styles.loading}><Sparkles size={16} /> Loading Enquiry Intelligence…</div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.icon}><Sparkles size={18} /></span>
          <div>
            <div className={styles.titleRow}>
              <h2>Enquiry Intelligence</h2>
              <span className={styles.suggestionBadge}><ShieldCheck size={11} /> Suggestion only</span>
            </div>
            <p>AI-assisted assessment for administrator review. The original enquiry is never changed.</p>
          </div>
        </div>
        <button className={styles.analyseButton} type="button" disabled={busy} onClick={generate}>
          <RefreshCw size={14} className={busy ? styles.spinning : ""} />
          {busy ? "Analysing…" : data?.history?.length ? "Regenerate" : "Analyse enquiry"}
        </button>
      </header>

      {error ? <div className={styles.error} role="alert"><AlertCircle size={14} /><span>{error}</span><button type="button" onClick={() => setError("")}>Dismiss</button></div> : null}
      {notice ? <div className={styles.notice} role="status"><Check size={14} /><span>{notice}</span></div> : null}

      {!activeAnalysis ? (
        <div className={styles.emptyState}>
          <Sparkles size={22} />
          <strong>No analysis yet</strong>
          <p>Analyse this enquiry to generate a summary, classification, priority, commercial relevance, recommended action and reply suggestion.</p>
          <button type="button" disabled={busy} onClick={generate}>{busy ? "Analysing…" : "Analyse enquiry"}</button>
        </div>
      ) : activeAnalysis.status !== "completed" ? (
        <div className={styles.failedState}>
          <AlertCircle size={20} />
          <div><strong>Analysis {humanize(activeAnalysis.status)}</strong><p>{activeAnalysis.error_code ? `Error: ${humanize(activeAnalysis.error_code)}` : "The analysis did not complete successfully."}</p></div>
          <button type="button" disabled={busy} onClick={generate}>Try again</button>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.analysisTopline}>
            <div>
              <span>Generation {activeAnalysis.generation_no}</span>
              <strong>{providerLabel(activeAnalysis.provider)}</strong>
              {activeAnalysis.model ? <small>{activeAnalysis.model}</small> : null}
            </div>
            <div className={styles.analysisTime}><Clock3 size={12} /> {formatDate(activeAnalysis.completed_at || activeAnalysis.created_at)}</div>
          </div>

          <div className={styles.summaryBlock}>
            <span>Summary</span>
            <p>{activeAnalysis.summary || "—"}</p>
          </div>

          <div className={styles.metrics}>
            <div><span>Classification</span><strong>{humanize(activeAnalysis.classification)}</strong></div>
            <div><span>Priority</span><strong className={`${styles.tag} ${styles[`priority_${activeAnalysis.priority}`] || ""}`}>{humanize(activeAnalysis.priority)}</strong></div>
            <div><span>Commercial relevance</span><strong className={`${styles.tag} ${styles[`commercial_${activeAnalysis.commercial_relevance}`] || ""}`}>{humanize(activeAnalysis.commercial_relevance)}</strong></div>
            <div><span>Relevant division</span><strong>{activeAnalysis.relevant_division || "—"}</strong></div>
            <div><span>Relevant service</span><strong>{activeAnalysis.relevant_service || "—"}</strong></div>
            <div><span>Generated by</span><strong>{generatorLabel(activeAnalysis.generated_by)}</strong></div>
          </div>

          {activeAnalysis.commercial_reason ? (
            <div className={styles.infoBlock}><span>Commercial assessment</span><p>{activeAnalysis.commercial_reason}</p></div>
          ) : null}

          <div className={styles.actionBlock}>
            <span>Recommended next action</span>
            <p>{activeAnalysis.recommended_next_action || "—"}</p>
          </div>

          <div className={styles.replyBlock}>
            <div className={styles.replyHead}>
              <div><span>Suggested reply draft</span><small>Review and edit before use. Nothing is sent automatically.</small></div>
              <div className={styles.replyActions}>
                {replyChanged ? <button type="button" onClick={restoreReply}><RotateCcw size={12} /> Restore AI draft</button> : null}
                <button type="button" className={styles.copyButton} disabled={!replyDraft.trim()} onClick={copyReply}>{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy reply"}</button>
              </div>
            </div>
            <textarea value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} rows={9} aria-label="Suggested reply draft" />
            {replyChanged ? <p className={styles.editNote}>Edited locally in this screen. The stored AI analysis and original enquiry remain unchanged.</p> : null}
          </div>

          {activeAnalysis.usage?.input_tokens !== null || activeAnalysis.usage?.output_tokens !== null ? (
            <div className={styles.usage}>
              <span>Usage</span>
              <strong>{activeAnalysis.usage?.input_tokens ?? "—"} input · {activeAnalysis.usage?.output_tokens ?? "—"} output tokens</strong>
              {activeAnalysis.usage?.latency_ms !== null ? <small>{activeAnalysis.usage.latency_ms} ms</small> : null}
            </div>
          ) : activeAnalysis.provider === "local" ? (
            <div className={styles.usage}><span>Usage</span><strong>Local fallback · 0 OpenAI tokens</strong></div>
          ) : null}
        </div>
      )}

      {data?.history?.length ? (
        <details className={styles.historyPanel}>
          <summary><History size={14} /> Analysis history <span>{data.history.length}</span></summary>
          <div className={styles.historyList}>
            {data.history.map((entry) => (
              <article key={entry.id} className={entry.id === activeAnalysis?.id ? styles.historyActive : ""}>
                <div>
                  <strong>Generation {entry.generation_no}</strong>
                  <span>{humanize(entry.status)} · {providerLabel(entry.provider)}</span>
                  <small>{formatDate(entry.completed_at || entry.created_at)}</small>
                </div>
                <div>
                  <span>{humanize(entry.classification)}</span>
                  <small>{humanize(entry.priority)} priority</small>
                </div>
                <button type="button" disabled={entry.id === activeAnalysis?.id} onClick={() => selectAnalysis(entry)}>{entry.id === activeAnalysis?.id ? "Viewing" : "View"}</button>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
