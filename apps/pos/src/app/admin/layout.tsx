'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePosStore } from '@/store/posStore'
import AdminNav from '@/components/admin/AdminNav'

/**
 * Admin layout — wraps all /admin/* pages with:
 *   1. Auth guard (redirect to /login if no token)
 *   2. Role guard (redirect to / if insufficient role)
 *   3. Left AdminNav sidebar (desktop) / overlay drawer (mobile)
 *   4. Mobile top bar with hamburger (md:hidden)
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, hasRole, hasPermission } = usePosStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const canAccessAdmin =
    hasRole('super_admin', 'venue_admin', 'manager') ||
    hasPermission('report.financial') ||
    hasPermission('report.operational') ||
    hasPermission('till.view_reports')

  useEffect(() => {
    if (!token) {
      router.replace('/login')
      return
    }
    if (!canAccessAdmin) {
      router.replace('/')
    }
  }, [token, canAccessAdmin])

  if (!token || !canAccessAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-950">

      {/* ── Mobile top bar (hamburger) — hidden on md+ ── */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-lg"
          aria-label="Open navigation"
        >
          ☰
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">🎪</span>
          <span className="font-bold text-white text-sm">VenuePlus Admin</span>
        </div>
      </div>

      {/* ── Main content row ── */}
      <div className="flex flex-1 overflow-hidden">
        <AdminNav
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
