import { Suspense } from 'react'
import TicketBooking from './TicketBooking'

export const metadata = {
  title: 'Book Tickets — FunZone',
}

export default function TicketsPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-black mb-2">Book Tickets</h1>
      <p className="text-gray-500 mb-8">Select your activities and visit date</p>
      <Suspense fallback={<div className="text-gray-400">Loading products…</div>}>
        <TicketBooking />
      </Suspense>
    </div>
  )
}
