import type { FastifyInstance } from 'fastify'
import {
  db as globalDb,
  dailyRevenueStats,
  hourlyOccupancyStats,
  orders,
  orderPayments,
  reservationUsageLogs,
  reservations,
  eq,
  and,
  gte,
  lte,
  sql,
  type DB,
} from '@venueplus/database'
import { requireVenueHeader } from '../../middleware/auth.js'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


export async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/reports/revenue/daily
   * Pre-computed daily revenue stats.
   */
  fastify.get('/revenue/daily', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const { from, to } = request.query as { from: string; to: string }
    const venueId = request.venueId!

    const rows = await db
      .select()
      .from(dailyRevenueStats)
      .where(
        and(
          eq(dailyRevenueStats.venueId, venueId),
          from ? gte(dailyRevenueStats.statDate, new Date(from)) : sql`1=1`,
          to ? lte(dailyRevenueStats.statDate, new Date(to)) : sql`1=1`
        )
      )
      .orderBy(dailyRevenueStats.statDate)

    return reply.send({ success: true, data: rows })
  })

  /**
   * GET /api/v1/reports/revenue/live
   * Live revenue summary for today (computed on the fly from orders).
   */
  fastify.get('/revenue/live', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const today = new Date().toISOString().slice(0, 10)

    const [result] = await db
      .select({
        orderCount:    sql<string>`COUNT(DISTINCT ${orders.id})`,
        totalRevenue:  sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        posRevenue:    sql<string>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.sourceChannel} = 'pos'), 0)`,
        onlineRevenue: sql<string>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.sourceChannel} = 'online'), 0)`,
        kioskRevenue:  sql<string>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.sourceChannel} = 'kiosk'), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.venueId, venueId),
          eq(orders.status, 'paid'),
          sql`DATE(${orders.createdAt}) = ${today}`
        )
      )

    return reply.send({
      success: true,
      data: {
        date:          today,
        orderCount:    Number(result?.orderCount    ?? 0),
        totalRevenue:  Number(result?.totalRevenue  ?? 0),
        posRevenue:    Number(result?.posRevenue    ?? 0),
        onlineRevenue: Number(result?.onlineRevenue ?? 0),
        kioskRevenue:  Number(result?.kioskRevenue  ?? 0),
      },
    })
  })

  /**
   * GET /api/v1/reports/occupancy/:resourceId
   * Hourly occupancy stats for a resource.
   */
  fastify.get<{ Params: { resourceId: string } }>(
    '/occupancy/:resourceId',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { resourceId } = request.params
      const { date = new Date().toISOString().slice(0, 10) } = request.query as { date?: string }

      const rows = await db
        .select()
        .from(hourlyOccupancyStats)
        .where(
          and(
            eq(hourlyOccupancyStats.venueId, request.venueId!),
            eq(hourlyOccupancyStats.resourceId, resourceId),
            sql`DATE(${hourlyOccupancyStats.statHour}) = ${date}`
          )
        )
        .orderBy(hourlyOccupancyStats.statHour)

      return reply.send({ success: true, data: rows })
    }
  )

  /**
   * GET /api/v1/reports/payments/summary
   * Payment method breakdown for a date range.
   */
  fastify.get('/payments/summary', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { from, to } = request.query as { from: string; to: string }
    const today = new Date().toISOString().slice(0, 10)

    const [result] = await db
      .select({
        cash: sql<string>`COALESCE(SUM(${orderPayments.amount}) FILTER (WHERE ${orderPayments.paymentMethod} = 'cash'), 0)`,
        upi: sql<string>`COALESCE(SUM(${orderPayments.amount}) FILTER (WHERE ${orderPayments.paymentMethod} = 'upi'), 0)`,
        card: sql<string>`COALESCE(SUM(${orderPayments.amount}) FILTER (WHERE ${orderPayments.paymentMethod} = 'card'), 0)`,
        wallet: sql<string>`COALESCE(SUM(${orderPayments.amount}) FILTER (WHERE ${orderPayments.paymentMethod} = 'wallet'), 0)`,
        gift_card: sql<string>`COALESCE(SUM(${orderPayments.amount}) FILTER (WHERE ${orderPayments.paymentMethod} = 'gift_card'), 0)`,
        total: sql<string>`COALESCE(SUM(${orderPayments.amount}), 0)`,
      })
      .from(orderPayments)
      .innerJoin(orders, eq(orderPayments.orderId, orders.id))
      .where(
        and(
          eq(orders.venueId, venueId),
          eq(orderPayments.status, 'completed'),
          from ? gte(orders.createdAt, new Date(from)) : sql`DATE(${orders.createdAt}) = ${today}`,
          to ? lte(orders.createdAt, new Date(to)) : sql`1=1`
        )
      )

    return reply.send({
      success: true,
      data: {
        dateRange: { from: from ?? today, to: to ?? today },
        byMethod: result,
      },
    })
  })
}
