import type { FastifyInstance } from 'fastify'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import {
  db as globalDb,
  devices,
  eq,
  and,
  type DB,
} from '@venueplus/database'
import {
  requireVenueHeader,
} from '../../middleware/auth.js'
import { HTTP_STATUS } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function deviceRoutes(fastify: FastifyInstance) {

  /**
   * POST /device/activate
   * Public — no JWT required. Requires x-tenant-slug or x-venue-id header.
   * Body: { licenseKey: string }
   * Returns: { deviceToken, deviceId, deviceName, deviceType }
   *
   * Called by the POS app on first run on a new terminal.
   */
  fastify.post(
    '/activate',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
      const schema = z.object({
        licenseKey: z.string().min(1).max(64),
      })

      let body: z.infer<typeof schema>
      try {
        body = schema.parse(request.body)
      } catch {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'licenseKey is required' },
        })
      }

      const db = resolveDb(request)
      const venueId = request.venueId!

      // Find the device by license key (scoped to this venue)
      const [device] = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.venueId, venueId),
            eq(devices.licenseKey, body.licenseKey.toUpperCase().trim()),
          )
        )
        .limit(1)

      if (!device) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'INVALID_LICENSE', message: 'Invalid license key' },
        })
      }

      if (device.status !== 'active') {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: { code: 'DEVICE_INACTIVE', message: `This terminal is ${device.status}. Contact your administrator.` },
        })
      }

      // Generate a secure device token (random 32 bytes = 64 hex chars)
      const deviceToken = randomBytes(32).toString('hex')
      const tokenHash   = sha256(deviceToken)

      // Mark the device as activated and store token hash
      await db
        .update(devices)
        .set({
          isActivated:     true,
          deviceTokenHash: tokenHash,
          activatedAt:     new Date(),
          lastHeartbeatAt: new Date(),
          lastIpAddress:   request.ip,
        })
        .where(eq(devices.id, device.id))

      return reply.status(HTTP_STATUS.OK).send({
        success: true,
        data: {
          deviceToken,
          deviceId:   device.id,
          deviceName: device.name,
          deviceType: device.deviceType,
        },
      })
    }
  )

  /**
   * POST /device/verify
   * Public — no JWT required. Requires x-tenant-slug or x-venue-id header.
   * Body: { deviceToken: string }
   * Returns: { deviceId, deviceName, deviceType, status }
   *
   * Called by the POS on every app load to verify the stored device token.
   */
  fastify.post(
    '/verify',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
      const schema = z.object({
        deviceToken: z.string().min(1),
      })

      let body: z.infer<typeof schema>
      try {
        body = schema.parse(request.body)
      } catch {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: { code: 'INVALID_DEVICE_TOKEN', message: 'Invalid device token' },
        })
      }

      const db = resolveDb(request)
      const venueId = request.venueId!
      const tokenHash = sha256(body.deviceToken)

      const [device] = await db
        .select({
          id:          devices.id,
          name:        devices.name,
          deviceType:  devices.deviceType,
          status:      devices.status,
          isActivated: devices.isActivated,
        })
        .from(devices)
        .where(
          and(
            eq(devices.venueId, venueId),
            eq(devices.deviceTokenHash, tokenHash),
          )
        )
        .limit(1)

      if (!device || !device.isActivated) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: { code: 'INVALID_DEVICE_TOKEN', message: 'Device token is invalid or has been revoked' },
        })
      }

      if (device.status !== 'active') {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: { code: 'DEVICE_INACTIVE', message: `This terminal is ${device.status}. Contact your administrator.` },
        })
      }

      return reply.send({
        success: true,
        data: {
          deviceId:   device.id,
          deviceName: device.name,
          deviceType: device.deviceType,
          status:     device.status,
        },
      })
    }
  )

  /**
   * POST /device/heartbeat
   * Public — no JWT required. Requires x-tenant-slug or x-venue-id header.
   * Body: { deviceToken: string }
   *
   * Sent periodically by POS to keep lastHeartbeatAt fresh.
   */
  fastify.post(
    '/heartbeat',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
      const schema = z.object({
        deviceToken: z.string().min(1),
      })

      let body: z.infer<typeof schema>
      try {
        body = schema.parse(request.body)
      } catch {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'deviceToken is required' },
        })
      }

      const db = resolveDb(request)
      const venueId = request.venueId!
      const tokenHash = sha256(body.deviceToken)

      await db
        .update(devices)
        .set({
          lastHeartbeatAt: new Date(),
          lastIpAddress:   request.ip,
        })
        .where(
          and(
            eq(devices.venueId, venueId),
            eq(devices.deviceTokenHash, tokenHash),
          )
        )

      return reply.send({ success: true })
    }
  )
}
