'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'x-venue-id': process.env.NEXT_PUBLIC_VENUE_ID ?? '' },
})

const TOP_UP_AMOUNTS = [200, 500, 1000, 2000]

export default function WalletPage() {
  const router = useRouter()
  const [mobile, setMobile] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [step, setStep] = useState<'enter_mobile' | 'select_amount' | 'confirm'>('enter_mobile')
  const [processing, setProcessing] = useState(false)

  const finalAmount = amount ?? (customAmount ? parseInt(customAmount, 10) : 0)

  const handleMobileSubmit = () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit mobile number')
      return
    }
    setStep('select_amount')
  }

  const handleAmountSubmit = () => {
    if (!finalAmount || finalAmount < 100) {
      toast.error('Minimum top-up is ₹100')
      return
    }
    setStep('confirm')
  }

  const handleTopUp = async () => {
    setProcessing(true)
    try {
      // In production: create a wallet load order via /orders
      const res = await api.post('/orders', {
        channel: 'kiosk',
        items: [{ productId: 'WALLET_LOAD', quantity: 1, unitPrice: finalAmount, discountAmount: 0 }],
        payments: [{ method: 'upi', amount: finalAmount }],
      })
      router.push(`/confirmation?orderId=${res.data.data.id}&orderNumber=${res.data.data.orderNumber}`)
    } catch {
      toast.error('Top-up failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8">
      <button onClick={() => router.push('/')} className="self-start text-white/60 hover:text-white text-2xl">←</button>

      <div className="text-center">
        <div className="text-5xl mb-3">💳</div>
        <h1 className="text-3xl font-black">Top-up Wallet</h1>
        <p className="text-white/60 mt-1">Add money to your FunZone wallet</p>
      </div>

      <div className="w-full max-w-md kiosk-card space-y-6">
        {step === 'enter_mobile' && (
          <>
            <div>
              <label className="block text-sm text-white/60 mb-2">Mobile Number</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter your 10-digit number"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button onClick={handleMobileSubmit} className="kiosk-btn-primary w-full">
              Continue
            </button>
          </>
        )}

        {step === 'select_amount' && (
          <>
            <p className="text-sm text-white/60">Mobile: <strong className="text-white">{mobile}</strong></p>
            <div>
              <label className="block text-sm text-white/60 mb-3">Select Amount</label>
              <div className="grid grid-cols-2 gap-3">
                {TOP_UP_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setCustomAmount('') }}
                    className={`py-4 rounded-2xl font-bold text-xl transition-all ${
                      amount === a
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    ₹{a.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="number"
                  placeholder="Or enter custom amount"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setAmount(null) }}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <button onClick={handleAmountSubmit} disabled={!finalAmount} className="kiosk-btn-primary w-full">
              Continue
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="text-center space-y-2">
              <p className="text-white/60 text-sm">Top-up amount</p>
              <p className="text-5xl font-black text-indigo-300">₹{finalAmount.toLocaleString('en-IN')}</p>
              <p className="text-white/60 text-sm">to {mobile}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep('select_amount')} className="kiosk-btn-secondary">
                Back
              </button>
              <button onClick={handleTopUp} disabled={processing} className="kiosk-btn-primary">
                {processing ? 'Processing…' : 'Pay Now'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
