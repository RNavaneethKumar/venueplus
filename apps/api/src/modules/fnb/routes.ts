import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  fnbCategories,
  fnbItems,
  kitchenOrders,
  kitchenOrderItems,
  fnbInventory,
  eq,
  and,
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


export async function fnbRoutes(fastify: FastifyInstance): Promise<void> {
  /** GET /api/v1/fnb/menu — full F&B menu grouped by category */
  fastify.get('/menu', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!

    const categories = await db
      .select()
      .from(fnbCategories)
      .where(eq(fnbCategories.venueId, venueId))
      .orderBy(fnbCategories.displayOrder)

    const items = await db
      .select({ item: fnbItems, inventory: fnbInventory })
      .from(fnbItems)
      .leftJoin(fnbInventory, eq(fnbInventory.fnbItemId, fnbItems.id))
      .where(and(eq(fnbItems.venueId, venueId), eq(fnbItems.isActive, 1)))

    const grouped = categories.map((cat) => ({
      ...cat,
      items: items
        .filter((r) => r.item.categoryId === cat.id)
        .map((r) => ({
          ...r.item,
          currentStock: r.inventory?.currentStock ?? null,
          isOutOfStock:
            r.inventory !== null &&
            Number(r.inventory.currentStock) <= 0,
        })),
    }))

    return reply.send({ success: true, data: grouped })
  })

  /** GET /api/v1/fnb/kitchen — kitchen display orders */
  fastify.get('/kitchen', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const { status, stationId } = request.query as {
      status?: string
      stationId?: string
    }

    const conditions: any[] = []
    if (status) conditions.push(eq(kitchenOrders.status, status as any))
    if (stationId) conditions.push(eq(kitchenOrders.preparationStationId, stationId))

    const kos = await db.query.kitchenOrders.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: { items: { with: { fnbItem: true } }, station: true },
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    })

    return reply.send({ success: true, data: kos })
  })

  /** POST /api/v1/fnb/kitchen/:id/status — update kitchen order status */
  fastify.post<{ Params: { id: string } }>(
    '/kitchen/:id/status',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const body = z
        .object({ status: z.enum(['confirmed', 'preparing', 'ready', 'served', 'cancelled']) })
        .parse(request.body)

      const timestamps: Record<string, Date> = {}
      if (body.status === 'preparing') timestamps.startedAt = new Date()
      if (body.status === 'ready') timestamps.readyAt = new Date()
      if (body.status === 'served') timestamps.servedAt = new Date()
      if (body.status === 'cancelled') timestamps.cancelledAt = new Date()

      await db
        .update(kitchenOrders)
        .set({ status: body.status, ...timestamps })
        .where(eq(kitchenOrders.id, request.params.id))

      return reply.send({ success: true, data: { status: body.status } })
    }
  )

  /** GET /api/v1/fnb/inventory — inventory levels */
  fastify.get('/inventory', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!

    const inv = await db
      .select({ item: fnbItems, inventory: fnbInventory })
      .from(fnbInventory)
      .innerJoin(fnbItems, eq(fnbInventory.fnbItemId, fnbItems.id))
      .where(eq(fnbItems.venueId, venueId))

    return reply.send({ success: true, data: inv })
  })
}
