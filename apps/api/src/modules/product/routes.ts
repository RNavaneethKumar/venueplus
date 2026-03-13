import type { FastifyInstance } from 'fastify'
import {
  db as globalDb,
  products,
  productPrices,
  eq,
  and,
  or,
  isNull,
  type DB,
} from '@venueplus/database'
import { requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS, ERROR_CODES } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


export async function productRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/products
   * List active products with all per-visitor-type prices for the requested channel.
   * Also includes a computed `basePrice` (minimum price) for "starting from" display.
   */
  fastify.get('/', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { channel = 'online' } = request.query as { channel?: string }

    // Use relational query to get each product with its full prices array
    // (filtered to the requested channel + channel-agnostic NULL prices),
    // each price row including the visitor type name.
    const productList = await db.query.products.findMany({
      where: and(eq(products.venueId, venueId), eq(products.isActive, true)),
      with: {
        prices: {
          where: and(
            or(eq(productPrices.salesChannel, channel as any), isNull(productPrices.salesChannel)),
            eq(productPrices.isActive, true)
          ),
          with: { visitorType: true },
          columns: {
            id: true,
            visitorTypeId: true,
            basePrice: true,
            currencyCode: true,
            salesChannel: true,
          },
        },
      },
    })

    return reply.send({
      success: true,
      data: productList.map((product) => {
        const prices = product.prices ?? []
        // Compute the lowest price for "starting from" display
        const minBasePrice =
          prices.length > 0
            ? prices.reduce(
                (min, p) => (Number(p.basePrice) < Number(min) ? p.basePrice : min),
                prices[0]!.basePrice
              )
            : null
        const currencyCode = prices[0]?.currencyCode ?? 'INR'

        return {
          id: product.id,
          name: product.name,
          code: product.code,
          productType: product.productType,
          isActive: product.isActive,
          createdAt: product.createdAt,
          basePrice: minBasePrice,
          currencyCode,
          channel,
          // Full price rows for per-visitor-type selectors in the UI
          prices: prices.map((p) => ({
            id: p.id,
            visitorTypeId: p.visitorTypeId,
            visitorType: p.visitorType
              ? { id: p.visitorType.id, name: p.visitorType.name, code: p.visitorType.code, isMinor: p.visitorType.isMinor }
              : null,
            basePrice: p.basePrice,
            currencyCode: p.currencyCode,
            salesChannel: p.salesChannel,
          })),
        }
      }),
    })
  })

  /**
   * GET /api/v1/products/:id
   * Get single product with all prices across all channels and visitor types.
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!

      const product = await db.query.products.findFirst({
        where: and(eq(products.id, id), eq(products.venueId, venueId)),
        with: {
          prices: { with: { visitorType: true } },
          taxStructures: true,
          reservationConfig: true,
        },
      })

      if (!product) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Product not found' },
        })
      }

      return reply.send({ success: true, data: product })
    }
  )
}
