import { Suspense } from 'react'
import ConfirmationContent from './ConfirmationContent'

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="container-page py-16 text-center text-gray-400">Loading…</div>}>
      <ConfirmationContent />
    </Suspense>
  )
}
