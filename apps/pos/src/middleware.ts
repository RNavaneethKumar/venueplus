// ============================================================================
// Next.js Edge Middleware — Tenant Slug Propagation
//
// Runs at the edge on every request before any page or API route is hit.
// Extracts the tenant slug from the subdomain and injects it as a response
// header so SSR/server components can read it without window.location.
//
// Subdomain patterns supported:
//   greenpark.venueplus.io        → slug = "greenpark"
//   greenpark.localhost:3000      → slug = "greenpark"   (localhost dev)
//   localhost:3000                → slug from NEXT_PUBLIC_TENANT_SLUG env var
//   127.0.0.1:3000                → slug from NEXT_PUBLIC_TENANT_SLUG env var
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next()

  const slug = resolveTenantSlug(request.headers.get('host') ?? '')
  if (slug) {
    response.headers.set('x-tenant-slug', slug)
  }

  return response
}

function resolveTenantSlug(host: string): string {
  // Strip port
  const bare = host.split(':')[0] ?? ''

  // Bare "localhost" or IPv4 — no subdomain, use env var fallback
  if (bare === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(bare)) {
    return process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''
  }

  // Has at least one dot  →  extract everything before the first dot as slug
  // Works for both:
  //   greenpark.localhost        (dev)
  //   greenpark.venueplus.io     (prod)
  const dotIndex = bare.indexOf('.')
  if (dotIndex > 0) {
    return bare.substring(0, dotIndex)
  }

  return process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''
}

// Apply to all routes except Next.js internals and static assets
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
