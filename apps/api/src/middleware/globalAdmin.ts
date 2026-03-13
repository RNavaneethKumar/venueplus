// ============================================================================
// Global Admin Middleware
//
// Guards routes that only super-admins (global_admins table in registry DB)
// may access. Completely separate from per-tenant staff authentication.
//
// A global admin JWT carries:  { sub, email, name, role: 'global_admin' }
// ============================================================================

import type { FastifyRequest, FastifyReply } from 'fastify'
import { HTTP_STATUS } from '@venueplus/shared'

export interface GlobalAdminJWT {
  sub:   string
  email: string
  name:  string
  role:  'global_admin'
  iat:   number
  exp:   number
}

/**
 * Fastify preHandler — verifies the Bearer token and asserts role === 'global_admin'.
 * Attaches the decoded payload to request.globalAdmin.
 */
export async function requireGlobalAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    reply.status(HTTP_STATUS.UNAUTHORIZED).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
    })
    return
  }

  const token = auth.slice(7)

  try {
    const payload = request.server.jwt.verify<GlobalAdminJWT>(token)

    if (payload.role !== 'global_admin') {
      reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Global admin access required' },
      })
      return
    }

    request.globalAdmin = payload
  } catch {
    reply.status(HTTP_STATUS.UNAUTHORIZED).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    })
  }
}
