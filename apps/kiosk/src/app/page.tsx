'use client'

import { useRouter } from 'next/navigation'

export default function KioskHome() {
  const router = useRouter()

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8">
      {/* Venue branding */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-indigo-600 mb-4">
          <span className="text-4xl font-black">VP</span>
        </div>
        <h1 className="text-4xl font-black text-white">FunZone</h1>
        <p className="text-indigo-300 text-lg mt-1">Family Entertainment Centre</p>
      </div>

      {/* Language selector placeholder */}
      <div className="flex gap-3 text-sm">
        {['English', 'हिन्दी', 'தமிழ்'].map((lang) => (
          <button
            key={lang}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Main actions */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        <button
          onClick={() => router.push('/buy')}
          className="kiosk-btn-primary flex flex-col items-center gap-2 py-8"
        >
          <span className="text-4xl">🎟️</span>
          <span>Buy Tickets</span>
        </button>

        <button
          onClick={() => router.push('/fnb')}
          className="kiosk-btn-secondary flex flex-col items-center gap-2 py-8"
        >
          <span className="text-4xl">🍔</span>
          <span>Order Food</span>
        </button>

        <button
          onClick={() => router.push('/wallet')}
          className="kiosk-btn-secondary flex flex-col items-center gap-2 py-8"
        >
          <span className="text-4xl">💳</span>
          <span>Top-up Wallet</span>
        </button>

        <button
          onClick={() => router.push('/collect')}
          className="kiosk-btn-secondary flex flex-col items-center gap-2 py-8"
        >
          <span className="text-4xl">📱</span>
          <span>Collect Ticket</span>
        </button>
      </div>

      {/* Idle message */}
      <p className="text-white/40 text-sm">Touch anywhere to begin</p>
    </div>
  )
}
