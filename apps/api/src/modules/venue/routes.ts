import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  venues,
  venueSettings,
  venueFeatureFlags,
  eq,
  and,
  type DB,
} from '@venueplus/database'
import { requireStaff, requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS, ERROR_CODES } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


// ─── Routes ───────────────────────────────────────────────────────────────────

export async function venueRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/venue
   * Get current venue details + settings (reads x-venue-id header).
   */
  fastify.get('/', { preHandler: [requireVenueHeader] }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!

    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    })

    if (!venue) {
      return reply.status(HTTP_STATUS.NOT_FOUND).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Venue not found' },
      })
    }

    const settings = await db
      .select()
      .from(venueSettings)
      .where(eq(venueSettings.venueId, venueId))

    const flags = await db
      .select()
      .from(venueFeatureFlags)
      .where(eq(venueFeatureFlags.venueId, venueId))

    // Map settingKey → settingValue
    const settingsMap = Object.fromEntries(settings.map((s) => [s.settingKey, s.settingValue]))
    const flagsMap = Object.fromEntries(flags.map((f) => [f.featureKey, f.isEnabled]))

    return reply.send({
      success: true,
      data: { venue, settings: settingsMap, features: flagsMap },
    })
  })

  /**
   * GET /api/v1/venue/pos-config
   * Returns POS-relevant feature flags as a typed config object (staff only).
   * Reads from venue_feature_flags; missing flags default to false.
   */
  fastify.get(
    '/pos-config',
    { preHandler: [requireStaff, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!

      const flags = await db
        .select()
        .from(venueFeatureFlags)
        .where(eq(venueFeatureFlags.venueId, venueId))

      const flagsMap = Object.fromEntries(flags.map((f) => [f.featureKey, f.isEnabled]))

      return reply.send({
        success: true,
        data: {
          // Tab visibility — default tickets to true, rest default off
          tabs: {
            tickets:     flagsMap['pos.tickets']     ?? true,
            fnb:         flagsMap['pos.fnb']         ?? false,
            retail:      flagsMap['pos.retail']      ?? false,
            wallet:      flagsMap['pos.wallet']      ?? false,
            memberships: flagsMap['pos.memberships'] ?? false,
          },
          // Order behaviour
          requireCustomer: flagsMap['pos.require_customer'] ?? false,
        },
      })
    },
  )

  /**
   * GET /api/v1/venue/settings/:key
   */
  fastify.get<{ Params: { key: string } }>(
    '/settings/:key',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { key } = request.params
      const venueId = request.venueId!

      const [setting] = await db
        .select()
        .from(venueSettings)
        .where(and(eq(venueSettings.venueId, venueId), eq(venueSettings.settingKey, key)))
        .limit(1)

      if (!setting) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'SETTING_NOT_FOUND', message: `Setting '${key}' not found` },
        })
      }

      return reply.send({ success: true, data: { key: setting.settingKey, value: setting.settingValue } })
    }
  )

  /**
   * PUT /api/v1/venue/settings/:key
   * Update a venue setting (staff only).
   */
  fastify.put<{ Params: { key: string }; Body: { value: unknown } }>(
    '/settings/:key',
    { preHandler: [requireStaff, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { key } = request.params
      const { value } = z.object({ value: z.unknown() }).parse(request.body)
      const venueId = request.venueId!

      await db
        .update(venueSettings)
        .set({ settingValue: String(value) })
        .where(and(eq(venueSettings.venueId, venueId), eq(venueSettings.settingKey, key)))

      return reply.send({ success: true, data: { key, value } })
    }
  )
}
