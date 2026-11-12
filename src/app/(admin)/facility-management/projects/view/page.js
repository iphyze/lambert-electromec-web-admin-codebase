import { Suspense } from 'react'
import FacilityProjectViewClient from './FacilityProjectViewClient'

export const metadata = { title: 'Facility Project Details | Lambert Administration' }

export default function FacilityProjectViewPage() {
  return <Suspense fallback={<div>Loading Facility Management project…</div>}><FacilityProjectViewClient /></Suspense>
}
