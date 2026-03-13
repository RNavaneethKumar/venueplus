import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  customerSegments,
  customerSegmentMembers,
  customerTags,
  customerNotes,
  customerActivities,
  marketingCampaigns,
  alertRules,
  alertsLog,
  accounts,
  eq,
  and,
  sql,
  type DB,
} from '@venueplus/database'
import { requireStaff, requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


export async function crmRoutes(fastify: FastifyInstance): Promise<void> {
  /** GET /api/v1/crm/segments — list customer segments */
  fastify.get(
    '/segments',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const segments = await db
        .select()
        .from(customerSegments)
        .where(
          and(
            eq(customerSegments.venueId, request.venueId!),
            eq(customerSegments.isActive, true)
          )
        )

      return reply.send({ success: true, data: segments })
    }
  )

  /** GET /api/v1/crm/accounts/:id/timeline — full activity timeline */
  fastify.get<{ Params: { id: string } }>(
    '/accounts/:id/timeline',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const activities = await db
        .select()
        .from(customerActivities)
        .where(
          and(
            eq(customerActivities.accountId, request.params.id),
            eq(customerActivities.venueId, request.venueId!)
          )
        )
        .orderBy(sql`${customerActivities.occurredAt} DESC`)
        .limit(50)

      return reply.send({ success: true, data: activities })
    }
  )

  /** GET /api/v1/crm/accounts/:id/tags */
  fastify.get<{ Params: { id: string } }>(
    '/accounts/:id/tags',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const tags = await db
        .select()
        .from(customerTags)
        .where(eq(customerTags.accountId, request.params.id))

      return reply.send({ success: true, data: tags })
    }
  )

  /** POST /api/v1/crm/accounts/:id/tags */
  fastify.post<{ Params: { id: string } }>(
    '/accounts/:id/tags',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { tag } = z.object({ tag: z.string().min(1).max(50) }).parse(request.body)

      await db.insert(customerTags).values({
        accountId: request.params.id,
        tag,
        appliedBy: 'staff',
      })

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: { tag } })
    }
  )

  /** POST /api/v1/crm/accounts/:id/notes */
  fastify.post<{ Params: { id: string } }>(
    '/accounts/:id/notes',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { note } = z.object({ note: z.string().min(1) }).parse(request.body)
      const operatorId = (request.user as any)?.staffId ?? (request.user as any)?.sub

      const [inserted] = await db
        .insert(customerNotes)
        .values({
          accountId: request.params.id,
          venueId: request.venueId!,
          note,
          createdBy: operatorId,
        })
        .returning()

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: inserted })
    }
  )

  /** GET /api/v1/crm/campaigns — list marketing campaigns */
  fastify.get(
    '/campaigns',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const campaigns = await db
        .select()
        .from(marketingCampaigns)
        .where(eq(marketingCampaigns.venueId, request.venueId!))
        .orderBy(sql`${marketingCampaigns.createdAt} DESC`)

      return reply.send({ success: true, data: campaigns })
    }
  )

  /** GET /api/v1/crm/alerts — recent alerts log */
  fastify.get(
    '/alerts',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { unresolved } = request.query as { unresolved?: string }

      const conditions: any[] = [eq(alertsLog.venueId, request.venueId!)]
      if (unresolved === 'true') {
        conditions.push(sql`${alertsLog.resolvedAt} IS NULL`)
      }

      const alerts = await db
        .select()
        .from(alertsLog)
        .where(and(...conditions))
        .orderBy(sql`${alertsLog.createdAt} DESC`)
        .limit(100)

      return reply.send({ success: true, data: alerts })
    }
  )
}
