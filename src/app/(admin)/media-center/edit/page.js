import { Suspense } from "react";
import MediaEditClient from "./MediaEditClient";
import styles from "./page.module.css";

export const metadata = { title: "Edit Media Center Resource | Lambert Administration" };

export default function EditMediaCenterPage() {
  return <Suspense fallback={<div className={styles.loading}>Loading Media Center item…</div>}><MediaEditClient /></Suspense>;
}
