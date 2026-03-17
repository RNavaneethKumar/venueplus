'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePosStore } from '@/store/posStore'
import { getCompanionDevice } from '@/lib/companionApi'

// ─── Tile definitions ─────────────────────────────────────────────────────────

interface Tile {
  id:          string
  label:       string
  description: string
  href:        string
  color:       string          // Tailwind colour token used for border + icon + badge
  icon:        React.ReactNode
  badge?:      string | undefined  // small label under the title, e.g. "Device not activated"
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function IconPOS() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h13M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
    </svg>
  )
}

function IconBackOffice() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
    </svg>
  )
}

function IconReports() {
  return (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

// ─── Colour maps ─────────────────────────────────────────────────────────────

const colorMap: Record<string, { border: string; icon: string; bg: string; btn: string }> = {
  blue:   { border: 'border-blue-700/50',   icon: 'text-blue-400',   bg: 'bg-blue-900/20',   btn: 'bg-blue-600 hover:bg-blue-500' },
  violet: { border: 'border-violet-700/50', icon: 'text-violet-400', bg: 'bg-violet-900/20', btn: 'bg-violet-600 hover:bg-violet-500' },
  emerald:{ border: 'border-emerald-700/50',icon: 'text-emerald-400',bg: 'bg-emerald-900/20',btn: 'bg-emerald-600 hover:bg-emerald-500' },
}

// ─── Dashboard tile component ─────────────────────────────────────────────────

function DashboardTile({ tile }: { tile: Tile }) {
  const c = colorMap[tile.color] ?? colorMap['blue']!
  return (
    <Link
      href={tile.href}
      className={`group flex flex-col gap-5 p-6 rounded-2xl border ${c.border}
                  bg-slate-900 hover:bg-slate-800/80 transition-all duration-200
                  hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5`}
    >
      {/* Icon */}
      <div className={`w-14 h-14 rounded-xl ${c.bg} border ${c.border}
                       flex items-center justify-center ${c.icon} shrink-0`}>
        {tile.icon}
      </div>

      {/* Text */}
      <div className="flex-1">
        <p className="text-white font-semibold text-lg leading-tight">{tile.label}</p>
        {tile.badge && (
          <p className="text-xs text-amber-400 font-medium mt-0.5">{tile.badge}</p>
        )}
        <p className="text-slate-400 text-sm mt-1 leading-snug">{tile.description}</p>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-end">
        <span className={`text-xs font-semibold ${c.icon} flex items-center gap-1
                          group-hover:gap-2 transition-all`}>
          Open
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { token, staff, logout, hasRole, hasPermission } = usePosStore()
  const [deviceActivated, setDeviceActivated] = useState(false)

  // Auth guard — redirect to login if no token
  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  // Check if this terminal is activated in the Companion
  useEffect(() => {
    getCompanionDevice().then((d) => setDeviceActivated(Boolean(d?.token)))
  }, [])

  if (!token || !staff) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Role / permission checks ──────────────────────────────────────────────
  const isAdmin      = hasRole('super_admin', 'venue_admin', 'manager')
  const canReports   = isAdmin || hasPermission('report.financial') || hasPermission('report.operational')

  // ── Build tile list based on role ─────────────────────────────────────────
  const tiles: Tile[] = []

  // POS Sales — everyone sees this; warn if device not activated
  tiles.push({
    id:          'pos',
    label:       'POS Sales',
    description: deviceActivated
      ? 'Process tickets, F&B, retail and membership sales.'
      : 'Activate this terminal to start processing sales.',
    href:        deviceActivated ? '/pos' : '/activate',
    color:       'blue',
    icon:        <IconPOS />,
    badge:       deviceActivated ? undefined : '⚠ Device not activated',
  })

  // Back Office — admin roles only
  if (isAdmin) {
    tiles.push({
      id:          'admin',
      label:       'Back Office',
      description: 'Manage users, products, devices, venue settings and more.',
      href:        '/admin',
      color:       'violet',
      icon:        <IconBackOffice />,
    })
  }

  // Reports — admin or report permissions
  if (canReports) {
    tiles.push({
      id:          'reports',
      label:       'Reports',
      description: 'Revenue summaries, sales breakdowns and operational reports.',
      href:        '/reports',
      color:       'emerald',
      icon:        <IconReports />,
    })
  }

  const handleLogout = () => {
    logout()
    if (typeof window !== 'undefined') window.localStorage.removeItem('pos_token')
    router.push('/login')
  }

  return (
    <div className="min-h-full bg-gray-950 flex flex-col">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tight select-none">
            <span className="text-white">Venue</span><span className="text-blue-500">Plus</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 leading-none">{staff.roles?.[0] ?? 'Staff'}</p>
            <p className="text-sm font-semibold text-white leading-none mt-0.5">{staff.name}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold uppercase select-none text-white">
            {staff.name?.[0] ?? '?'}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400
                       hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full">

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Hello, {staff.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">What would you like to do today?</p>
        </div>

        {/* Tile grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiles.map((tile) => (
            <DashboardTile key={tile.id} tile={tile} />
          ))}
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="py-4 text-center">
        <p className="text-slate-600 text-xs" suppressHydrationWarning>
          VenuePlus © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
