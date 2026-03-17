import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  cashSessions,
  cashDrawers,
  cashMovements,
  venueSettings,
  orders,
  orderPayments,
  users,
  eq,
  and,
  isNull,
  isNotNull,
  sum,
  sql,
  desc,
  gte,
  lte,
  inArray,
  type DB,
} from '@venueplus/database'
import {
  requireStaff,
  requireVenueHeader,
  requirePermission,
  requireRole,
} from '../../middleware/auth.js'
import { HTTP_STATUS } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


// ─── Schemas ──────────────────────────────────────────────────────────────────

const OpenSessionBody = z.object({
  drawerId:             z.string().uuid().optional(), // null = user mode
  openingAmount:        z.number().min(0),
  openingDenominations: z.record(z.string(), z.number()).optional(),
})

const CloseSessionBody = z.object({
  closeType:            z.enum(['normal', 'blind']).default('normal'),
  actualAmount:         z.number().min(0).optional(),    // required for normal close
  actualDenominations:  z.record(z.string(), z.number()).optional(),
  varianceApprovedBy:   z.string().uuid().optional(),    // manager userId
  varianceNote:         z.string().max(200).optional(),
})

const MovementBody = z.object({
  sessionId:    z.string().uuid(),
  movementType: z.enum(['drop', 'paid_in', 'paid_out']),
  amount:       z.number().positive(),
  reason:       z.string().min(1).max(100),
})

