'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { posApi, getTenantSlug } from '@/lib/api'

// localStorage keys
const DEVICE_TOKEN_KEY = 'venueplus_device_token'
const DEVICE_ID_KEY    = 'venueplus_device_id'
const DEVICE_NAME_KEY  = 'venueplus_device_name'
const DEVICE_TYPE_KEY  = 'venueplus_device_type'

export default function ActivatePage() {
  const router  = useRouter()
  const [key1, setKey1] = useState('')
  const [key2, setKey2] = useState('')
  const [key3, setKey3] = useState('')
  const [key4, setKey4] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [deviceName, setDeviceName] = useState('')

  const ref1 = useRef<HTMLInputElement>(null)
  const ref2 = useRef<HTMLInputElement>(null)
  const ref3 = useRef<HTMLInputElement>(null)
  const ref4 = useRef<HTMLInputElement>(null)

  const tenantSlug = getTenantSlug()
  const tenantName = tenantSlug
    ? tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1).replace(/-/g, ' ')
    : null

  // If already activated, go straight to login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem(DEVICE_TOKEN_KEY)
      if (token) router.replace('/login')
    }
  }, [router])

  // Auto-advance focus as segments are filled
  const handleSegment = (
    value: string,
    setter: (v: string) => void,
    nextRef: React.RefObject<HTMLInputElement | null> | null,
  ) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4)
    setter(cleaned)
    if (cleaned.length === 4 && nextRef?.current) {
      nextRef.current.focus()
    }
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    const licenseKey = `${key1}-${key2}-${key3}-${key4}`.toUpperCase()
    // Should be VP-XXXX-XXXX-XXXX (with the VP prefix already in key1)
    const fullKey = key1.toUpperCase() === 'VP'
      ? licenseKey
      : `VP-${key2}-${key3}-${key4}`

    // Simple format check
    if (key1.length < 2 || key2.length < 4 || key3.length < 4 || key4.length < 4) {
      toast.error('Please enter a complete license key')
      return
    }

    setLoading(true)
    try {
      const res = await posApi.device.activate(fullKey)
      const { deviceToken, deviceId, deviceName: name, deviceType } = res.data.data

      window.localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken)
      window.localStorage.setItem(DEVICE_ID_KEY, deviceId)
      window.localStorage.setItem(DEVICE_NAME_KEY, name)
      window.localStorage.setItem(DEVICE_TYPE_KEY, deviceType)

      setDeviceName(name)
      setDone(true)
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Activation failed. Check your license key.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    router.push('/login')
  }

  if (done) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-950">
        <div className="w-full max-w-sm text-center">
          {/* Logo */}
          <p className="text-4xl font-black tracking-tight leading-none mb-8 select-none">
            <span className="text-white">Venue</span><span className="text-blue-500">Plus</span>
          </p>

          {/* Success state */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full bg-green-900/40 border-2 border-green-500/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Terminal Activated</h2>
            <p className="text-slate-400 text-sm mb-1">{deviceName}</p>
            {tenantName && (
              <p className="text-slate-500 text-xs mb-6">{tenantName}</p>
            )}
            <p className="text-slate-400 text-sm mb-6">
              This terminal is now licensed and ready for use.
            </p>
            <button
              onClick={handleContinue}
              className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              Sign In to POS →
            </button>
          </div>

          <p className="text-center text-slate-500 text-xs mt-6" suppressHydrationWarning>
            VenuePlus © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-4xl font-black tracking-tight leading-none mb-2 select-none">
            <span className="text-white">Venue</span><span className="text-blue-500">Plus</span>
          </p>
          {tenantName ? (
            <p className="text-slate-300 text-sm font-semibold">{tenantName}</p>
          ) : null}
          <p className="text-slate-400 text-sm mt-1">Terminal Activation</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
          {/* Icon */}
          <div className="flex items-center justify-center mb-5">
            <div className="w-12 h-12 rounded-xl bg-blue-900/40 border border-blue-700/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-white text-center mb-1">
            Activate This Terminal
          </h2>
          <p className="text-slate-400 text-xs text-center mb-6">
            Enter the license key from your VenuePlus admin panel to activate this POS terminal.
          </p>

          <form onSubmit={handleActivate} className="space-y-5">
            {/* License key input — 4 segments */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                License Key
              </label>
              <div className="flex items-center gap-2">
                {/* Segment 1 — "VP" prefix */}
                <input
                  ref={ref1}
                  type="text"
                  maxLength={4}
                  autoFocus
                  className="w-14 bg-slate-700 border border-slate-600 rounded-xl px-2 py-3 text-white text-sm font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VP"
                  value={key1}
                  onChange={(e) => handleSegment(e.target.value, setKey1, ref2)}
                />
                <span className="text-slate-500 font-bold">—</span>
                {/* Segment 2 */}
                <input
                  ref={ref2}
                  type="text"
                  maxLength={4}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-2 py-3 text-white text-sm font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="XXXX"
                  value={key2}
                  onChange={(e) => handleSegment(e.target.value, setKey2, ref3)}
                />
                <span className="text-slate-500 font-bold">—</span>
                {/* Segment 3 */}
                <input
                  ref={ref3}
                  type="text"
                  maxLength={4}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-2 py-3 text-white text-sm font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="XXXX"
                  value={key3}
                  onChange={(e) => handleSegment(e.target.value, setKey3, ref4)}
                />
                <span className="text-slate-500 font-bold">—</span>
                {/* Segment 4 */}
                <input
                  ref={ref4}
                  type="text"
                  maxLength={4}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-2 py-3 text-white text-sm font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="XXXX"
                  value={key4}
                  onChange={(e) => handleSegment(e.target.value, setKey4, null)}
                />
              </div>
              <p className="text-slate-500 text-xs mt-2 text-center">
                Format: VP-XXXX-XXXX-XXXX
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || key1.length < 2 || key2.length < 4 || key3.length < 4 || key4.length < 4}
              className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Activating…
                </span>
              ) : 'Activate Terminal'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6 leading-relaxed">
          Contact your venue administrator to get a license key.<br />
          Each terminal requires its own license.
        </p>

        <p className="text-center text-slate-600 text-xs mt-3" suppressHydrationWarning>
          VenuePlus © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
