'use client'

/**
 * AdminNav — Collapsible left sidebar for the /admin route group.
 *
 * Desktop (md+): fixed-width sidebar, collapsible to icon-only mode.
 * Mobile (<md):  hidden by default; slides in as a full overlay when
 *                mobileOpen=true. Backdrop click and nav link taps call onMobileClose.
 *
 * Sections:
 *   Reporting        → dashboard, reports, orders, till sessions
 *   People           → users, roles, customers, visitor types
 *   Products         → products/tickets, tax, resources
 *   Venue            → venue details, devices, notification templates
 *   Developer        → API keys, alert rules, audit logs
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { usePosStore } from '@/store/posStore'
import clsx from 'clsx'

interface NavItem {
  href:  string
  label: string
  icon:  string
}

interface NavSection {
  title:  string
  icon:   string
  items:  NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Reporting',
    icon:  '📊',
    items: [
      { href: '/admin/dashboard',     label: 'Dashboard',       icon: '🏠' },
      { href: '/admin/reporting',     label: 'Reports',         icon: '📈' },
      { href: '/admin/orders',        label: 'Orders',          icon: '📋' },
      { href: '/admin/till-sessions', label: 'Till Sessions',   icon: '💰' },
    ],
  },
  {
    title: 'People',
    icon:  '👥',
    items: [
      { href: '/admin/users',         label: 'Users',           icon: '👤' },
      { href: '/admin/roles',         label: 'Roles & Permissions', icon: '🔐' },
      { href: '/admin/customers',     label: 'Customers',       icon: '🙋' },
      { href: '/admin/visitor-types', label: 'Visitor Types',   icon: '🏷️' },
    ],
  },
  {
    title: 'Products',
    icon:  '🎟️',
    items: [
      { href: '/admin/products',      label: 'Products & Tickets', icon: '🎟️' },
      { href: '/admin/resources',     label: 'Resources',        icon: '🗺️' },
      { href: '/admin/tax',           label: 'Tax Structures',   icon: '🧾' },
    ],
  },
  {
    title: 'Venue',
    icon:  '🏛️',
    items: [
      { href: '/admin/venues',                 label: 'Venue Settings',          icon: '⚙️' },
      { href: '/admin/devices',                label: 'Devices',                 icon: '📱' },
      { href: '/admin/notification-templates', label: 'Notification Templates',  icon: '🔔' },
    ],
  },
  {
    title: 'Developer',
    icon:  '🛠️',
    items: [
      { href: '/admin/api-keys',     label: 'API Keys',      icon: '🔑' },
      { href: '/admin/alert-rules',  label: 'Alert Rules',   icon: '🚨' },
      { href: '/admin/audit-logs',   label: 'Audit Logs',    icon: '📜' },
    ],
  },
]

interface AdminNavProps {
  mobileOpen:    boolean
  onMobileClose: () => void
}

export default function AdminNav({ mobileOpen, onMobileClose }: AdminNavProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const { staff, logout } = usePosStore()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(NAV_SECTIONS.map((s) => s.title))
  )

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // ── Shared nav content (used by both desktop sidebar and mobile drawer) ──────

  function NavContent({ forMobile = false }: { forMobile?: boolean }) {
    return (
      <>
        {/* Logo + collapse toggle */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-slate-700 shrink-0">
          {(!collapsed || forMobile) && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 min-w-0"
              {...(forMobile && { onClick: onMobileClose })}
            >
              <span className="text-xl shrink-0">🎪</span>
              <span className="font-bold text-white text-sm truncate">VenuePlus</span>
            </Link>
          )}
          {collapsed && !forMobile && (
            <Link href="/admin/dashboard" className="mx-auto text-xl">🎪</Link>
          )}
          {!forMobile && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={clsx(
                'w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs shrink-0',
                collapsed && 'mx-auto'
              )}
            >
              {collapsed ? '›' : '‹'}
            </button>
          )}
          {forMobile && (
            <button
              onClick={onMobileClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {/* Back to POS */}
        <Link
          href="/"
          {...(forMobile && { onClick: onMobileClose })}
          className={clsx(
            'flex items-center gap-2.5 px-3 py-2.5 mx-2 mt-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium',
            collapsed && !forMobile && 'justify-center px-0'
          )}
        >
          <span className="shrink-0">←</span>
          {(!collapsed || forMobile) && <span>Back to POS</span>}
        </Link>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
          {NAV_SECTIONS.map((section) => {
            const isExpanded = expandedSections.has(section.title)
            const hasActive  = section.items.some((item) => pathname?.startsWith(item.href))

            if (collapsed && !forMobile) {
              // Collapsed desktop: show just icons
              return (
                <div key={section.title} className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={clsx(
                          'flex items-center justify-center w-10 h-10 mx-auto rounded-xl text-base transition-colors',
                          active
                            ? 'bg-blue-600/20 text-blue-300'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        {item.icon}
                      </Link>
                    )
                  })}
                  <div className="h-px bg-slate-800 mx-2 my-1" />
                </div>
              )
            }

            return (
              <div key={section.title}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                    hasActive ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  <span>{section.icon}</span>
                  <span className="flex-1 text-left">{section.title}</span>
                  <span className={clsx('transition-transform text-xs', isExpanded ? 'rotate-90' : '')}>›</span>
                </button>

                {/* Section items */}
                {isExpanded && (
                  <div className="ml-2 mt-0.5 space-y-0.5">
                    {section.items.map((item) => {
                      const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          {...(forMobile && { onClick: onMobileClose })}
                          className={clsx(
                            'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
                            active
                              ? 'bg-blue-600/20 text-blue-300 font-medium'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          )}
                        >
                          <span className="text-base shrink-0">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer: staff info + logout */}
        <div className={clsx(
          'border-t border-slate-700 shrink-0',
          collapsed && !forMobile ? 'py-3 flex flex-col items-center gap-2' : 'p-3'
        )}>
          {(!collapsed || forMobile) && staff && (
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {staff.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{staff.name}</p>
                <p className="text-slate-500 text-xs capitalize truncate">
                  {staff.roles[0] ?? 'Staff'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            className={clsx(
              'flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors',
              collapsed && !forMobile ? '' : 'w-full px-2 py-1.5 rounded-lg hover:bg-red-900/20'
            )}
          >
            <span>🚪</span>
            {(!collapsed || forMobile) && <span>Sign Out</span>}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <div
        className={clsx(
          'hidden md:flex flex-col bg-slate-900 border-r border-slate-700 transition-all duration-200 shrink-0',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        <NavContent />
      </div>

      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      {/* ── Mobile drawer (< md) ── */}
      <div
        className={clsx(
          'md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-slate-900 border-r border-slate-700 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent forMobile />
      </div>
    </>
  )
}
