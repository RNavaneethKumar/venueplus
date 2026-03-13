'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

export default function GlobalAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [adminName, setAdminName] = useState<string | null>(null)
  const [ready, setReady]         = useState(false)

  useEffect(() => {
    if (pathname === '/global-admin/login') {
      setReady(true)
      return
    }

    const token = localStorage.getItem('ga_token')
    const name  = localStorage.getItem('ga_admin_name')

    if (!token) {
      router.replace('/global-admin/login')
      return
    }

    setAdminName(name)
    setReady(true)
  }, [pathname, router])

  const handleLogout = () => {
    localStorage.removeItem('ga_token')
    localStorage.removeItem('ga_admin_name')
    router.push('/global-admin/login')
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Login page — no chrome
  if (pathname === '/global-admin/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Small hex icon */}
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-violet-500 fill-current">
            <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
          </svg>
          <span className="font-bold text-white tracking-tight">VenuePlus</span>
          <span className="text-gray-500 text-sm font-medium px-2 py-0.5 bg-gray-800 rounded ml-1">
            Global Admin
          </span>
        </div>

        <nav className="flex-1 flex gap-1 ml-6">
          <Link
            href="/global-admin/tenants"
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              pathname.startsWith('/global-admin/tenants')
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Tenants
          </Link>
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          {adminName && (
            <span className="text-sm text-gray-400">
              {adminName}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-gray-800"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
