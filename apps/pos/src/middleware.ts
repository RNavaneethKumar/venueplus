// ============================================================================
// Next.js Edge Middleware — Tenant Slug Propagation
//
// Runs at the edge on every request before any page or API route is hit.
// Resolves the tenant slug and:
//   1. Sets x-tenant-slug response header (for SSR / server components)
//   2. Sets venueplus_tenant cookie (readable by browser JS / axios interceptor)
//
// Slug resolution priority:
//   1. Subdomain   — greenpark.venueplus.io  → "greenpark"
//   2. Runtime env — TENANT_SLUG env var (set in docker-compose, no rebuild needed)
//   3. Build-time  — NEXT_PUBLIC_TENANT_SLUG baked into the image
//
// Subdomain patterns supported:
//   greenpark.venueplus.io        → slug = "greenpark"
//   greenpark.localhost:3000      → slug = "greenpark"   (localhost dev)
//   localhost:3000                → slug from TENANT_SLUG or NEXT_PUBLIC_TENANT_SLUG
//   127.0.0.1:3000                → slug from TENANT_SLUG or NEXT_PUBLIC_TENANT_SLUG
//   venueplus.local:3001          → slug from TENANT_SLUG or NEXT_PUBLIC_TENANT_SLUG (.local = mDNS)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next()

  const slug = resolveTenantSlug(request.headers.get('host') ?? '')

  if (slug) {
    // Header for SSR / server components
    response.headers.set('x-tenant-slug', slug)

    // Cookie so browser-side JS (axios interceptor) can read the slug at
    // runtime without depending on the build-time NEXT_PUBLIC_TENANT_SLUG value.
    response.cookies.set('venueplus_tenant', slug, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,  // must be readable by client-side JS
      // No maxAge — session cookie, refreshed on every request
    })
  }

  return response
}

function resolveTenantSlug(host: string): string {
  // Strip port
  const bare = host.split(':')[0] ?? ''
  const fallback = process.env.TENANT_SLUG || process.env.NEXT_PUBLIC_TENANT_SLUG || ''

  // Raw IPv4 — no subdomain
  if (/^\d+\.\d+\.\d+\.\d+$/.test(bare)) return fallback

  // Plain "localhost" — no subdomain
  if (bare === 'localhost') return fallback

  const parts = bare.split('.')

  // .local mDNS hostnames (Bonjour / Windows LAN) — always use env var
  if (parts[parts.length - 1] === 'local') {
    return fallback
  }

  // Everything else — extract first segment as subdomain slug:
  //   greenpark.localhost     → "greenpark"
  //   greenpark.venueplus.io  → "greenpark"
  const dotIndex = bare.indexOf('.')
  if (dotIndex > 0) {
    return bare.substring(0, dotIndex)
  }

  return fallback
}

// Apply to all routes except Next.js internals and static assets
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
