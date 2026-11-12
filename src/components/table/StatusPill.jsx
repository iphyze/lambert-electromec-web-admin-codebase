import styles from "./StatusPill.module.css";

const TONES = {
  green: new Set(["published", "active", "sent", "replied", "delivered", "success", "super_admin"]),
  amber: new Set(["draft", "pending", "new", "read", "queued", "admin", "editor"]),
  red: new Set(["archived", "suspended", "failed", "disabled", "bounced", "rejected"]),
  grey: new Set(["not_configured", "deactivated", "inactive", "none"]),
};

export default function StatusPill({ value, label, tone, className = "" }) {
  const valueKey = String(value ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  const style = tone || Object.entries(TONES).find(([, entries]) => entries.has(valueKey))?.[0] || "grey";
  const text = label || String(value ?? "—").replaceAll("_", " ");
  return <span className={`${styles.pill} ${styles[style]} ${className}`.trim()} title={text}>{text}</span>;
}
