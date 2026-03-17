/**
 * GET /api/runtime-config
 *
 * Returns runtime configuration values that cannot be baked into the Next.js
 * bundle at build time. This route runs in the Node.js runtime (not Edge),
 * so it has full access to process.env — including TENANT_SLUG set in
 * docker-compose.yml at container start time.
 *
 * Used by the client-side API interceptor as a reliable fallback when the
 * Edge Middleware cannot read the runtime TENANT_SLUG env var.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'  // never cache — env vars can change between restarts

export function GET() {
  return NextResponse.json({
    tenantSlug: process.env['TENANT_SLUG'] ?? process.env['NEXT_PUBLIC_TENANT_SLUG'] ?? '',
  })
}
