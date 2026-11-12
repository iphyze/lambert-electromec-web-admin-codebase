'use client'

import { AlertCircle, ArrowLeft, CalendarDays, Image as ImageIcon, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiErrorMessage } from '@/lib/api/client'
import { facilityProjectAssetUrl, getAdminFacilityProject } from '@/lib/api/facilityProjects'
import { useAuthStore } from '@/stores/authStore'
import styles from '../../../projects/view/page.module.css'

function formatDate(value, includeTime = false) {
  if (!value) return '—'
  const parsed = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(parsed)
}

function ContentBlock({ title, children }) {
  return <section className={styles.contentBlock}><h3>{title}</h3><div className={styles.value}>{children || '—'}</div></section>
}

export default function FacilityProjectViewClient() {
  const id = useSearchParams().get('id')
  const user = useAuthStore((state) => state.user)
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || !/^\d+$/.test(id)) { setLoading(false); return undefined }
    const controller = new AbortController()
    getAdminFacilityProject(Number(id), { signal: controller.signal })
      .then(setItem)
      .catch((requestError) => { if (requestError?.code !== 'ERR_CANCELED') setError(apiErrorMessage(requestError, 'Unable to load this Facility Management project.')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id])

  if (!id || !/^\d+$/.test(id)) return <section className={styles.invalidState}><span><AlertCircle size={21} /></span><h1>Facility project not specified</h1><p>Open a project from the Facility Projects list.</p><Link href="/facility-management/projects/"><ArrowLeft size={14} /> Back to Facility Projects</Link></section>
  if (loading) return <div className={styles.loading}>Loading Facility Management project…</div>
  if (error || !item) return <section className={styles.invalidState}><span><AlertCircle size={21} /></span><h1>Unable to load project</h1><p>{error || 'This project could not be found.'}</p><Link href="/facility-management/projects/"><ArrowLeft size={14} /> Back to Facility Projects</Link></section>

  const canEdit = user?.role !== 'editor' || item.status === 'draft'
  return <div className={styles.page}>
    <section className={styles.pageHead}>
      <div><Link className={styles.backLink} href="/facility-management/projects/"><ArrowLeft size={14} /> Back to Facility Projects</Link><span className={styles.kicker}>Facility Management record</span><h1>{item.title_en}</h1><p>Read-only overview of the bilingual maintained-facility content and publication status.</p></div>
      {canEdit ? <Link className={styles.editButton} href={`/facility-management/projects/edit/?id=${item.id}`}><Pencil size={15} /> Edit project</Link> : null}
    </section>

    <section className={styles.heroCard}>
      <div className={styles.heroImage}>{item.image_url ? <img src={facilityProjectAssetUrl(item.image_url)} alt={item.title_en} /> : <span><ImageIcon size={30} /><small>No project image yet</small></span>}</div>
      <div className={styles.heroContent}><div className={styles.badges}><span className={`${styles.statusBadge} ${styles[`status_${item.status}`] || ''}`}>{item.status}</span></div><h2>{item.title_en}</h2>{item.title_fr ? <p className={styles.frenchTitle}>{item.title_fr}</p> : null}<div className={styles.metaGrid}><div><CalendarDays size={14} /><span>Display order</span><strong>{Number(item.display_order || 0)}</strong></div><div><CalendarDays size={14} /><span>Published</span><strong>{formatDate(item.published_at, true)}</strong></div></div></div>
    </section>

    <section className={styles.auditStrip}><div><span>Created</span><strong>{formatDate(item.created_at, true)}</strong></div><div><span>Last updated</span><strong>{formatDate(item.updated_at, true)}</strong></div><div><span>Slug</span><strong>/{item.slug}/</strong></div></section>

    <div className={styles.languageGrid}>
      <section className={styles.languagePanel}><div className={styles.sectionHead}><span>EN</span><div><h2>English content</h2></div></div><ContentBlock title="Description">{item.description_en}</ContentBlock><ContentBlock title="Work done">{item.work_done_en}</ContentBlock></section>
      <section className={styles.languagePanel}><div className={styles.sectionHead}><span>FR</span><div><h2>French content</h2></div></div><ContentBlock title="Description">{item.description_fr}</ContentBlock><ContentBlock title="Work done">{item.work_done_fr}</ContentBlock></section>
    </div>
  </div>
}