const CreateDrawerBody = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(200).optional(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute expected cash for a session from the ledger.
 * Expected = openingAmount
 *          + SUM(cash order_payments WHERE orders.cash_session_id = :id)
 *            (sales are positive, refunds stored as negative → net cash from orders)
 *          + SUM(paid_in movements)
 *          − SUM(paid_out movements)
 *          − SUM(drop movements)
 */
async function computeExpectedCash(
  db: DB,
  sessionId: string,
  openingAmount: number
): Promise<{ expectedAmount: number; salesNet: number; movements: Record<string, number> }> {
  // Net cash from orders linked to this session (sales positive, refunds negative)
  const cashFromOrdersResult = await db
    .select({ total: sum(orderPayments.amount) })
    .from(orderPayments)
    .innerJoin(orders, eq(orderPayments.orderId, orders.id))
    .where(
      and(
        eq(orders.cashSessionId, sessionId),
        eq(orderPayments.paymentMethod, 'cash')
      )
    )

  const salesNet = Number(cashFromOrdersResult[0]?.total ?? 0)

  // Cash movements for this session, grouped by type
  const movementRows = await db
    .select({ type: cashMovements.movementType, total: sum(cashMovements.amount) })
    .from(cashMovements)
    .where(eq(cashMovements.sessionId, sessionId))
    .groupBy(cashMovements.movementType)

  const mvmt: Record<string, number> = { drop: 0, paid_in: 0, paid_out: 0 }
  for (const row of movementRows) {
    mvmt[row.type] = Number(row.total ?? 0)
  }

  const expectedAmount =
    openingAmount + salesNet + (mvmt['paid_in'] ?? 0) - (mvmt['paid_out'] ?? 0) - (mvmt['drop'] ?? 0)

  return { expectedAmount, salesNet, movements: mvmt }
}

/**
 * Build the sales summary payload for X/Z reports.
 */
async function buildSalesSummary(db: DB, sessionId: string) {
  // Order counts and totals
  const summaryRows = await db
    .select({
      orderType:    orders.orderType,
      orderCount:   sql<number>`count(*)::int`,
      grossSales:   sum(orders.totalAmount),
      discounts:    sum(orders.discountAmount),
    })
    .from(orders)
    .where(eq(orders.cashSessionId, sessionId))
    .groupBy(orders.orderType)

  const saleRow    = summaryRows.find((r) => r.orderType === 'sale')
  const refundRow  = summaryRows.find((r) => r.orderType === 'refund')

  const orderCount = (saleRow?.orderCount ?? 0) + (refundRow?.orderCount ?? 0)
  const grossSales = Number(saleRow?.grossSales ?? 0)
  const refunds    = Number(refundRow?.grossSales ?? 0) // already negative-ish from DB
  const discounts  = Number(saleRow?.discounts ?? 0)
  const netSales   = grossSales + refunds

  // Payment method breakdown
  const paymentRows = await db
    .select({
      method:  orderPayments.paymentMethod,
      total:   sum(orderPayments.amount),
      count:   sql<number>`count(*)::int`,
    })
    .from(orderPayments)
    .innerJoin(orders, eq(orderPayments.orderId, orders.id))
    .where(eq(orders.cashSessionId, sessionId))
    .groupBy(orderPayments.paymentMethod)

  const paymentSummary: Record<string, { amount: number; count: number }> = {}
  for (const row of paymentRows) {
    paymentSummary[row.method] = { amount: Number(row.total ?? 0), count: row.count }
  }

  return { orderCount, grossSales, refunds: Math.abs(refunds), discounts, netSales, paymentSummary }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function tillRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /till/sessions — Open a new session ────────────────────────────────

  fastify.post(
    '/sessions',
    { preHandler: [requireVenueHeader, requireStaff] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const userId  = (request.user as any).staffId as string
      const body    = OpenSessionBody.parse(request.body)

      // Validate drawer if provided
      if (body.drawerId) {
        const [drawer] = await db
          .select()
          .from(cashDrawers)
          .where(and(eq(cashDrawers.id, body.drawerId), eq(cashDrawers.venueId, venueId)))
          .limit(1)

        if (!drawer || !drawer.isActive) {
          return reply.status(HTTP_STATUS.BAD_REQUEST).send({
            success: false,
            error: { code: 'TILL_DRAWER_INVALID', message: 'Drawer not found or inactive' },
          })
        }

        // Check no open session for this drawer (counter mode)
        const existingCounter = await db
          .select({ id: cashSessions.id })
          .from(cashSessions)
          .where(
            and(
              eq(cashSessions.venueId, venueId),
              eq(cashSessions.drawerId, body.drawerId),
              eq(cashSessions.status, 'open')
            )
          )
          .limit(1)

        if (existingCounter.length > 0) {
          return reply.status(HTTP_STATUS.CONFLICT).send({
            success: false,
            error: { code: 'TILL_ALREADY_OPEN', message: 'This drawer already has an open session' },
          })
        }
      } else {
        // User mode — check this user has no open session
        const existingUser = await db
          .select({ id: cashSessions.id })
          .from(cashSessions)
          .where(
            and(
              eq(cashSessions.venueId, venueId),
              eq(cashSessions.openedBy, userId),
              isNull(cashSessions.drawerId),
              eq(cashSessions.status, 'open')
            )
          )
          .limit(1)

        if (existingUser.length > 0) {
          return reply.status(HTTP_STATUS.CONFLICT).send({
            success: false,
            error: { code: 'TILL_ALREADY_OPEN', message: 'You already have an open till session' },
          })
        }
      }

      const [session] = await db
        .insert(cashSessions)
        .values({
          venueId,
          drawerId:             body.drawerId ?? null,
          openedBy:             userId,
          status:               'open',
          openingAmount:        body.openingAmount.toFixed(2),
          openingDenominations: body.openingDenominations ?? null,
        })
        .returning()

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: session })
    }
  )

  // ── GET /till/sessions/active — Get currently open session ──────────────────

  fastify.get(
    '/sessions/active',
    { preHandler: [requireVenueHeader, requireStaff] },
    async (request, reply) => {
      const db      = resolveDb(request)
      const venueId = request.venueId!
      const userId  = (request.user as any).staffId as string
      const { drawerId, deviceId } = request.query as { drawerId?: string; deviceId?: string }

      let session: typeof cashSessions.$inferSelect | undefined

      if (drawerId) {
        // Explicit drawer lookup — used by TillOpenScreen when surfacing an
        // already-open session after a TILL_ALREADY_OPEN conflict error.
        const [row] = await db
          .select()
          .from(cashSessions)
          .where(
            and(
              eq(cashSessions.venueId, venueId),
              eq(cashSessions.drawerId, drawerId),
              eq(cashSessions.status, 'open')
            )
          )
          .limit(1)
        session = row

      } else if (deviceId) {
        // Automatic lookup on POS load — read pos.till_mode to decide strategy.
        const [setting] = await db
          .select({ value: venueSettings.settingValue })
          .from(venueSettings)
          .where(
            and(
              eq(venueSettings.venueId, venueId),
              eq(venueSettings.settingKey, 'pos.till_mode')
            )
          )
          .limit(1)

        // May be stored as plain 'counter'/'user' or JSON-encoded '"counter"'/'"user"'.
        let tillMode = 'counter'
        if (setting) {
          try { tillMode = JSON.parse(setting.value) } catch { tillMode = setting.value }
        }

        if (tillMode === 'counter') {
          // Counter mode: find the drawer linked to this device, return its session.
          // Any user logging in on the same terminal sees the same till.
          // If the device has no linked drawer there is simply no session — do NOT
          // fall back to a user-mode lookup.
          const [drawer] = await db
            .select({ id: cashDrawers.id })
            .from(cashDrawers)
            .where(
              and(
                eq(cashDrawers.venueId, venueId),
                eq(cashDrawers.deviceId, deviceId)
              )
            )
            .limit(1)

          if (drawer) {
            const [row] = await db
              .select()
              .from(cashSessions)
              .where(
                and(
                  eq(cashSessions.venueId, venueId),
                  eq(cashSessions.drawerId, drawer.id),
                  eq(cashSessions.status, 'open')
                )
              )
              .limit(1)
            session = row
          }
          // No drawer linked to this device → session stays undefined → 404 below.
        } else {
          // User mode: look up by the logged-in user only, ignoring device.
          const [row] = await db
            .select()
            .from(cashSessions)
            .where(
              and(
                eq(cashSessions.venueId, venueId),
                eq(cashSessions.openedBy, userId),
                eq(cashSessions.status, 'open')
              )
            )
            .limit(1)
          session = row
        }

      } else {
        // No deviceId provided (e.g. TillMenuSheet re-sync on mount):
        // fall back to user-mode lookup.
        const [row] = await db
          .select()
          .from(cashSessions)
          .where(
            and(
              eq(cashSessions.venueId, venueId),
              eq(cashSessions.openedBy, userId),
              eq(cashSessions.status, 'open')
            )
          )
          .limit(1)
        session = row
      }

      if (!session) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'TILL_NO_ACTIVE_SESSION', message: 'No active till session' },
        })
      }

      // Attach movements
      const movements = await db
        .select()
        .from(cashMovements)
        .where(eq(cashMovements.sessionId, session.id))
        .orderBy(cashMovements.createdAt)

      return reply.send({ success: true, data: { ...session, movements } })
    }
  )

  // ── GET /till/sessions — List sessions ──────────────────────────────────────

  fastify.get(
    '/sessions',
    { preHandler: [requireVenueHeader, requireStaff] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const {
        status,
        drawerId,
        fromDate,
        toDate,
        page = '1',
        limit = '20',
      } = request.query as Record<string, string>

      const pageNum  = parseInt(page, 10)
      const pageSize = Math.min(parseInt(limit, 10), 100)
      const offset   = (pageNum - 1) * pageSize

      const conditions = [eq(cashSessions.venueId, venueId)]
      if (status)   conditions.push(eq(cashSessions.status, status as any))
      if (drawerId) conditions.push(eq(cashSessions.drawerId, drawerId))
      if (fromDate) conditions.push(gte(cashSessions.openTime, new Date(fromDate)))
      if (toDate)   conditions.push(lte(cashSessions.openTime, new Date(toDate + 'T23:59:59')))

      const rows = await db
        .select()
        .from(cashSessions)
        .where(and(...conditions))
        .orderBy(desc(cashSessions.openTime))
        .limit(pageSize)
        .offset(offset)

      return reply.send({ success: true, data: rows, meta: { page: pageNum, limit: pageSize } })
    }
  )

  // ── GET /till/sessions/:id — Session detail ──────────────────────────────────

  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id',
    { preHandler: [requireVenueHeader, requireStaff] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!

      const [session] = await db
        .select()
        .from(cashSessions)
        .where(and(eq(cashSessions.id, request.params.id), eq(cashSessions.venueId, venueId)))
        .limit(1)

      if (!session) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'TILL_SESSION_NOT_FOUND', message: 'Session not found' },
        })
      }

      const movements = await db
        .select()
        .from(cashMovements)
        .where(eq(cashMovements.sessionId, session.id))
        .orderBy(cashMovements.createdAt)

      return reply.send({ success: true, data: { ...session, movements } })
    }
  )

  // ── GET /till/sessions/:id/x-report — Live X-Report (no close) ──────────────

  fastify.get<{ Params: { id: string } }>(
    '/sessions/:id/x-report',
    { preHandler: [requireVenueHeader, requireStaff] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!

      const [session] = await db
        .select()
        .from(cashSessions)
        .where(and(eq(cashSessions.id, request.params.id), eq(cashSessions.venueId, venueId)))
        .limit(1)

      if (!session) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'TILL_SESSION_NOT_FOUND', message: 'Session not found' },
        })
      }

      const { expectedAmount, salesNet, movements } = await computeExpectedCash(
        db, session.id,
        Number(session.openingAmount)
      )

      const salesSummary = await buildSalesSummary(db, session.id)

      const allMovements = await db
        .select()
        .from(cashMovements)
        .where(eq(cashMovements.sessionId, session.id))
        .orderBy(cashMovements.createdAt)

      return reply.send({
        success: true,
        data: {
          reportType: 'x_report',
          generatedAt: new Date().toISOString(),
          session: {
            id:               session.id,
            drawerId:         session.drawerId,
            openedBy:         session.openedBy,
            status:           session.status,
            openTime:         session.openTime,
            openingAmount:    Number(session.openingAmount),
          },
          cashReconciliation: {
            openingAmount:  Number(session.openingAmount),
            salesNet,
            paid_in:        movements.paid_in,
            paid_out:       movements.paid_out,
            drop:           movements.drop,
            expectedAmount,
          },
          salesSummary,
          movements: allMovements,
        },
      })
    }
  )

  // ── POST /till/sessions/:id/close — Normal or Blind close ───────────────────

  fastify.post<{ Params: { id: string } }>(
    '/sessions/:id/close',
    { preHandler: [requireVenueHeader, requireStaff] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const userId  = (request.user as any).staffId as string
      const body    = CloseSessionBody.parse(request.body)
      const now     = new Date()

      const [session] = await db
        .select()
        .from(cashSessions)
        .where(and(eq(cashSessions.id, request.params.id), eq(cashSessions.venueId, venueId)))
        .limit(1)

      if (!session || session.status !== 'open') {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'TILL_INVALID_STATE', message: 'Session is not open' },
        })
      }

      // Normal close requires actualAmount
      if (body.closeType === 'normal' && body.actualAmount === undefined) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'TILL_MISSING_CASH_COUNT', message: 'actualAmount is required for normal close' },
        })
      }

      const { expectedAmount, salesNet, movements } = await computeExpectedCash(
        db, session.id,
        Number(session.openingAmount)
      )

      const actualAmount = body.actualAmount ?? 0
      const variance     = actualAmount - expectedAmount

      // Variance approval required when threshold = 0 and variance != 0
      if (variance !== 0 && body.closeType === 'normal') {
        if (!body.varianceApprovedBy) {
          return reply.status(HTTP_STATUS.UNPROCESSABLE).send({
            success: false,
            error: {
              code: 'TILL_VARIANCE_REQUIRES_APPROVAL',
              message: `Variance of ${variance >= 0 ? '+' : ''}${variance.toFixed(2)} requires manager approval`,
              details: { variance, expectedAmount, actualAmount },
            },
          })
        }
      }

      // Build sales summary and Z-Report snapshot
      const salesSummary = await buildSalesSummary(db, session.id)
      const allMovements = await db
        .select()
        .from(cashMovements)
        .where(eq(cashMovements.sessionId, session.id))
        .orderBy(cashMovements.createdAt)

      const zReportData = {
        reportType:   'z_report',
        generatedAt:  now.toISOString(),
        session: {
          id:            session.id,
          venueId:       session.venueId,
          drawerId:      session.drawerId,
          openedBy:      session.openedBy,
          closedBy:      userId,
          openTime:      session.openTime,
          closeTime:     now.toISOString(),
        },
        opening: {
          amount:        Number(session.openingAmount),
          denominations: session.openingDenominations,
        },
        closing: {
          amount:        body.closeType === 'blind' ? null : actualAmount,
          denominations: body.closeType === 'blind' ? null : (body.actualDenominations ?? null),
        },
        cashReconciliation: {
          openingAmount:  Number(session.openingAmount),
          salesNet,
          paid_in:        movements.paid_in,
          paid_out:       movements.paid_out,
          drop:           movements.drop,
          expectedAmount,
          actualAmount:   body.closeType === 'blind' ? null : actualAmount,
          variance:       body.closeType === 'blind' ? null : variance,
        },
        salesSummary,
        movements:    allMovements,
        approval:     body.varianceApprovedBy
          ? { approvedBy: body.varianceApprovedBy, note: body.varianceNote ?? null, approvedAt: now.toISOString() }
          : null,
        closeMetadata: {
          closeType:   body.closeType,
          isBlind:     body.closeType === 'blind',
          isForcedOrAuto: false,
        },
      }

      const newStatus = body.closeType === 'blind' ? 'blind_closed' : 'closed'

      const [updated] = await db
        .update(cashSessions)
        .set({
          status:             newStatus,
          closedBy:           userId,
          closeTime:          now,
          closeType:          body.closeType,
          actualAmount:       body.closeType !== 'blind' ? actualAmount.toFixed(2) : null,
          actualDenominations: body.closeType !== 'blind' ? (body.actualDenominations ?? null) : null,
          expectedAmount:     expectedAmount.toFixed(2),
          variance:           body.closeType !== 'blind' ? variance.toFixed(2) : null,
          varianceApprovedBy: body.varianceApprovedBy ?? null,
          varianceApprovedAt: body.varianceApprovedBy ? now : null,
          varianceNote:       body.varianceNote ?? null,
          zReportData,
        })
        .where(eq(cashSessions.id, session.id))
        .returning()

      return reply.send({ success: true, data: { session: updated, zReport: zReportData } })
    }
  )

  // ── POST /till/sessions/:id/force-close — Manager force-close ───────────────

  fastify.post<{ Params: { id: string } }>(
    '/sessions/:id/force-close',
    { preHandler: [requireVenueHeader, requirePermission('till.force_close')] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const userId  = (request.user as any).staffId as string
      const now     = new Date()

      const [session] = await db
        .select()
        .from(cashSessions)
        .where(and(eq(cashSessions.id, request.params.id), eq(cashSessions.venueId, venueId)))
        .limit(1)

      if (!session || session.status !== 'open') {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'TILL_INVALID_STATE', message: 'Session is not open' },
        })
      }

      const { expectedAmount, salesNet, movements } = await computeExpectedCash(
        db, session.id,
        Number(session.openingAmount)
      )

      const salesSummary = await buildSalesSummary(db, session.id)
      const allMovements = await db
        .select()
        .from(cashMovements)
        .where(eq(cashMovements.sessionId, session.id))
        .orderBy(cashMovements.createdAt)

      const zReportData = {
        reportType:  'z_report',
        generatedAt: now.toISOString(),
        session: {
          id:        session.id,
          venueId:   session.venueId,
          drawerId:  session.drawerId,
          openedBy:  session.openedBy,
          closedBy:  userId,
          openTime:  session.openTime,
          closeTime: now.toISOString(),
        },
        opening: {
          amount:        Number(session.openingAmount),
          denominations: session.openingDenominations,
        },
        closing:            { amount: null, denominations: null },
        cashReconciliation: {
          openingAmount: Number(session.openingAmount),
          salesNet,
          paid_in:       movements.paid_in,
          paid_out:      movements.paid_out,
          drop:          movements.drop,
          expectedAmount,
          actualAmount:  null,
          variance:      null,
        },
        salesSummary,
        movements: allMovements,
        approval:  null,
        closeMetadata: {
          closeType:      'forced',
          isBlind:        false,
          isForcedOrAuto: true,
          forceClosedBy:  userId,
          note:           'Force Closed — No Cash Count',
        },
      }

      const [updated] = await db
        .update(cashSessions)
        .set({
          status:        'forced',
          closedBy:      userId,
          closeTime:     now,
          closeType:     'forced',
          expectedAmount: expectedAmount.toFixed(2),
          zReportData,
        })
        .where(eq(cashSessions.id, session.id))
        .returning()

      return reply.send({ success: true, data: { session: updated, zReport: zReportData } })
    }
  )

  // ── POST /till/movements — Record a cash movement ───────────────────────────

  fastify.post(
    '/movements',
    { preHandler: [requireVenueHeader, requireStaff] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const userId  = (request.user as any).staffId as string
      const body    = MovementBody.parse(request.body)

      // Validate session is open and belongs to this venue
      const [session] = await db
        .select({ id: cashSessions.id, status: cashSessions.status, venueId: cashSessions.venueId })
        .from(cashSessions)
        .where(and(eq(cashSessions.id, body.sessionId), eq(cashSessions.venueId, venueId)))
        .limit(1)

      if (!session || session.status !== 'open') {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'TILL_INVALID_STATE', message: 'Session is not open' },
        })
      }

      const [movement] = await db
        .insert(cashMovements)
        .values({
          venueId,
          sessionId:    body.sessionId,
          movementType: body.movementType,
          amount:       body.amount.toFixed(2),
          reason:       body.reason,
          recordedBy:   userId,
        })
        .returning()

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: movement })
    }
  )

  // ── GET /till/drawers — List cash drawers ────────────────────────────────────

  fastify.get(
    '/drawers',
    { preHandler: [requireVenueHeader, requireStaff] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!

      const drawers = await db
        .select()
        .from(cashDrawers)
        .where(eq(cashDrawers.venueId, venueId))
        .orderBy(cashDrawers.name)

      return reply.send({ success: true, data: drawers })
    }
  )

  // ── POST /till/drawers — Create a cash drawer (admin) ───────────────────────

  fastify.post(
    '/drawers',
    { preHandler: [requireVenueHeader, requireRole('venue_admin', 'super_admin', 'manager')] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const userId  = (request.user as any).staffId as string
      const body    = CreateDrawerBody.parse(request.body)

      const [drawer] = await db
        .insert(cashDrawers)
        .values({
          venueId,
          name:        body.name,
          description: body.description ?? null,
          createdBy:   userId,
        })
        .returning()

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: drawer })
    }
  )

  // ── PATCH /till/drawers/:id — Update drawer (admin) ─────────────────────────

  fastify.patch<{ Params: { id: string } }>(
    '/drawers/:id',
    { preHandler: [requireVenueHeader, requireRole('venue_admin', 'super_admin', 'manager')] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const body    = z.object({
        name:        z.string().min(1).max(100).optional(),
        description: z.string().max(200).optional(),
        isActive:    z.boolean().optional(),
        deviceId:    z.string().uuid().nullable().optional(),
      }).parse(request.body)

      // If linking a device, first clear any other drawer that already points to it
      if (body.deviceId) {
        await db
          .update(cashDrawers)
          .set({ deviceId: null })
          .where(and(eq(cashDrawers.venueId, venueId), eq(cashDrawers.deviceId, body.deviceId)))
      }

      const [updated] = await db
        .update(cashDrawers)
        .set({ ...body })
        .where(and(eq(cashDrawers.id, request.params.id), eq(cashDrawers.venueId, venueId)))
        .returning()

      if (!updated) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'TILL_DRAWER_NOT_FOUND', message: 'Drawer not found' },
        })
      }

      return reply.send({ success: true, data: updated })
    }
  )
}
