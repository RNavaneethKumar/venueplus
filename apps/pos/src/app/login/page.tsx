'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { posApi, getTenantSlug } from '@/lib/api'
import { usePosStore } from '@/store/posStore'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = usePosStore()
  const [identifier, setIdentifier] = useState('')
  const [pin, setPin]               = useState('')
  const [loading, setLoading]       = useState(false)

  // Derive tenant info for display
  const tenantSlug = getTenantSlug()
  const tenantName = tenantSlug
    ? tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1).replace(/-/g, ' ')
    : null

  // Single-tenant fallback: venueId from env (only used when no tenant slug present)
  const fallbackVenueId = process.env.NEXT_PUBLIC_VENUE_ID

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) {
      toast.error('PIN must be 4 digits')
      return
    }
    setLoading(true)
    try {
      // In multi-tenant mode venueId is resolved server-side from x-tenant-slug.
      // In single-tenant dev mode we send NEXT_PUBLIC_VENUE_ID explicitly.
      const venueId = tenantSlug ? undefined : fallbackVenueId
      const res = await posApi.auth.login(identifier, pin, venueId)
      const { token, user } = res.data.data

      window.localStorage.setItem('pos_token', token)
      setAuth(token, {
        id:          user.id,
        name:        user.name,
        venueId:     user.venueId,
        roles:       user.roles       ?? [],
        permissions: user.permissions ?? [],
      })
      router.push('/')
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-4xl font-black tracking-tight leading-none mb-2 select-none">
            <span className="text-white">Venue</span><span className="text-blue-500">Plus</span>
          </p>
          {tenantName ? (
            <p className="text-slate-300 text-sm font-semibold">{tenantName}</p>
          ) : null}
          <p className="text-slate-400 text-sm mt-1">POS Terminal · Staff login</p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Username / Email
            </label>
            <input
              type="text"
              className="input"
              placeholder="staff@venueplus.io"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              className="input text-center tracking-[0.5em] text-xl"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-6" suppressHydrationWarning>
          VenuePlus © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
