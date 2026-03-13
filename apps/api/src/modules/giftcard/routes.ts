import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  giftCards,
  giftCardTransactions,
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


export async function giftCardRoutes(fastify: FastifyInstance): Promise<void> {
  /** GET /api/v1/gift-cards/:code — look up gift card by code */
  fastify.get<{ Params: { code: string } }>(
    '/:code',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const gc = await db.query.giftCards.findFirst({
        where: and(
          eq(giftCards.code, request.params.code.toUpperCase()),
          eq(giftCards.venueId, request.venueId!)
        ),
      })

      if (!gc) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'GIFT_CARD_NOT_FOUND', message: 'Gift card not found' },
        })
      }

      return reply.send({
        success: true,
        data: {
          id: gc.id,
          code: gc.code,
          currentBalance: gc.currentBalance,
          status: gc.status,
          expiresAt: gc.expiresAt,
        },
      })
    }
  )

  /** GET /api/v1/gift-cards/:code/transactions */
  fastify.get<{ Params: { code: string } }>(
    '/:code/transactions',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const gc = await db.query.giftCards.findFirst({
        where: eq(giftCards.code, request.params.code.toUpperCase()),
      })

      if (!gc) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'GIFT_CARD_NOT_FOUND', message: 'Gift card not found' },
        })
      }

      const txns = await db
        .select()
        .from(giftCardTransactions)
        .where(eq(giftCardTransactions.giftCardId, gc.id))
        .orderBy(giftCardTransactions.createdAt)

      return reply.send({ success: true, data: txns })
    }
  )
}
