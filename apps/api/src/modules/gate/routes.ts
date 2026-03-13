import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  reservations,
  reservationUsageLogs,
  orderItems,
  orders,
  eq,
  and,
  sql,
  type DB,
} from '@venueplus/database'
import { requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS, ERROR_CODES } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


// ─── Schemas ──────────────────────────────────────────────────────────────────

const ScanBody = z.object({
  qrPayload: z.string().min(1),
  deviceId: z.string().uuid(),
  resourceId: z.string().uuid(),
  scanType: z.enum(['entry', 'exit']).default('entry'),
})

// ─── Gate logic ───────────────────────────────────────────────────────────────
// QR payload format: JSON { t: "res", oid: "<orderItemId>", v: "<venueId>", ts: <unix_ms> }

async function validateScan(db: DB, qrPayload: string, resourceId: string, venueId: string) {
  let parsed: { t: string; oid: string; v: string; ts: number }
  try {
    parsed = JSON.parse(qrPayload)
  } catch {
    return { valid: false, reason: 'MALFORMED_QR', message: 'Invalid QR code format' }
  }

  if (parsed.t !== 'res') {
    return { valid: false, reason: 'WRONG_QR_TYPE', message: 'QR code is not a reservation' }
  }

  if (parsed.v !== venueId) {
    return { valid: false, reason: 'WRONG_VENUE', message: 'QR code is for a different venue' }
  }

  // Look up reservation by orderItemId (the QR encodes the order item, not the reservation row)
  const reservation = await db.query.reservations.findFirst({
    where: and(
      eq(reservations.orderItemId, parsed.oid),
      eq(reservations.status, 'confirmed')
    ),
  })

  if (!reservation) {
    // Check if already consumed
    const consumed = await db.query.reservations.findFirst({
      where: and(
        eq(reservations.orderItemId, parsed.oid),
        eq(reservations.status, 'consumed')
      ),
    })
    if (consumed) {
      return { valid: false, reason: ERROR_CODES.TICKET_ALREADY_USED, message: 'Ticket already used' }
    }
    return { valid: false, reason: ERROR_CODES.NOT_FOUND, message: 'Reservation not found or not confirmed' }
  }

  // Check date validity window
  const now = new Date()
  if (reservation.validUntil && now > reservation.validUntil) {
    return { valid: false, reason: ERROR_CODES.TICKET_EXPIRED, message: 'Ticket has expired' }
  }
  if (reservation.validFrom && now < reservation.validFrom) {
    return { valid: false, reason: ERROR_CODES.TICKET_NOT_YET_VALID, message: 'Ticket is not yet valid' }
  }

  // Check resource matches
  if (reservation.resourceId && reservation.resourceId !== resourceId) {
    return {
      valid: false,
      reason: 'WRONG_RESOURCE',
      message: 'Ticket is not valid for this resource',
    }
  }

  return { valid: true, reservation }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function gateRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/gate/scan
   * Gate entry/exit scan. Core admission validation logic.
   */
  fastify.post('/scan', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const body = ScanBody.parse(request.body)
    const venueId = request.venueId!

    const result = await validateScan(db, body.qrPayload, body.resourceId, venueId)

    if (!result.valid) {
      return reply.status(HTTP_STATUS.BAD_REQUEST).send({
        success: false,
        scanResult: 'denied',
        error: { code: result.reason, message: result.message },
      })
    }

    const reservation = result.reservation!

    if (body.scanType === 'entry') {
      await db
        .update(reservations)
        .set({
          status: 'consumed',
          actualEntryTime: reservation.actualEntryTime ?? new Date(),
          entriesUsed: sql`${reservations.entriesUsed} + 1`,
        })
        .where(eq(reservations.id, reservation.id))
    } else {
      await db
        .update(reservations)
        .set({
          actualExpiryTime: new Date(),
        })
        .where(eq(reservations.id, reservation.id))
    }

    // Log usage
    await db.insert(reservationUsageLogs).values({
      reservationId: reservation.id,
      usageType: body.scanType as any,
      deviceId: body.deviceId,
    })

    return reply.send({
      success: true,
      scanResult: 'approved',
      data: {
        reservationId: reservation.id,
        validFrom: reservation.validFrom,
        validUntil: reservation.validUntil,
        resourceId: reservation.resourceId,
        visitorTypeId: reservation.visitorTypeId,
        scanType: body.scanType,
        scannedAt: new Date().toISOString(),
      },
    })
  })

  /**
   * GET /api/v1/gate/headcount/:resourceId
   * Live headcount for a resource (entries - exits today).
   */
  fastify.get<{ Params: { resourceId: string } }>(
    '/headcount/:resourceId',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { resourceId } = request.params
      const today = new Date().toISOString().slice(0, 10)

      const entries = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(reservationUsageLogs)
        .innerJoin(reservations, eq(reservationUsageLogs.reservationId, reservations.id))
        .where(
          and(
            eq(reservations.resourceId, resourceId),
            eq(reservationUsageLogs.usageType, 'entry'),
            sql`DATE(${reservationUsageLogs.timestamp}) = ${today}`
          )
        )

      const exits = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(reservationUsageLogs)
        .innerJoin(reservations, eq(reservationUsageLogs.reservationId, reservations.id))
        .where(
          and(
            eq(reservations.resourceId, resourceId),
            eq(reservationUsageLogs.usageType, 'exit'),
            sql`DATE(${reservationUsageLogs.timestamp}) = ${today}`
          )
        )

      const entryCount = Number(entries[0]?.count ?? 0)
      const exitCount = Number(exits[0]?.count ?? 0)

      return reply.send({
        success: true,
        data: {
          resourceId,
          date: today,
          entries: entryCount,
          exits: exitCount,
          currentHeadcount: Math.max(0, entryCount - exitCount),
        },
      })
    }
  )

  /**
   * GET /api/v1/gate/validate/:qrPayload
   * Non-destructive validation (does NOT mark as used).
   */
  fastify.get<{ Params: { qrPayload: string } }>(
    '/validate/:qrPayload',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const resourceId = (request.query as any).resourceId ?? ''
      const result = await validateScan(db, 
        decodeURIComponent(request.params.qrPayload),
        resourceId,
        request.venueId!
      )

      return reply.send({
        success: true,
        data: {
          valid: result.valid,
          reason: !result.valid ? result.reason : undefined,
          message: !result.valid ? result.message : 'Valid ticket',
        },
      })
    }
  )
}
