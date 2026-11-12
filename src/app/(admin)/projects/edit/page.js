import { Suspense } from "react";
import ProjectEditClient from "./ProjectEditClient";
import styles from "./page.module.css";

export const metadata = {
  title: "Edit Project | Lambert Administration",
};

export default function EditProjectPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading project…</div>}>
      <ProjectEditClient />
    </Suspense>
  );
}
