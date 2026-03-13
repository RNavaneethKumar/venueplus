import type { FastifyInstance } from 'fastify'
import {
  db as globalDb,
  retailItems,
  retailInventory,
  eq,
  and,
  type DB,
} from '@venueplus/database'
import { requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


export async function retailRoutes(fastify: FastifyInstance): Promise<void> {
  /** GET /api/v1/retail/items — list all retail items with inventory */
  fastify.get('/items', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!

    const rows = await db
      .select({ item: retailItems, inventory: retailInventory })
      .from(retailItems)
      .leftJoin(retailInventory, eq(retailInventory.retailItemId, retailItems.id))
      .where(and(eq(retailItems.venueId, venueId), eq(retailItems.isActive, 1)))

    return reply.send({
      success: true,
      data: rows.map((r) => ({
        ...r.item,
        stock: r.inventory?.currentStock ?? 0,
        reserved: r.inventory?.reservedStock ?? 0,
        available: (r.inventory?.currentStock ?? 0) - (r.inventory?.reservedStock ?? 0),
        isLowStock:
          r.inventory !== null &&
          r.inventory.currentStock <= r.inventory.lowStockThreshold,
      })),
    })
  })

  /** GET /api/v1/retail/items/:id */
  fastify.get<{ Params: { id: string } }>(
    '/items/:id',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const [row] = await db
        .select({ item: retailItems, inventory: retailInventory })
        .from(retailItems)
        .leftJoin(retailInventory, eq(retailInventory.retailItemId, retailItems.id))
        .where(eq(retailItems.id, request.params.id))
        .limit(1)

      if (!row) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: 'Retail item not found' },
        })
      }

      return reply.send({ success: true, data: row })
    }
  )

  /** GET /api/v1/retail/items/barcode/:code — look up by barcode (for POS scanner) */
  fastify.get<{ Params: { code: string } }>(
    '/items/barcode/:code',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const [row] = await db
        .select({ item: retailItems, inventory: retailInventory })
        .from(retailItems)
        .leftJoin(retailInventory, eq(retailInventory.retailItemId, retailItems.id))
        .where(
          and(eq(retailItems.barcode, request.params.code), eq(retailItems.venueId, request.venueId!))
        )
        .limit(1)

      if (!row) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: 'No item found for this barcode' },
        })
      }

      return reply.send({ success: true, data: row })
    }
  )
}
