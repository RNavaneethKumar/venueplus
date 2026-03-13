'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const NAV_LINKS = [
  { href: '/tickets', label: 'Tickets' },
  { href: '/memberships', label: 'Memberships' },
  { href: '/plan', label: 'Plan Your Visit' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container-page flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-sm">
            VP
          </div>
          <span className="font-black text-lg text-gray-900">FunZone</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'text-sm font-medium transition-colors',
                pathname?.startsWith(link.href)
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/account" className="text-sm text-gray-600 hover:text-gray-900">
            My Account
          </Link>
          <Link href="/tickets" className="btn-primary text-sm py-2 px-4 rounded-lg">
            Book Now
          </Link>
        </div>
      </div>
    </header>
  )
}
