'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'x-venue-id': process.env.NEXT_PUBLIC_VENUE_ID ?? '' },
})

export default function CollectPage() {
  const router = useRouter()
  const [bookingRef, setBookingRef] = useState('')
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleLookup = async () => {
    if (!bookingRef.trim()) { toast.error('Enter booking reference'); return }
    setLoading(true)
    try {
      const res = await api.get(`/orders/${bookingRef.trim()}`)
      setOrder(res.data.data)
    } catch {
      toast.error('Booking not found. Check your reference number.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8">
      <button onClick={() => router.push('/')} className="self-start text-white/60 hover:text-white text-2xl">←</button>

      <div className="text-center">
        <div className="text-5xl mb-3">📱</div>
        <h1 className="text-3xl font-black">Collect Your Ticket</h1>
        <p className="text-white/60 mt-1">Enter your booking reference to get your QR code</p>
      </div>

      {!order ? (
        <div className="w-full max-w-md kiosk-card space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Booking Reference</label>
            <input
              type="text"
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
              placeholder="e.g. ORD-20260307-123456"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={loading}
            className="kiosk-btn-primary w-full"
          >
            {loading ? 'Looking up…' : 'Find Booking'}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md kiosk-card text-center space-y-4">
          <div>
            <p className="text-green-400 font-bold text-lg">✅ Booking Found</p>
            <p className="text-white/60 text-sm mt-1">{order.orderNumber}</p>
            <p className="text-white/40 text-xs mt-0.5">
              {order.totalAmount ? `₹${Number(order.totalAmount).toLocaleString('en-IN')}` : ''} · {order.status}
            </p>
          </div>

          <div className="flex justify-center py-2">
            <QRCodeSVG value={order.id} size={200} bgColor="transparent" fgColor="white" />
          </div>

          <p className="text-white/40 text-sm">Show this QR code at the entry gate</p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => { setOrder(null); setBookingRef('') }} className="kiosk-btn-secondary">
              New Lookup
            </button>
            <button onClick={() => router.push('/')} className="kiosk-btn-primary">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
