import styles from "./ListSummary.module.css";

export default function ListSummary({ label = "List summary", items = [] }) {
  return <section className={styles.row} aria-label={label}>
    {items.map((item, index) => <div className={styles.card} key={item.label || index}>
      <span className={styles.icon} aria-hidden="true">{item.icon}</span>
      <div className={styles.detail}><strong>{item.value}</strong><small>{item.label}</small></div>
    </div>)}
  </section>;
}
