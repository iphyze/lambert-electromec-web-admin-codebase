import { Suspense } from "react";
import MediaViewClient from "./MediaViewClient";
import styles from "./page.module.css";

export const metadata = { title: "Media Center Details | Lambert Administration" };

export default function MediaViewPage() {
  return <Suspense fallback={<div className={styles.loading}>Loading Media Center details…</div>}><MediaViewClient /></Suspense>;
}
