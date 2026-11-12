import { Suspense } from 'react'
import FacilityProjectEditClient from './FacilityProjectEditClient'

export const metadata = { title: 'Edit Facility Project | Lambert Administration' }

export default function EditFacilityProjectPage() {
  return <Suspense fallback={<div>Loading Facility Management project…</div>}><FacilityProjectEditClient /></Suspense>
}
