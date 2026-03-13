'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { posApi, getTenantSlug } from '@/lib/api'

const DEVICE_TOKEN_KEY = 'venueplus_device_token'
const DEVICE_ID_KEY    = 'venueplus_device_id'
const DEVICE_NAME_KEY  = 'venueplus_device_name'
const DEVICE_TYPE_KEY  = 'venueplus_device_type'

/** Auto-formats raw input into VP-XXXX-XXXX-XXXX as the user types. */
function formatKey(raw: string): string {
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 14)
  const parts = [clean.slice(0, 2), clean.slice(2, 6), clean.slice(6, 10), clean.slice(10, 14)]
  return parts.filter(Boolean).join('-')
}

/** Strip dashes and check we have all 14 alphanumeric chars. */
function isComplete(formatted: string): boolean {
  return formatted.replace(/-/g, '').length === 14
}

export default function ActivatePage() {
  const router  = useRouter()
  const [keyValue, setKeyValue] = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [deviceName, setDeviceName] = useState('')

  const tenantSlug = getTenantSlug()
  const tenantName = tenantSlug
    ? tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1).replace(/-/g, ' ')
    : null

  // If already activated, skip straight to login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.localStorage.getItem(DEVICE_TOKEN_KEY)) router.replace('/login')
    }
  }, [router])

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyValue(formatKey(e.target.value))
  }

  // Handle paste — strip formatting so the user can paste VP-XXXX-XXXX-XXXX directly
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    setKeyValue(formatKey(pasted))
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete(keyValue)) {
      toast.error('Please enter a complete 14-character license key')
      return
    }

    setLoading(true)
    try {
      const res = await posApi.device.activate(keyValue)
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

  /* ── Success screen ──────────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-4xl font-black tracking-tight leading-none mb-8 select-none">
            <span className="text-white">Venue</span><span className="text-blue-500">Plus</span>
          </p>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full bg-green-900/40 border-2 border-green-500/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Terminal Activated</h2>
            <p className="text-slate-400 text-sm mb-1">{deviceName}</p>
            {tenantName && <p className="text-slate-500 text-xs mb-6">{tenantName}</p>}
            <p className="text-slate-400 text-sm mb-6">
              This terminal is now licensed and ready for use.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              Sign In to POS →
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-6" suppressHydrationWarning>
            VenuePlus © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    )
  }

  /* ── Activation form ─────────────────────────────────────────────────────── */
  const complete = isComplete(keyValue)

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-4xl font-black tracking-tight leading-none mb-2 select-none">
            <span className="text-white">Venue</span><span className="text-blue-500">Plus</span>
          </p>
          {tenantName && <p className="text-slate-300 text-sm font-semibold">{tenantName}</p>}
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

            {/* Single formatted input */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                License Key
              </label>
              <input
                type="text"
                inputMode="text"
                autoFocus
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={19}  /* VP-XXXX-XXXX-XXXX = 19 chars */
                placeholder="VP-XXXX-XXXX-XXXX"
                value={keyValue}
                onChange={handleKeyChange}
                onPaste={handlePaste}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3.5
                           text-white font-mono text-base sm:text-lg tracking-widest text-center
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           placeholder:text-slate-500 placeholder:tracking-widest"
              />
              {/* Progress indicator */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-slate-500 text-xs">
                  Format: VP-XXXX-XXXX-XXXX
                </p>
                <p className={`text-xs font-medium transition-colors ${complete ? 'text-green-400' : 'text-slate-500'}`}>
                  {keyValue.replace(/-/g, '').length}/14
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !complete}
              className="w-full px-4 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-semibold text-base transition-colors"
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
