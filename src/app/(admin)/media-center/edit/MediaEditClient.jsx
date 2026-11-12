"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MediaEditor from "@/components/media/MediaEditor";
import styles from "./page.module.css";

export default function MediaEditClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return <section className={styles.invalidState}><span><AlertCircle size={21} /></span><h1>Media Center item not specified</h1><p>Open a resource from the Media Center list to edit it.</p><Link href="/media-center/"><ArrowLeft size={14} /> Back to Media Center</Link></section>;
  }
  return <MediaEditor itemId={Number(id)} />;
}
