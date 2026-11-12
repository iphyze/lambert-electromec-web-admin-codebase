"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProjectEditor from "@/components/projects/ProjectEditor";
import styles from "./page.module.css";

export default function ProjectEditClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id || !/^\d+$/.test(id)) {
    return (
      <section className={styles.invalidState}>
        <span><AlertCircle size={21} /></span>
        <h1>Project not specified</h1>
        <p>Open a project from the Projects list to edit it.</p>
        <Link href="/projects/"><ArrowLeft size={14} /> Back to projects</Link>
      </section>
    );
  }

  return <ProjectEditor projectId={Number(id)} />;
}
