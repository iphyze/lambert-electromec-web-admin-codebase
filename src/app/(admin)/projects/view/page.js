import { Suspense } from "react";
import ProjectViewClient from "./ProjectViewClient";
import styles from "./page.module.css";

export const metadata = {
  title: "Project Details | Lambert Administration",
};

export default function ProjectViewPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading project details…</div>}>
      <ProjectViewClient />
    </Suspense>
  );
}
