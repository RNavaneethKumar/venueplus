'use client'

import { useEffect, useRef, useState } from 'react'
import { usePosStore } from '@/store/posStore'
import { useRouter } from 'next/navigation'
import { posApi } from '@/lib/api'

export default function Topbar() {
  const { staff, logout, hasRole, hasPermission } = usePosStore()
  const router = useRouter()

  const canManage =
    hasRole('manager', 'venue_admin', 'super_admin') ||
    hasPermission('report.financial') ||
    hasPermission('report.operational')

  const [liveRevenue, setLiveRevenue]   = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Live revenue polling
  useEffect(() => {
    posApi.reports.liveRevenue()
      .then((r) => setLiveRevenue(r.data.data.totalRevenue))
      .catch(() => {})
    const iv = setInterval(() => {
      posApi.reports.liveRevenue()
        .then((r) => setLiveRevenue(r.data.data.totalRevenue))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(iv)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    logout()
    window.localStorage.removeItem('pos_token')
    router.push('/login')
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0">

      {/* Logo — VenuePlus text mark */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-black tracking-tight select-none leading-none">
          <span className="text-white">Venue</span><span className="text-blue-500">Plus</span>
        </span>
        <span className="hidden sm:block text-xs text-slate-500 border-l border-slate-700 pl-3">POS Terminal</span>
      </div>

      {/* Right: revenue + staff dropdown */}
      <div className="flex items-center gap-4">
        {liveRevenue !== null && (
          <div className="text-right">
            <p className="text-xs text-slate-400 leading-none">Today</p>
            <p className="text-sm font-bold text-green-400 tabular-nums leading-none mt-0.5">
              ₹{Number(liveRevenue).toLocaleString('en-IN')}
            </p>
          </div>
        )}

        {/* Staff name — click to open dropdown */}
        <div className="relative" ref={dropdownRef}>
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
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Staff info */}
              <div className="px-3 py-2.5 border-b border-slate-700">
                <p className="text-xs text-slate-400 truncate">
                  {staff?.roles?.[0] ?? 'Staff'}
                </p>
                <p className="text-sm text-white font-semibold truncate">
                  {staff?.name ?? '—'}
                </p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
