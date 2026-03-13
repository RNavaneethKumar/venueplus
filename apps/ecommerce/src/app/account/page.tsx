'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  headers: { 'x-venue-id': process.env.NEXT_PUBLIC_VENUE_ID ?? '' },
})

export default function AccountPage() {
  const [account, setAccount] = useState<any>(null)
  const [otp, setOtp] = useState('')
  const [mobile, setMobile] = useState('')
  const [step, setStep] = useState<'login' | 'verify' | 'profile'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequestOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) { setError('Enter a valid 10-digit number'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/otp/request', { mobile, venueId: process.env.NEXT_PUBLIC_VENUE_ID })
      setStep('verify')
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/otp/verify', { mobile, otp, venueId: process.env.NEXT_PUBLIC_VENUE_ID })
      const { token } = res.data.data
      window.localStorage.setItem('ec_token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const profileRes = await api.get('/accounts/me')
      setAccount(profileRes.data.data)
      setStep('profile')
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    window.localStorage.removeItem('ec_token')
    setAccount(null)
    setStep('login')
    setMobile('')
    setOtp('')
  }

  if (step === 'profile' && account) {
    return (
      <div className="container-page py-12 max-w-xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black">{account.fullName ?? 'My Account'}</h1>
            <p className="text-gray-500">{account.mobile}</p>
            {account.email && <p className="text-gray-500 text-sm">{account.email}</p>}
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
            Log out
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Wallet */}
          {account.wallet && (
            <div className="border border-gray-200 rounded-2xl p-5">
              <p className="text-sm text-gray-500">Wallet Balance</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">
                ₹{Number(account.wallet.totalBalance).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Real: ₹{Number(account.wallet.realBalance).toLocaleString('en-IN')} · Bonus: ₹{Number(account.wallet.bonusBalance).toLocaleString('en-IN')}
              </p>
            </div>
          )}

          {/* Membership */}
          {account.membership && (
            <div className="border-2 border-indigo-100 bg-indigo-50 rounded-2xl p-5">
              <p className="text-sm text-indigo-600 font-medium">⭐ Active Membership</p>
              <p className="font-bold mt-1">{account.membership.plan?.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Renews {new Date(account.membership.currentPeriodEnd).toLocaleDateString('en-IN')}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <Link href="/account/bookings" className="flex items-center justify-between border border-gray-200 rounded-xl px-5 py-4 hover:bg-gray-50 transition-colors">
            <span className="font-medium">My Bookings</span>
            <span className="text-gray-400">→</span>
          </Link>
          <Link href="/account/profile" className="flex items-center justify-between border border-gray-200 rounded-xl px-5 py-4 hover:bg-gray-50 transition-colors">
            <span className="font-medium">Edit Profile</span>
            <span className="text-gray-400">→</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-20 max-w-sm mx-auto">
      <h1 className="text-2xl font-black mb-2">
        {step === 'login' ? 'Sign In' : 'Verify OTP'}
      </h1>
      <p className="text-gray-500 mb-8 text-sm">
        {step === 'login'
          ? 'Enter your mobile number to receive a one-time password'
          : `Enter the 6-digit OTP sent to ${mobile}`}
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'login' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="98765 43210"
                className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
            </div>
          </div>
          <button onClick={handleRequestOtp} disabled={loading} className="btn-primary w-full rounded-lg">
            {loading ? 'Sending OTP…' : 'Get OTP'}
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">One-Time Password</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-center tracking-[0.5em] text-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
          </div>
          <button onClick={handleVerifyOtp} disabled={loading} className="btn-primary w-full rounded-lg">
            {loading ? 'Verifying…' : 'Verify & Sign In'}
          </button>
          <button onClick={() => { setStep('login'); setOtp(''); setError('') }} className="w-full text-sm text-gray-500 hover:text-gray-700">
            ← Change number
          </button>
        </div>
      )}
    </div>
  )
}
