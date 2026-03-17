'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { usePosStore } from '@/store/posStore'
import clsx from 'clsx'

const TABS = [
  { href: '/reports/overview',      label: 'Overview',      icon: '📊' },
  { href: '/reports/sales',         label: 'Sales',         icon: '🛒' },
  { href: '/reports/products',      label: 'Products',      icon: '📦' },
  { href: '/reports/payments',      label: 'Payments',      icon: '💳' },
  { href: '/reports/till-sessions', label: 'Till Sessions', icon: '🗃️' },
]

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const token    = usePosStore((s) => s.token)
  const staff    = usePosStore((s) => s.staff)

  // Auth guard
  useEffect(() => {
    if (!token) { router.replace('/login'); return }
    const isAdmin = staff?.roles?.some((r) =>
      ['super_admin', 'venue_admin', 'manager'].includes(r)
    )
    const hasReportPerm = staff?.permissions?.some((p) =>
      ['report.financial', 'report.operational'].includes(p)
    )
    if (!isAdmin && !hasReportPerm) { router.replace('/'); return }
  }, [token, staff, router])

  if (!token) return null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* ── Topbar ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline">Home</span>
          </Link>
          <span className="text-slate-700">|</span>
          <span className="text-white font-semibold text-sm sm:text-base">📊 Reports</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <span className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-xs">
            {staff?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </span>
          <span className="hidden sm:block text-slate-300 text-xs">{staff?.name}</span>
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <nav className="bg-slate-900/60 border-b border-slate-800 px-3 sm:px-6 overflow-x-auto shrink-0">
        <div className="flex gap-0.5 min-w-max">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  active
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
