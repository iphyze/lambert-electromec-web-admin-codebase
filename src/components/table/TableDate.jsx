import styles from "./DataTable.module.css";

export default function TableDate({ value }) {
  if (!value) return <span className={styles.dateStack}><strong>—</strong></span>;
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return <span className={styles.dateStack} title={String(value)}><strong>{String(value)}</strong></span>;
  const day = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
  const time = /[T\s]\d{2}:\d{2}/.test(String(value)) ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) : null;
  return <span className={styles.dateStack} title={`${day}${time ? `, ${time}` : ""}`}><strong>{day}</strong>{time ? <small>{time}</small> : null}</span>;
}
