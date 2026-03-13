'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ConfirmationContent() {
  const params = useSearchParams()
  const orderNumber = params.get('order')

  return (
    <div className="container-page py-20 max-w-lg mx-auto text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">✅</span>
      </div>

      <h1 className="text-3xl font-black text-gray-900">Booking Confirmed!</h1>
      <p className="text-gray-500 mt-2">
        Your tickets are booked. We'll send a confirmation to your registered mobile.
      </p>

      <div className="mt-8 bg-indigo-50 rounded-2xl p-6">
        <p className="text-sm text-gray-500">Order Number</p>
        <p className="text-2xl font-black text-indigo-700 mt-1">{orderNumber}</p>
        <p className="text-xs text-gray-400 mt-2">Show this at the entry gate or via the app</p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/account/bookings" className="btn-outline rounded-xl">
          View My Bookings
        </Link>
        <Link href="/tickets" className="btn-primary rounded-xl">
          Book More Tickets
        </Link>
      </div>
    </div>
  )
}
