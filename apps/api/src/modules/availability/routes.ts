import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  resources,
  resourceSlots,
  capacityHolds,
  eq,
  and,
  gte,
  sql,
  type DB,
} from '@venueplus/database'
import { requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


// ─── Schemas ──────────────────────────────────────────────────────────────────

const AvailabilityQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resourceId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function availabilityRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/availability/slots
   * Returns slot availability for a given date (and optional resource).
   */
  fastify.get('/slots', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const query = AvailabilityQuery.parse(request.query)

    const slots = await db
      .select({
        slot: resourceSlots,
        resource: resources,
        activeHolds: sql<number>`
          COUNT(${capacityHolds.id}) FILTER (
            WHERE ${capacityHolds.status} = 'active'
            AND ${capacityHolds.expiresAt} > NOW()
          )`.as('active_holds'),
      })
      .from(resourceSlots)
      .innerJoin(resources, eq(resourceSlots.resourceId, resources.id))
      .leftJoin(
        capacityHolds,
        and(
          eq(capacityHolds.resourceSlotId, resourceSlots.id),
          eq(capacityHolds.status, 'active'),
          gte(capacityHolds.expiresAt, new Date())
        )
      )
      .where(
        and(
          eq(resources.venueId, venueId),
          // Filter by slotDate (date column) — much simpler than comparing times
          eq(resourceSlots.slotDate, query.date),
          eq(resourceSlots.isActive, true),
          ...(query.resourceId ? [eq(resourceSlots.resourceId, query.resourceId)] : [])
        )
      )
      .groupBy(resourceSlots.id, resources.id)
      .orderBy(resourceSlots.startTime)

    const result = slots.map(({ slot, resource, activeHolds }) => {
      const holds = Number(activeHolds)
      // capacity from the slot overrides the resource-level capacity
      const totalCapacity = slot.capacity ?? resource.capacity ?? 0
      const available = totalCapacity - holds
      return {
        slotId: slot.id,
        resourceId: resource.id,
        resourceName: resource.name,
        slotDate: slot.slotDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalCapacity,
        activeHolds: holds,
        availableCount: Math.max(0, available),
        isSoldOut: available <= 0,
      }
    })

    return reply.send({ success: true, data: result })
  })

  /**
   * GET /api/v1/availability/resources
   * Returns list of resources with current live headcount.
   */
  fastify.get('/resources', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!

    const allResources = await db
      .select()
      .from(resources)
      .where(and(eq(resources.venueId, venueId), eq(resources.isActive, true)))
      .orderBy(resources.name)

    return reply.send({ success: true, data: allResources })
  })

  /**
   * POST /api/v1/availability/hold
   * Create a capacity hold (reservation lock during checkout).
   */
  fastify.post('/hold', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const body = z
      .object({
        items: z.array(
          z.object({
            productId: z.string().uuid(),
            resourceSlotId: z.string().uuid().optional(),
            resourceId: z.string().uuid().optional(),
            quantity: z.number().int().positive(),
            visitorTypeId: z.string().uuid().optional(), // passed through to hold row
          })
        ),
        channel: z.enum(['online', 'pos', 'kiosk', 'mobile', 'gate']),
        sessionToken: z.string().optional(),
      })
      .parse(request.body)

    const venueId = request.venueId!
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min TTL
    const holdIds: string[] = []

    for (const item of body.items) {
      if (!item.resourceSlotId && !item.resourceId) continue

      const holdFrom = new Date()
      const [hold] = await db
        .insert(capacityHolds)
        .values({
          venueId,
          resourceId: item.resourceId ?? item.resourceSlotId ?? venueId, // resourceId required
          resourceSlotId: item.resourceSlotId ?? null,
          sessionToken: body.sessionToken ?? `sess_${Date.now()}`,
          visitorTypeId: item.visitorTypeId ?? '00000000-0000-0000-0000-000000000000',
          quantity: item.quantity,
          holdFrom,
          holdUntil: expiresAt,
          expiresAt,
          status: 'active',
        })
        .returning({ id: capacityHolds.id })

      holdIds.push(hold!.id)
    }

    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: { holdIds, expiresAt, ttlSeconds: 900 },
    })
  })

  /**
   * DELETE /api/v1/availability/hold/:holdId
   * Release a capacity hold.
   */
  fastify.delete<{ Params: { holdId: string } }>(
    '/hold/:holdId',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { holdId } = request.params

      await db
        .update(capacityHolds)
        .set({ status: 'released' })
        .where(eq(capacityHolds.id, holdId))

      return reply.send({ success: true, data: { released: holdId } })
    }
  )
}
