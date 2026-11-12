import { Suspense } from "react";
import ContactViewClient from "./ContactViewClient";
import styles from "./page.module.css";

export const metadata = { title: "Contact Message | Lambert Administration" };

export default function ContactViewPage() {
  return <Suspense fallback={<div className={styles.loading}>Loading contact message…</div>}><ContactViewClient /></Suspense>;
}
