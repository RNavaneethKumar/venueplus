import type { FastifyReply, FastifyRequest } from 'fastify'
import { HTTP_STATUS, ERROR_CODES, type AuthUser } from '@venueplus/shared'

// ─── JWT payload typing ───────────────────────────────────────────────────────
// Tells @fastify/jwt the shape of the decoded token so request.user is typed
// as AuthUser after jwtVerify() without conflicting with the base declaration.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthUser
  }
}

// Extend FastifyRequest with venue + tenant context
declare module 'fastify' {
  interface FastifyRequest {
    /** Resolved from x-venue-id header (single-tenant) or tenant registry (multi-tenant) */
    venueId?: string

    /** Per-tenant Drizzle DB instance. Undefined in single-tenant mode — use global `db`. */
    tenantDb?: import('@venueplus/database').DB

    /** Primary venue UUID sourced from the tenant registry. */
    tenantVenueId?: string

    /** Tenant slug (subdomain) extracted from x-tenant-slug header. */
    tenantSlug?: string

    /** Set by requireGlobalAdmin — decoded JWT payload for super-admin routes. */
    globalAdmin?: import('./globalAdmin.js').GlobalAdminJWT
  }
}

// ─── Guards ───────────────────────────────────────────────────────────────────

/**
 * Requires a valid JWT. Sets req.user via jwtVerify().
 * Returns true if auth passed, false if a 401 was sent (so callers can guard).
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  try {
    await request.jwtVerify()
    return true
  } catch {
    reply.status(HTTP_STATUS.UNAUTHORIZED).send({
      success: false,
      error: { code: ERROR_CODES.TOKEN_EXPIRED, message: 'Unauthorized' },
    })
    return false
  }
}

/**
 * Requires a staff user (has staffId / PIN login).
 */
export async function requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const ok = await requireAuth(request, reply)
  if (!ok) return
  if (!(request.user as AuthUser)?.staffId) {
    reply.status(HTTP_STATUS.FORBIDDEN).send({
      success: false,
      error: { code: ERROR_CODES.INSUFFICIENT_PERMISSIONS, message: 'Staff access required' },
    })
  }
}

/**
 * Higher-order guard: requires specific permission.
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ok = await requireAuth(request, reply)
    if (!ok) return
    if (!(request.user as AuthUser)?.permissions?.includes(permission)) {
      reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: {
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: `Missing required permission: ${permission}`,
        },
      })
    }
  }
}

/**
 * Higher-order guard: requires one of many roles.
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ok = await requireAuth(request, reply)
    if (!ok) return
    if (!(request.user as AuthUser)?.roles?.some((r: string) => roles.includes(r))) {
      reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: {
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: `Required role: ${roles.join(' or ')}`,
        },
      })
    }
  }
}

/**
 * Extracts venueId from header x-venue-id and attaches to request.
 */
export async function requireVenueHeader(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const venueId = request.headers['x-venue-id'] as string | undefined
  if (!venueId) {
    reply.status(HTTP_STATUS.BAD_REQUEST).send({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Missing x-venue-id header' },
    })
    return
  }
  request.venueId = venueId
}
