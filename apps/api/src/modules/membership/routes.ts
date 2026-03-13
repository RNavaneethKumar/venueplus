import type { FastifyInstance } from 'fastify'
import {
  db as globalDb,
  memberships,
  membershipPlans,
  membershipBenefits,
  membershipMembers,
  membershipAllowanceBalances,
  eq,
  and,
  type DB,
} from '@venueplus/database'
import { requireAuth, requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


export async function membershipRoutes(fastify: FastifyInstance): Promise<void> {
  /** GET /api/v1/memberships/plans — list available plans */
  fastify.get('/plans', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const plans = await db
      .select()
      .from(membershipPlans)
      .where(and(eq(membershipPlans.venueId, venueId), eq(membershipPlans.isActive, true)))

    return reply.send({ success: true, data: plans })
  })

  /** GET /api/v1/memberships/plans/:id — plan details with benefits */
  fastify.get<{ Params: { id: string } }>(
    '/plans/:id',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const plan = await db.query.membershipPlans.findFirst({
        where: eq(membershipPlans.id, request.params.id),
        with: { benefits: true },
      })

      if (!plan) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Membership plan not found' },
        })
      }

      return reply.send({ success: true, data: plan })
    }
  )

  /** GET /api/v1/memberships/me — current account's active membership */
  fastify.get(
    '/me',
    { preHandler: [requireAuth, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const accountId = (request.user as any).accountId

      const membership = await db.query.memberships.findFirst({
        where: and(eq(memberships.accountId, accountId), eq(memberships.status, 'active')),
        with: { plan: { with: { benefits: true } }, members: true, allowanceBalances: true },
      })

      return reply.send({ success: true, data: membership ?? null })
    }
  )

  /** GET /api/v1/memberships/:id — membership details (staff) */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const membership = await db.query.memberships.findFirst({
        where: eq(memberships.id, request.params.id),
        with: { plan: { with: { benefits: true } }, members: true, allowanceBalances: true },
      })

      if (!membership) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'MEMBERSHIP_NOT_FOUND', message: 'Membership not found' },
        })
      }

      return reply.send({ success: true, data: membership })
    }
  )

  /** POST /api/v1/memberships/:id/pause */
  fastify.post<{ Params: { id: string } }>(
    '/:id/pause',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      await db
        .update(memberships)
        .set({ status: 'paused', pausedAt: new Date(), updatedAt: new Date() })
        .where(eq(memberships.id, request.params.id))

      return reply.send({ success: true, data: { paused: true } })
    }
  )

  /** POST /api/v1/memberships/:id/cancel */
  fastify.post<{ Params: { id: string } }>(
    '/:id/cancel',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      await db
        .update(memberships)
        .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(memberships.id, request.params.id))

      return reply.send({ success: true, data: { cancelled: true } })
    }
  )
}
