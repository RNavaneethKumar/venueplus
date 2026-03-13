import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  wallets,
  walletTransactions,
  eq,
  and,
  sql,
  type DB,
} from '@venueplus/database'
import { requireAuth, requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


export async function walletRoutes(fastify: FastifyInstance): Promise<void> {
  /** GET /api/v1/wallet/me — current wallet balance */
  fastify.get('/me', { preHandler: [requireAuth, requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const accountId = (request.user as any).accountId
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.accountId, accountId),
    })

    if (!wallet) {
      return reply.status(HTTP_STATUS.NOT_FOUND).send({
        success: false,
        error: { code: 'WALLET_NOT_FOUND', message: 'No wallet found for this account' },
      })
    }

    return reply.send({ success: true, data: wallet })
  })

  /** GET /api/v1/wallet/me/transactions — wallet transaction history */
  fastify.get(
    '/me/transactions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
    const db = resolveDb(request)
      const accountId = (request.user as any).accountId
      const { page = '1', limit = '20' } = request.query as Record<string, string>
      const pageNum = parseInt(page, 10)
      const pageSize = Math.min(parseInt(limit, 10), 100)

      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.accountId, accountId),
      })

      if (!wallet) {
        return reply.send({ success: true, data: [], meta: { page: pageNum, limit: pageSize } })
      }

      const txns = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.walletId, wallet.id))
        .orderBy(sql`${walletTransactions.createdAt} DESC`)
        .limit(pageSize)
        .offset((pageNum - 1) * pageSize)

      return reply.send({
        success: true,
        data: txns,
        meta: { page: pageNum, limit: pageSize },
      })
    }
  )

  /** POST /api/v1/wallet/topup — top up wallet (called after order creation) */
  fastify.post('/topup', { preHandler: [requireAuth, requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const body = z
      .object({
        amount: z.number().positive(),
        bonusAmount: z.number().min(0).default(0),
        orderId: z.string().uuid(),
      })
      .parse(request.body)

    const accountId = (request.user as any).accountId
    const venueId = request.venueId!

    // Get or create wallet
    let wallet = await db.query.wallets.findFirst({
      where: eq(wallets.accountId, accountId),
    })

    if (!wallet) {
      const [created] = await db
        .insert(wallets)
        .values({ accountId, venueId, realBalance: '0', bonusBalance: '0', totalBalance: '0' })
        .returning()
      wallet = created
    }

    // Credit real amount
    if (body.amount > 0) {
      const newReal = Number(wallet!.realBalance) + body.amount
      await db.insert(walletTransactions).values({
        walletId: wallet!.id,
        txType: 'credit_real',
        balanceType: 'real_cash',
        amount: body.amount.toFixed(2),
        balanceBefore: wallet!.realBalance,
        balanceAfter: newReal.toFixed(2),
        description: 'Top-up',
      })
      await db
        .update(wallets)
        .set({
          realBalance: newReal.toFixed(2),
          totalBalance: (Number(wallet!.totalBalance) + body.amount).toFixed(2),
        })
        .where(eq(wallets.id, wallet!.id))
    }

    // Credit bonus
    if (body.bonusAmount > 0) {
      const newBonus = Number(wallet!.bonusBalance) + body.bonusAmount
      await db.insert(walletTransactions).values({
        walletId: wallet!.id,
        txType: 'credit_bonus',
        balanceType: 'bonus_cash',
        amount: body.bonusAmount.toFixed(2),
        balanceBefore: wallet!.bonusBalance,
        balanceAfter: newBonus.toFixed(2),
        description: 'Bonus credit',
      })
      await db
        .update(wallets)
        .set({
          bonusBalance: newBonus.toFixed(2),
          totalBalance: (Number(wallet!.totalBalance) + body.bonusAmount).toFixed(2),
        })
        .where(eq(wallets.id, wallet!.id))
    }

    const updated = await db.query.wallets.findFirst({ where: eq(wallets.id, wallet!.id) })
    return reply.send({ success: true, data: updated })
  })
}
