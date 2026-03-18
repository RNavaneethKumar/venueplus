'use client'

import { useEffect, useRef, useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { useRouter } from 'next/navigation'
import { getCompanionDevice } from '@/lib/companionApi'

export default function Topbar() {
  const { staff, logout, hasRole, hasPermission } = usePosStore()
  const router = useRouter()

  const canManage =
    hasRole('manager', 'venue_admin', 'super_admin') ||
    hasPermission('report.financial') ||
    hasPermission('report.operational')

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [deviceName, setDeviceName]     = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Read device name from Companion
  useEffect(() => {
    getCompanionDevice().then((d) => setDeviceName(d?.name ?? null))
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    window.localStorage.removeItem('pos_token')
    router.push('/login')
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0">

      {/* Logo + Home button */}
      <div className="flex items-center gap-3">
        {/* Home button */}
        <button
          onClick={() => router.push('/')}
          title="Dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     text-slate-400 hover:text-white hover:bg-slate-700
                     active:bg-slate-600 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <span className="text-lg font-black tracking-tight select-none leading-none">
          <span className="text-white">Venue</span><span className="text-blue-500">Plus</span>
        </span>
        <span className="hidden sm:block text-xs text-slate-500 border-l border-slate-700 pl-3">
          {deviceName ?? 'POS Terminal'}
        </span>
      </div>

      {/* Right: customer display + staff dropdown */}
      <div className="flex items-center gap-2">

        {/* Customer Display — opens the customer-facing cart view in a new window */}
        <button
          onClick={() => window.open('/pos/display', '_blank', 'noopener,noreferrer')}
          title="Open Customer Display"
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     text-slate-400 hover:text-white hover:bg-slate-700
                     active:bg-slate-600 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Staff name — click to open dropdown */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-colors text-sm"
          >
            <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold uppercase select-none">
              {staff?.name?.[0] ?? '?'}
            </div>
            <span className="text-white font-medium max-w-[120px] truncate">
              {staff?.name ?? '—'}
            </span>
            {/* caret */}
            <svg
              className={`w-3 h-3 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Staff info */}
              <div className="px-3 py-2.5 border-b border-slate-700">
                <p className="text-xs text-slate-400 truncate">
                  {staff?.roles?.[0] ?? 'Staff'}
                </p>
                <p className="text-sm text-white font-semibold truncate">
                  {staff?.name ?? '—'}
                </p>
                {deviceName && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    🖥 {deviceName}
                  </p>
                )}
              </div>

              {/* Dashboard */}
              <button
                onClick={() => { setDropdownOpen(false); router.push('/') }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </button>

              {/* Back Office (admins only) */}
              {canManage && (
                <button
                  onClick={() => { setDropdownOpen(false); router.push('/admin') }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Back Office
                </button>
              )}

              <div className="border-t border-slate-700" />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
