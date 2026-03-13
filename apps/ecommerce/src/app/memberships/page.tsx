import { Suspense } from 'react'
import MembershipList from './MembershipList'

export const metadata = {
  title: 'Memberships — FunZone',
}

export default function MembershipsPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-black mb-2">Memberships</h1>
      <p className="text-gray-500 mb-8">
        Enjoy unlimited fun with exclusive member benefits
      </p>
      <Suspense fallback={<div className="text-gray-400">Loading plans…</div>}>
        <MembershipList />
      </Suspense>
    </div>
  )
}
