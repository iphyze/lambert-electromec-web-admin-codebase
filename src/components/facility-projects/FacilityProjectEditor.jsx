'use client'

import { ArrowLeft, CheckCircle2, Image as ImageIcon, LoaderCircle, Save, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiErrorMessage } from '@/lib/api/client'
import {
  changeFacilityProjectStatus,
  createAdminFacilityProject,
  facilityProjectAssetUrl,
  getAdminFacilityProject,
  removeFacilityProjectImage,
  replaceFacilityProjectImage,
  updateAdminFacilityProject,
} from '@/lib/api/facilityProjects'
import { useAuthStore } from '@/stores/authStore'
import styles from '@/components/media/MediaEditor.module.css'

const EMPTY = {
  title_en: '', title_fr: '', description_en: '', description_fr: '',
  work_done_en: '', work_done_fr: '', display_order: 0,
}

export default function FacilityProjectEditor({ projectId = null }) {
  const isNew = !projectId
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const isAdministrator = ['admin', 'super_admin'].includes(user?.role)
  const [item, setItem] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef(null)

  const canEdit = isNew || user?.role !== 'editor' || item?.status === 'draft'
  const currentImage = imagePreview || (item?.image_url ? facilityProjectAssetUrl(item.image_url) : '')

  useEffect(() => {
    if (!projectId) return undefined
    const controller = new AbortController()
    setLoading(true)
    getAdminFacilityProject(projectId, { signal: controller.signal })
      .then((data) => {
        setItem(data)
        setForm({
          title_en: data?.title_en || '', title_fr: data?.title_fr || '',
          description_en: data?.description_en || '', description_fr: data?.description_fr || '',
          work_done_en: data?.work_done_en || '', work_done_fr: data?.work_done_fr || '',
          display_order: Number(data?.display_order || 0),
        })
      })
      .catch((requestError) => {
        if (requestError?.code !== 'ERR_CANCELED') setError(apiErrorMessage(requestError, 'Unable to load this Facility Management project.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId])

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  const slugPreview = useMemo(() => {
    if (item?.slug) return item.slug
    return form.title_en.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }, [form.title_en, item?.slug])

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const selectImage = (file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Facility project images must be JPG, PNG or WEBP.')
      return
    }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  const payload = () => ({
    title_en: form.title_en.trim(), title_fr: form.title_fr.trim(),
    description_en: form.description_en.trim(), description_fr: form.description_fr.trim(),
    work_done_en: form.work_done_en.trim(), work_done_fr: form.work_done_fr.trim(),
    display_order: Number(form.display_order || 0),
  })

  const save = async () => {
    if (!canEdit || saving) return
    if (!form.title_en.trim()) { setError('English title is required.'); return }
    setSaving(true); setError(''); setSuccess(''); setProgress(0)
    try {
      if (isNew) {
        const created = await createAdminFacilityProject(payload(), imageFile, (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
        })
        setSuccess('Facility Management project created as a draft.')
        router.replace(`/facility-management/projects/edit/?id=${created.id}`)
        return
      }

      let updated = await updateAdminFacilityProject(projectId, payload())
      if (imageFile) {
        setImageBusy(true)
        updated = await replaceFacilityProjectImage(projectId, imageFile, (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100))
        })
      }
      setItem(updated)
      setImageFile(null)
      setImagePreview('')
      setSuccess('Facility Management project changes saved.')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to save the Facility Management project.'))
    } finally { setSaving(false); setImageBusy(false); setProgress(0) }
  }

  const removeImage = async () => {
    if (isNew) { setImageFile(null); setImagePreview(''); return }
    if (!item?.image_url || imageBusy) return
    setImageBusy(true); setError(''); setSuccess('')
    try {
      const updated = await removeFacilityProjectImage(projectId)
      setItem(updated)
      setImageFile(null); setImagePreview('')
      setSuccess('Facility project image removed.')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Unable to remove the project image.'))
    } finally { setImageBusy(false) }
  }

  const changeStatus = async (action) => {
    if (!projectId || statusBusy) return
    setStatusBusy(true); setError(''); setSuccess('')
    try {
      const updated = await changeFacilityProjectStatus(projectId, action)
      setItem(updated)
      setSuccess(action === 'publish' ? 'Facility Management project published.' : action === 'unpublish' ? 'Project moved back to draft.' : 'Project restored as a draft.')
    } catch (requestError) {
      const errors = requestError?.response?.data?.errors
      setError(Array.isArray(errors) && errors.length ? errors.join(' ') : apiErrorMessage(requestError, 'Unable to update publication status.'))
    } finally { setStatusBusy(false) }
  }

  if (loading) return <div className={styles.loadingPage}><LoaderCircle size={22} className={styles.spin} /><span>Loading Facility Management project…</span></div>

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div className={styles.headingGroup}>
          <Link className={styles.backLink} href="/facility-management/projects/"><ArrowLeft size={14} /> Facility Projects</Link>
          <span className={styles.kicker}>Facility Management</span>
          <div className={styles.titleRow}><h1>{isNew ? 'Create facility project' : item?.title_en || 'Edit facility project'}</h1>{item?.status ? <span className={`${styles.status} ${styles[`status_${item.status}`] || ''}`}>{item.status}</span> : null}</div>
          <p>Manage the bilingual maintained-facility content displayed on the public Facility Management page.</p>
        </div>
        {canEdit ? <button type="button" className={styles.saveTop} onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save project'}</button> : null}
      </section>

      {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}
      {success ? <div className={styles.successBanner}><CheckCircle2 size={15} />{success}</div> : null}
      {!canEdit ? <div className={styles.noticeBanner}>Editors can only modify draft projects. Ask an Admin to unpublish this project first.</div> : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>Project settings</h2><p>Slug is generated automatically from the English title. Lower display order appears first.</p></div></div>
        <div className={styles.settingsGrid} style={{ gridTemplateColumns: 'minmax(220px, 1.25fr) minmax(220px, 1.25fr) minmax(150px, .55fr)' }}>
          <label className={styles.field}><span className={styles.fieldLabel}>English title <b>*</b></span><input value={form.title_en} onChange={(event) => setField('title_en', event.target.value)} disabled={!canEdit} /><span className={styles.fieldHint}>Public English project name.</span></label>
          <label className={styles.field}><span className={styles.fieldLabel}>French title</span><input value={form.title_fr} onChange={(event) => setField('title_fr', event.target.value)} disabled={!canEdit} /><span className={styles.fieldHint}>Required before publishing.</span></label>
          <label className={styles.field}><span className={styles.fieldLabel}>Display order</span><input type="number" value={form.display_order} onChange={(event) => setField('display_order', event.target.value)} disabled={!canEdit} /><span className={styles.fieldHint}>Lower numbers display first.</span></label>
        </div>
        <label className={styles.field}><span className={styles.fieldLabel}>System-managed slug</span><input value={slugPreview ? `/${slugPreview}/` : ''} disabled /><span className={styles.fieldHint}>The slug is managed by the backend and is not a public detail route.</span></label>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>Project image</h2><p>Upload one strong landscape image for the maintained-facility card. JPG, PNG or WEBP.</p></div></div>
        <div className={styles.coverCard}>
          <div className={styles.coverPreview}>{currentImage ? <img src={currentImage} alt="Facility project preview" /> : <span><ImageIcon size={28} /><small>No image</small></span>}</div>
          <div className={styles.coverCopy}><strong>{imageFile?.name || item?.image_original_filename || 'No image selected'}</strong><span>This image appears only on the Facility Management maintained-project card.</span><small>Recommended: high-quality landscape image, up to 8 MB.</small></div>
          {canEdit ? <div className={styles.coverActions}><button type="button" onClick={() => fileRef.current?.click()} disabled={imageBusy}><Upload size={14} /> {currentImage ? 'Replace' : 'Choose image'}</button>{currentImage ? <button type="button" className={styles.coverRemove} onClick={removeImage} disabled={imageBusy}><Trash2 size={14} /> Remove</button> : null}</div> : null}
          <input ref={fileRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} />
        </div>
        {progress > 0 ? <div className={styles.progress}><span style={{ width: `${progress}%` }} /><small>{progress}%</small></div> : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>English content</h2><p>Content shown to English visitors.</p></div></div>
        <div className={styles.contentGrid}>
          <label className={styles.field}><span className={styles.fieldLabel}>Description</span><textarea rows={6} value={form.description_en} onChange={(event) => setField('description_en', event.target.value)} disabled={!canEdit} /></label>
          <label className={styles.field}><span className={styles.fieldLabel}>Work done</span><textarea rows={4} value={form.work_done_en} onChange={(event) => setField('work_done_en', event.target.value)} disabled={!canEdit} /></label>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>French content</h2><p>Content shown to French visitors.</p></div></div>
        <div className={styles.contentGrid}>
          <label className={styles.field}><span className={styles.fieldLabel}>Description</span><textarea rows={6} value={form.description_fr} onChange={(event) => setField('description_fr', event.target.value)} disabled={!canEdit} /></label>
          <label className={styles.field}><span className={styles.fieldLabel}>Work done</span><textarea rows={4} value={form.work_done_fr} onChange={(event) => setField('work_done_fr', event.target.value)} disabled={!canEdit} /></label>
        </div>
      </section>

      {!isNew && isAdministrator ? <section className={styles.section}>
        <div className={styles.sectionHead}><div><h2>Publication</h2><p>Only published records appear on the public Facility Management page.</p></div></div>
        <div className={styles.publishGrid}>
          <div className={styles.publishState}><span>Current status</span><strong className={`${styles.status} ${styles[`status_${item?.status}`] || ''}`}>{item?.status || 'draft'}</strong><small>{item?.published_at ? `Published: ${item.published_at}` : 'Not currently published.'}</small></div>
          <div className={styles.scheduleBox} style={{ gridTemplateColumns: '1fr' }}>
            {item?.status === 'published' ? <button type="button" onClick={() => changeStatus('unpublish')} disabled={statusBusy}>Unpublish</button> : item?.status === 'archived' ? <button type="button" onClick={() => changeStatus('restore')} disabled={statusBusy}>Restore as draft</button> : <button type="button" onClick={() => changeStatus('publish')} disabled={statusBusy}>Publish now</button>}
          </div>
        </div>
      </section> : null}

      <div className={styles.bottomActions}><Link href="/facility-management/projects/">Back to Facility Projects</Link>{canEdit ? <button type="button" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save changes'}</button> : null}</div>
    </div>
  )
}
