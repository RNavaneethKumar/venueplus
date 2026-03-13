'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

function ConfirmationContent() {
  const params = useSearchParams()
  const router = useRouter()
  const orderId = params.get('orderId')
  const orderNumber = params.get('orderNumber')
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
        <span className="text-4xl">✅</span>
      </div>

      <div>
        <h1 className="text-3xl font-black text-green-400">Payment Successful!</h1>
        <p className="text-white/60 mt-2">Your tickets have been booked</p>
        <p className="text-2xl font-bold mt-2">{orderNumber}</p>
      </div>

      {orderId && (
        <div className="kiosk-card flex flex-col items-center gap-3">
          <QRCodeSVG value={orderId} size={180} bgColor="transparent" fgColor="white" />
          <p className="text-white/60 text-sm">Show this QR at the entry gate</p>
        </div>
      )}

      <p className="text-white/40 text-sm">
        Returning to home in {countdown}s
      </p>

      <button onClick={() => router.push('/')} className="kiosk-btn-primary">
        Done
      </button>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  )
}
