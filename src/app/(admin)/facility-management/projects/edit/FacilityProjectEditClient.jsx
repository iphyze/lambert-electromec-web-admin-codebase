'use client'

import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import FacilityProjectEditor from '@/components/facility-projects/FacilityProjectEditor'

export default function FacilityProjectEditClient() {
  const id = useSearchParams().get('id')
  if (!id || !/^\d+$/.test(id)) {
    return <section style={{ minHeight: '45svh', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 8, textAlign: 'center' }}><AlertCircle size={28} /><h1>Facility project not specified</h1><p>Open a project from the Facility Projects list to edit it.</p><Link href="/facility-management/projects/"><ArrowLeft size={14} /> Back to Facility Projects</Link></section>
  }
  return <FacilityProjectEditor projectId={Number(id)} />
}
