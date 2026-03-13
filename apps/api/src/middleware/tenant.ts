// ============================================================================
// Tenant Resolution Middleware
//
// Reads the x-tenant-slug header on every incoming request, looks up the
// matching tenant in the central registry DB, and attaches the per-tenant
// Drizzle instance + venueId to the Fastify request object.
//
// In single-tenant mode (REGISTRY_DATABASE_URL not set), this hook is a no-op
// and all routes continue to use the global `db` from @venueplus/database.
// ============================================================================

import type { FastifyRequest, FastifyReply } from 'fastify'
import { findTenantBySlug, getRegistryDb } from '@venueplus/database'
import { getTenantDb } from '@venueplus/database'

// ── Paths that bypass tenant resolution ──────────────────────────────────────
const UNGUARDED = new Set(['/health', '/docs', '/docs/json', '/docs/yaml'])

/**
 * Fastify onRequest hook — resolves the tenant and populates:
 *   request.tenantDb        → per-tenant Drizzle DB instance
 *   request.tenantVenueId   → primary venue UUID within that tenant's DB
 *   request.tenantSlug      → slug string (for logging / audit)
 *
 * Falls through without error when REGISTRY_DATABASE_URL is not configured
 * (single-tenant / local dev mode).
 */
export async function resolveTenant(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip paths that don't need tenant context
  const path = (request.url ?? '').split('?')[0] ?? ''
  if (UNGUARDED.has(path) || path.startsWith('/docs')) return
  // Global admin routes operate directly on the registry DB — never tenant-scoped
  if (path.startsWith('/api/v1/global-admin')) return

  // Single-tenant mode — registry not configured, nothing to do
  if (!getRegistryDb()) return

  const slug = request.headers['x-tenant-slug'] as string | undefined

  if (!slug) {
    reply.status(400).send({
      success: false,
      error: {
        code:    'MISSING_TENANT',
        message: 'Missing required header: x-tenant-slug',
      },
    })
    return
  }

  const tenant = await findTenantBySlug(slug)

  if (!tenant) {
    reply.status(404).send({
      success: false,
      error: {
        code:    'TENANT_NOT_FOUND',
        message: `Tenant '${slug}' not found or is inactive`,
      },
    })
    return
  }

  // Attach to request for use by route handlers
  request.tenantDb       = getTenantDb(tenant.dbUrl)
  request.tenantVenueId  = tenant.defaultVenueId
  request.tenantSlug     = slug

  // Also satisfy requireVenueHeader() without needing an extra header
  request.venueId = tenant.defaultVenueId
}
