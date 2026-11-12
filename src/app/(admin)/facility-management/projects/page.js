'use client'

import { Archive, Building2, Eye, Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import TablePagination from '@/components/table/TablePagination'
import { apiErrorMessage } from '@/lib/api/client'
import {
  archiveAdminFacilityProject,
  deleteAdminFacilityProject,
  facilityProjectAssetUrl,
  listAdminFacilityProjects,
} from '@/lib/api/facilityProjects'
import { useAuthStore } from '@/stores/authStore'
import DataToolbar from "@/components/table/DataToolbar";
import DataTable from "@/components/table/DataTable";
import ListSummary from "@/components/table/ListSummary";
import FilterDrawer from "@/components/table/FilterDrawer";
import StatusPill from "@/components/table/StatusPill";
import RowActions from "@/components/table/RowActions";
import TableDate from "@/components/table/TableDate";
import tableStyles from "@/components/table/DataTable.module.css";
import styles from '../../projects/page.module.css'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export default function FacilityProjectsPage() {
  const user = useAuthStore((state) => state.user)
  const isAdministrator = ['admin', 'super_admin'].includes(user?.role)
  const isSuperAdmin = user?.role === 'super_admin'
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [filters.search])

  const load = useCallback(async ({ page = 1, refresh = false, signal } = {}) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const response = await listAdminFacilityProjects({
        page,
        limit: pagination.limit,
        status: filters.status || undefined,
        search: debouncedSearch || undefined,
      }, { signal })
      setItems(response.items)
      setPagination(response.pagination)
    } catch (requestError) {
      if (requestError?.code !== 'ERR_CANCELED') setError(apiErrorMessage(requestError, 'Unable to load Facility Management projects.'))
    } finally {
      if (!signal?.aborted) { setLoading(false); setRefreshing(false) }
    }
  }, [debouncedSearch, filters.status, pagination.limit])

  useEffect(() => {
    const controller = new AbortController()
    load({ page: 1, signal: controller.signal })
    return () => controller.abort()
  }, [load])

  const publishedOnPage = useMemo(() => items.filter((item) => item.status === 'published').length, [items])
  const withImagesOnPage = useMemo(() => items.filter((item) => item.image_url).length, [items])
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const changeLimit = (limit) => setPagination((current) => ({ ...current, page: 1, limit }))

  const runDestructive = async () => {
    if (!confirm || busy) return
    setBusy(true)
    setError('')
    try {
      if (confirm.type === 'delete') await deleteAdminFacilityProject(confirm.item.id)
      else await archiveAdminFacilityProject(confirm.item.id)
      setConfirm(null)
      await load({ page: pagination.page, refresh: true })
    } catch (requestError) {
      setError(apiErrorMessage(requestError, confirm.type === 'delete' ? 'Unable to delete the project.' : 'Unable to archive the project.'))
    } finally { setBusy(false) }
  }

  const drawerFields = [
    { key: "status", label: "Status", options: STATUS_OPTIONS, isSearchable: false }
  ];


  const columns = [
    { key: "project", label: "Project", track: "minmax(230px,2.4fr)", identity: true, render: (item) => <div className={tableStyles.identity}><span className={tableStyles.thumb}>{item.image_url ? <img src={facilityProjectAssetUrl(item.image_url)} alt="" /> : <ImageIcon size={18} />}</span><div><strong title={item.title_en}>{item.title_en}</strong><small title={`/${item.slug}/`}>/{item.slug}/</small></div></div> },
    { key: "status", label: "Status", track: "minmax(95px,.8fr)", render: (item) => <StatusPill value={item.status} /> },
    { key: "order", label: "Order", track: "minmax(75px,.6fr)", numeric: true, highlight: true, render: (item) => Number(item.display_order || 0) },
    { key: "updated", label: "Updated", track: "minmax(115px,1fr)", hideTablet: true, render: (item) => <TableDate value={item.updated_at} /> },
    { key: "actions", label: "Actions", track: "minmax(115px,auto)", actions: true, align: "right", render: (item) => <RowActions>
      <Link href={`/facility-management/projects/view/?id=${item.id}`} aria-label={`View ${item.title_en}`} title="View facility project"><Eye size={15} /></Link>
      <Link href={`/facility-management/projects/edit/?id=${item.id}`} aria-label={`Edit ${item.title_en}`} title="Edit facility project"><Pencil size={15} /></Link>
      {isAdministrator && item.status !== "archived" ? <button type="button" onClick={() => setConfirm({ type: "archive", item })} aria-label={`Archive ${item.title_en}`} title="Archive facility project"><Archive size={15} /></button> : null}
      {isSuperAdmin && item.status === "archived" ? <button type="button" onClick={() => setConfirm({ type: "delete", item })} aria-label={`Permanently delete ${item.title_en}`} title="Delete permanently"><Trash2 size={15} /></button> : null}
    </RowActions> }
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHead}>
        <div>
          <span className={styles.kicker}>Facility Management</span>
          <h1>Facility Projects</h1>
          <p>Manage the maintained facilities displayed on the LEM Maintenance / Facility Management page.</p>
        </div>
        
      </section>

      <ListSummary label="Facility project summary" items={[
      { icon: <Building2 size={18} />, value: Number(pagination.total || 0).toLocaleString(), label: "Matching projects" },
      { icon: <Eye size={18} />, value: publishedOnPage, label: "Published on this page" },
      { icon: <ImageIcon size={18} />, value: withImagesOnPage, label: "With images on this page" }
      ]} />

      {error ? <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => load({ page: pagination.page, refresh: true })}>Retry</button></div> : null}

      <DataToolbar
        search={filters.search}
        onSearchChange={(value) => setFilter("search", value)}
        searchPlaceholder="Search title or slug..."
        searchLabel="Search facility projects"
        filters={filters}
        filterFields={drawerFields}
        onOpenFilters={() => setFiltersOpen(true)}
        onFilterChange={(key, value) => setFilter(key, value)}
        onClearFilters={() => setFilters((current) => ({ ...current, status: "" }))}
        onRefresh={() => load({ page: pagination.page, refresh: true })}
        refreshing={refreshing}
        action={<Link href="/facility-management/projects/new/"><Plus size={16} /> New facility project</Link>}
      />
      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} applied={filters} fields={drawerFields} onApply={(applied) => setFilters((current) => ({ ...current, ...applied }))} />

      <DataTable label="Facility projects" columns={columns} rows={items} loading={loading} total={pagination.total} page={pagination.page} limit={pagination.limit} emptyIcon={<Building2 size={23} />} emptyTitle="No Facility Management projects found" emptyMessage="Adjust the filters or create a new facility project." />
      <TablePagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} limit={pagination.limit} limitOptions={[12,25,50,100]} loading={loading} onPageChange={(page) => load({ page })} onLimitChange={changeLimit} noun="facility projects" />

      <ConfirmDialog open={Boolean(confirm)} title={confirm?.type === 'delete' ? 'Permanently delete facility project?' : 'Archive facility project?'} message={confirm?.type === 'delete' ? `This permanently deletes “${confirm?.item?.title_en || 'this project'}” and its stored image.` : `“${confirm?.item?.title_en || 'This project'}” will be removed from the public Facility Management page.`} confirmLabel={confirm?.type === 'delete' ? 'Delete permanently' : 'Archive project'} tone={confirm?.type === 'delete' ? 'danger' : 'warning'} busy={busy} onConfirm={runDestructive} onClose={() => !busy && setConfirm(null)} />
    </div>
  )
}
