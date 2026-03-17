import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  venues,
  venueSettings,
  venueFeatureFlags,
  devices,
  auditLogs,
  notificationTemplates,
  alertRules,
  alertsLog,
  visitorTypes,
  resources,
  taxStructures,
  taxStructureComponents,
  taxComponents,
  products,
  productPrices,
  accounts,
  orders,
  orderItems,
  orderPayments,
  orderStatusHistory,
  eq,
  and,
  desc,
  asc,
  ilike,
  sql,
  type DB,
} from '@venueplus/database'
import {
  requireVenueHeader,
  requireRole,
} from '../../middleware/auth.js'
import { HTTP_STATUS, ERROR_CODES } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


const adminGuard = [requireVenueHeader, requireRole('super_admin', 'venue_admin', 'manager')]

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {

  // ──────────────────────────────────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/users — list all staff users */
  fastify.get('/users', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const rows = await db
      .select({
        id:          users.id,
        username:    users.username,
        displayName: users.displayName,
        mobileNumber: users.mobileNumber,
        email:       users.email,
        isActive:    users.isActive,
        isLocked:    users.isLocked,
        lastLoginAt: users.lastLoginAt,
        createdAt:   users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))

    // Attach roles to each user
    const userIds = rows.map((u) => u.id)
    let userRoleMap: Record<string, string[]> = {}
    if (userIds.length > 0) {
      const roleRows = await db
        .select({
          userId:   userRoles.userId,
          roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.isActive, true))
      for (const r of roleRows) {
        if (!userRoleMap[r.userId]) userRoleMap[r.userId] = []
        ;(userRoleMap[r.userId] as string[]).push(r.roleName)
      }
    }

    return reply.send({
      success: true,
      data: rows.map((u) => ({ ...u, roles: userRoleMap[u.id] ?? [] })),
    })
  })

  /** GET /admin/users/:id — single user with roles */
  fastify.get<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params

      const [user] = await db
        .select({
          id:           users.id,
          username:     users.username,
          displayName:  users.displayName,
          mobileNumber: users.mobileNumber,
          email:        users.email,
          isActive:     users.isActive,
          isLocked:     users.isLocked,
          lastLoginAt:  users.lastLoginAt,
          createdAt:    users.createdAt,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      if (!user) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found' },
        })
      }

      const roleRows = await db
        .select({ id: userRoles.id, roleId: userRoles.roleId, name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, id), eq(userRoles.isActive, true)))

      return reply.send({ success: true, data: { ...user, roles: roleRows.map((r) => r.name) } })
    }
  )

  /** POST /admin/users — create a new staff user */
  fastify.post('/users', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const schema = z.object({
      username:    z.string().min(2).max(64),
      displayName: z.string().min(2).max(128),
      pin:         z.string().min(4).max(8),
      mobileNumber: z.string().optional(),
      email:       z.string().email().optional(),
    })
    const body = schema.parse(request.body)
    const requestUser = (request as any).user

    // Hash PIN using SHA-256 (same as auth module)
    const { createHash } = await import('node:crypto')
    const pinHash = createHash('sha256').update(body.pin).digest('hex')

    const [created] = await db
      .insert(users)
      .values({
        username:    body.username,
        displayName: body.displayName,
        pinHash,
        mobileNumber: body.mobileNumber ?? null,
        email:       body.email ?? null,
        createdBy:   requestUser?.staffId ?? null,
      })
      .returning({ id: users.id, username: users.username, displayName: users.displayName })

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  /** PATCH /admin/users/:id — update a user */
  fastify.patch<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const schema = z.object({
        displayName:  z.string().min(2).max(128).optional(),
        mobileNumber: z.string().optional(),
        email:        z.string().email().optional(),
        isActive:     z.boolean().optional(),
        isLocked:     z.boolean().optional(),
      })
      const body = schema.parse(request.body)

      const [updated] = await db
        .update(users)
        .set({ ...body })
        .where(eq(users.id, id))
        .returning({ id: users.id, username: users.username, displayName: users.displayName, isActive: users.isActive })

      if (!updated) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'User not found' },
        })
      }

      return reply.send({ success: true, data: updated })
    }
  )

  /** PATCH /admin/users/:id/reset-pin — reset PIN */
  fastify.patch<{ Params: { id: string } }>(
    '/users/:id/reset-pin',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const schema = z.object({ pin: z.string().min(4).max(8) })
      const { pin } = schema.parse(request.body)

      const { createHash } = await import('node:crypto')
      const pinHash = createHash('sha256').update(pin).digest('hex')

      await db.update(users).set({ pinHash }).where(eq(users.id, id))
      return reply.send({ success: true })
    }
  )

  /** GET /admin/users/:id/roles — roles for a specific user */
  fastify.get<{ Params: { id: string } }>(
    '/users/:id/roles',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const rows = await db
        .select({
          id:       userRoles.id,
          roleId:   userRoles.roleId,
          roleName: roles.name,
          venueId:  userRoles.venueId,
          isActive: userRoles.isActive,
          assignedAt: userRoles.assignedAt,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, id))
        .orderBy(desc(userRoles.assignedAt))

      return reply.send({ success: true, data: rows })
    }
  )

  /** POST /admin/users/:id/roles — assign role to user */
  fastify.post<{ Params: { id: string } }>(
    '/users/:id/roles',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const schema = z.object({
        roleId:  z.string().uuid(),
        venueId: z.string().uuid().optional(),
      })
      const body = schema.parse(request.body)
      const requestUser = (request as any).user

      const [row] = await db
        .insert(userRoles)
        .values({
          userId:     id,
          roleId:     body.roleId,
          venueId:    body.venueId ?? null,
          assignedBy: requestUser?.staffId ?? null,
        })
        .returning()

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: row })
    }
  )

  /** DELETE /admin/users/:id/roles/:roleId — remove role from user */
  fastify.delete<{ Params: { id: string; roleId: string } }>(
    '/users/:id/roles/:roleId',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id, roleId } = request.params
      await db
        .update(userRoles)
        .set({ isActive: false })
        .where(and(eq(userRoles.userId, id), eq(userRoles.roleId, roleId), eq(userRoles.isActive, true)))

      return reply.send({ success: true })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // ROLES & PERMISSIONS
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/roles — all roles with permission count */
  fastify.get('/roles', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const rows = await db.select().from(roles).orderBy(roles.name)
    return reply.send({ success: true, data: rows })
  })

  /** POST /admin/roles — create a new role */
  fastify.post('/roles', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const schema = z.object({
      name:        z.string().min(2).max(64),
      description: z.string().optional(),
      scopeType:   z.enum(['venue', 'global']).default('venue'),
    })
    const body = schema.parse(request.body)

    const [created] = await db
      .insert(roles)
      .values({ ...body })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  /** PATCH /admin/roles/:id — update role */
  fastify.patch<{ Params: { id: string } }>(
    '/roles/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const schema = z.object({
        name:        z.string().min(2).max(64).optional(),
        description: z.string().optional(),
        isActive:    z.boolean().optional(),
      })
      const body = schema.parse(request.body)
      const [updated] = await db.update(roles).set(body).where(eq(roles.id, id)).returning()
      return reply.send({ success: true, data: updated })
    }
  )

  /** GET /admin/permissions — all permissions */
  fastify.get('/permissions', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const rows = await db.select().from(permissions).orderBy(permissions.module, permissions.key)
    return reply.send({ success: true, data: rows })
  })

  /** GET /admin/roles/:id/permissions — permissions for a role */
  fastify.get<{ Params: { id: string } }>(
    '/roles/:id/permissions',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const rows = await db
        .select({
          permissionId: rolePermissions.permissionId,
          key:          permissions.key,
          module:       permissions.module,
          description:  permissions.description,
          granted:      rolePermissions.granted,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, id))

      return reply.send({ success: true, data: rows })
    }
  )

  /** PUT /admin/roles/:id/permissions — set permissions for a role (replace) */
  fastify.put<{ Params: { id: string } }>(
    '/roles/:id/permissions',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const schema = z.object({
        permissionIds: z.array(z.string().uuid()),
      })
      const { permissionIds } = schema.parse(request.body)

      // Delete existing and insert new
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
      if (permissionIds.length > 0) {
        await db.insert(rolePermissions).values(
          permissionIds.map((permissionId) => ({ roleId: id, permissionId, granted: true }))
        )
      }

      return reply.send({ success: true })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // VISITOR TYPES
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/visitor-types */
  fastify.get('/visitor-types', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const rows = await db
      .select()
      .from(visitorTypes)
      .where(eq(visitorTypes.venueId, venueId))
      .orderBy(visitorTypes.name)

    return reply.send({ success: true, data: rows })
  })

  /** POST /admin/visitor-types */
  fastify.post('/visitor-types', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const schema = z.object({
      name:            z.string().min(1).max(64),
      code:            z.string().min(1).max(32),
      description:     z.string().optional(),
      isMinor:         z.boolean().default(false),
      requiresWaiver:  z.boolean().default(true),
    })
    const body = schema.parse(request.body)
    const requestUser = (request as any).user

    const [created] = await db
      .insert(visitorTypes)
      .values({ ...body, venueId, createdBy: requestUser?.staffId ?? null })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  /** PATCH /admin/visitor-types/:id */
  fastify.patch<{ Params: { id: string } }>(
    '/visitor-types/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const schema = z.object({
        name:           z.string().min(1).max(64).optional(),
        code:           z.string().min(1).max(32).optional(),
        description:    z.string().optional(),
        isMinor:        z.boolean().optional(),
        requiresWaiver: z.boolean().optional(),
        isActive:       z.boolean().optional(),
      })
      const body = schema.parse(request.body)

      const [updated] = await db
        .update(visitorTypes)
        .set(body)
        .where(and(eq(visitorTypes.id, id), eq(visitorTypes.venueId, venueId)))
        .returning()

      return reply.send({ success: true, data: updated })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // DEVICES
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/devices */
  fastify.get('/devices', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const rows = await db
      .select()
      .from(devices)
      .where(eq(devices.venueId, venueId))
      .orderBy(devices.name)

    return reply.send({ success: true, data: rows })
  })

  /** POST /admin/devices */
  fastify.post('/devices', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const schema = z.object({
      name:       z.string().min(1).max(128),
      deviceType: z.enum(['pos', 'gate', 'kiosk', 'kds', 'arcade_reader']),
      identifier: z.string().optional(),
    })
    const body = schema.parse(request.body)
    const requestUser = (request as any).user

    const [created] = await db
      .insert(devices)
      .values({ ...body, venueId, createdBy: requestUser?.staffId ?? null })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  /** PATCH /admin/devices/:id */
  fastify.patch<{ Params: { id: string } }>(
    '/devices/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const schema = z.object({
        name:       z.string().min(1).max(128).optional(),
        identifier: z.string().optional(),
        status:     z.enum(['active', 'inactive', 'maintenance']).optional(),
      })
      const body = schema.parse(request.body)

      const [updated] = await db
        .update(devices)
        .set(body)
        .where(and(eq(devices.id, id), eq(devices.venueId, venueId)))
        .returning()

      return reply.send({ success: true, data: updated })
    }
  )

  /** POST /admin/devices/:id/generate-license */
  fastify.post<{ Params: { id: string } }>(
    '/devices/:id/generate-license',
    { preHandler: adminGuard },
    async (request, reply) => {
      const { createHash, randomBytes } = await import('crypto')
      const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!

      // Ensure the device belongs to this venue
      const [device] = await db
        .select({ id: devices.id, name: devices.name })
        .from(devices)
        .where(and(eq(devices.id, id), eq(devices.venueId, venueId)))
        .limit(1)

      if (!device) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Device not found' },
        })
      }

      // Generate license key: VP-XXXX-XXXX-XXXX (base-36 random, uppercased)
      const segment = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
      const licenseKey = `VP-${segment()}-${segment()}-${segment()}`

      const [updated] = await db
        .update(devices)
        .set({
          licenseKey,
          // Reset activation so the old terminal must re-activate with the new key
          isActivated:     false,
          deviceTokenHash: null,
          activatedAt:     null,
        })
        .where(and(eq(devices.id, id), eq(devices.venueId, venueId)))
        .returning()

      return reply.send({ success: true, data: { licenseKey, device: updated } })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // AUDIT LOGS
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/audit-logs?limit=50&offset=0 */
  fastify.get('/audit-logs', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { limit = '50', offset = '0', actionType } = request.query as {
      limit?: string; offset?: string; actionType?: string
    }

    const rows = await db
      .select({
        id:         auditLogs.id,
        timestamp:  auditLogs.timestamp,
        userId:     auditLogs.userId,
        actionType: auditLogs.actionType,
        entityType: auditLogs.entityType,
        entityId:   auditLogs.entityId,
        ipAddress:  auditLogs.ipAddress,
        metadata:   auditLogs.metadata,
        userName:   users.displayName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          eq(auditLogs.venueId, venueId),
          actionType ? eq(auditLogs.actionType, actionType) : sql`1=1`
        )
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(Number(limit))
      .offset(Number(offset))

    return reply.send({ success: true, data: rows })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // NOTIFICATION TEMPLATES
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/notification-templates */
  fastify.get('/notification-templates', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const rows = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.venueId, venueId))
      .orderBy(notificationTemplates.channel, notificationTemplates.templateKey)

    return reply.send({ success: true, data: rows })
  })

  /** POST /admin/notification-templates */
  fastify.post('/notification-templates', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const schema = z.object({
      channel:     z.enum(['email', 'sms', 'push', 'whatsapp']),
      templateKey: z.string().min(1).max(128),
      subject:     z.string().optional(),
      body:        z.string().min(1),
    })
    const body = schema.parse(request.body)

    const [created] = await db
      .insert(notificationTemplates)
      .values({ ...body, venueId })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  /** PATCH /admin/notification-templates/:id */
  fastify.patch<{ Params: { id: string } }>(
    '/notification-templates/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const schema = z.object({
        subject:  z.string().optional(),
        body:     z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
      const patch = schema.parse(request.body)

      const [updated] = await db
        .update(notificationTemplates)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.venueId, venueId)))
        .returning()

      return reply.send({ success: true, data: updated })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // ALERT RULES & LOG
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/alert-rules */
  fastify.get('/alert-rules', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const rows = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.venueId, venueId))
      .orderBy(alertRules.alertType)

    return reply.send({ success: true, data: rows })
  })

  /** POST /admin/alert-rules */
  fastify.post('/alert-rules', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const schema = z.object({
      alertType:           z.enum(['device.offline', 'capacity.threshold', 'inventory.low_stock', 'revenue.drop', 'payment.failure']),
      thresholdValue:      z.string().optional(),
      comparisonOperator:  z.string().optional(),
      timeWindowMinutes:   z.string().optional(),
      severity:            z.enum(['info', 'warning', 'critical']).default('warning'),
    })
    const body = schema.parse(request.body)
    const requestUser = (request as any).user

    const staffId = (requestUser as any)?.staffId
    if (!staffId) {
      return reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: { code: ERROR_CODES.INSUFFICIENT_PERMISSIONS, message: 'Staff identity required to create alert rules' },
      })
    }

    const [created] = await db
      .insert(alertRules)
      .values({ ...body, venueId, createdBy: staffId })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  /** PATCH /admin/alert-rules/:id */
  fastify.patch<{ Params: { id: string } }>(
    '/alert-rules/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const schema = z.object({
        thresholdValue:    z.string().optional(),
        comparisonOperator: z.string().optional(),
        timeWindowMinutes: z.string().optional(),
        severity:          z.enum(['info', 'warning', 'critical']).optional(),
        isActive:          z.boolean().optional(),
      })
      const body = schema.parse(request.body)

      const [updated] = await db
        .update(alertRules)
        .set(body)
        .where(and(eq(alertRules.id, id), eq(alertRules.venueId, venueId)))
        .returning()

      return reply.send({ success: true, data: updated })
    }
  )

  /** GET /admin/alerts-log */
  fastify.get('/alerts-log', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string }

    const rows = await db
      .select()
      .from(alertsLog)
      .where(eq(alertsLog.venueId, venueId))
      .orderBy(desc(alertsLog.createdAt))
      .limit(Number(limit))
      .offset(Number(offset))

    return reply.send({ success: true, data: rows })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // VENUE
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/venue — venue info + settings */
  fastify.get('/venue', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!

    const [venue] = await db.select().from(venues).where(eq(venues.id, venueId))
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

    const featureFlags = await db
      .select()
      .from(venueFeatureFlags)
      .where(eq(venueFeatureFlags.venueId, venueId))

    return reply.send({
      success: true,
      data: {
        ...venue,
        settings: Object.fromEntries(settings.map((s) => [s.settingKey, s.settingValue])),
        featureFlags: Object.fromEntries(featureFlags.map((f) => [f.featureKey, f.isEnabled])),
      },
    })
  })

  /** PATCH /admin/venue — update venue details */
  fastify.patch('/venue', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const schema = z.object({
      name:                   z.string().min(1).optional(),
      legalName:              z.string().optional(),
      timezone:               z.string().optional(),
      taxRegistrationNumber:  z.string().optional(),
      registeredAddress:      z.string().optional(),
    })
    const body = schema.parse(request.body)

    const [updated] = await db
      .update(venues)
      .set(body)
      .where(eq(venues.id, venueId))
      .returning()

    return reply.send({ success: true, data: updated })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // RESOURCES
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/resources */
  fastify.get('/resources', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const rows = await db
      .select()
      .from(resources)
      .where(eq(resources.venueId, venueId))
      .orderBy(resources.name)

    return reply.send({ success: true, data: rows })
  })

  /** POST /admin/resources */
  fastify.post('/resources', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const schema = z.object({
      name:                   z.string().min(1).max(128),
      description:            z.string().optional(),
      admissionMode:          z.enum(['slot_based', 'rolling_duration', 'open_access']),
      capacityEnforcementType: z.enum(['hard', 'soft']).default('hard'),
      capacity:               z.number().int().min(1).optional(),
    })
    const body = schema.parse(request.body)
    const requestUser = (request as any).user

    const [created] = await db
      .insert(resources)
      .values({ ...body, venueId, createdBy: requestUser?.staffId ?? null })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  /** PATCH /admin/resources/:id */
  fastify.patch<{ Params: { id: string } }>(
    '/resources/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const schema = z.object({
        name:                   z.string().min(1).max(128).optional(),
        description:            z.string().optional(),
        capacity:               z.number().int().min(1).optional(),
        isActive:               z.boolean().optional(),
      })
      const body = schema.parse(request.body)

      const [updated] = await db
        .update(resources)
        .set(body)
        .where(and(eq(resources.id, id), eq(resources.venueId, venueId)))
        .returning()

      return reply.send({ success: true, data: updated })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // TAX STRUCTURES
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/tax — tax structures with components */
  fastify.get('/tax', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!

    const structures = await db
      .select()
      .from(taxStructures)
      .where(eq(taxStructures.venueId, venueId))
      .orderBy(taxStructures.name)

    // Get components for each structure
    const componentRows = await db
      .select({
        taxStructureId: taxStructureComponents.taxStructureId,
        id:             taxStructureComponents.id,
        taxRate:        taxStructureComponents.taxRatePercent,
        componentCode:  taxComponents.code,
        componentName:  taxComponents.name,
      })
      .from(taxStructureComponents)
      .innerJoin(taxComponents, eq(taxStructureComponents.taxComponentId, taxComponents.id))

    const componentMap: Record<string, any[]> = {}
    for (const c of componentRows) {
      if (!componentMap[c.taxStructureId]) componentMap[c.taxStructureId] = []
      ;(componentMap[c.taxStructureId] as object[]).push({
        id:   c.id,
        code: c.componentCode,
        name: c.componentName,
        rate: c.taxRate,
      })
    }

    return reply.send({
      success: true,
      data: structures.map((s) => ({ ...s, components: componentMap[s.id] ?? [] })),
    })
  })

  /** POST /admin/tax — create tax structure */
  fastify.post('/tax', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const schema = z.object({
      name:     z.string().min(1).max(128),
      code:     z.string().optional(),
    })
    const body = schema.parse(request.body)
    const requestUser = (request as any).user

    const [created] = await db
      .insert(taxStructures)
      .values({ ...body, venueId, createdBy: requestUser?.staffId ?? null })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCTS
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/products — all products for the venue */
  fastify.get('/products', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { search, productType, isActive } = request.query as {
      search?: string; productType?: string; isActive?: string
    }

    const rows = await db
      .select({
        id:          products.id,
        name:        products.name,
        code:        products.code,
        productType: products.productType,
        isActive:    products.isActive,
        createdAt:   products.createdAt,
      })
      .from(products)
      .where(
        and(
          eq(products.venueId, venueId),
          search ? ilike(products.name, `%${search}%`) : sql`1=1`,
          productType ? eq(products.productType, productType as any) : sql`1=1`,
          isActive !== undefined ? eq(products.isActive, isActive === 'true') : sql`1=1`,
        )
      )
      .orderBy(products.name)

    return reply.send({ success: true, data: rows })
  })

  /** GET /admin/products/:id — product detail with prices */
  fastify.get<{ Params: { id: string } }>(
    '/products/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!

      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, id), eq(products.venueId, venueId)))

      if (!product) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Product not found' },
        })
      }

      const prices = await db
        .select()
        .from(productPrices)
        .where(eq(productPrices.productId, id))

      return reply.send({ success: true, data: { ...product, prices } })
    }
  )

  /** PATCH /admin/products/:id */
  fastify.patch<{ Params: { id: string } }>(
    '/products/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const schema = z.object({
        name:     z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
      const body = schema.parse(request.body)

      const [updated] = await db
        .update(products)
        .set(body)
        .where(and(eq(products.id, id), eq(products.venueId, venueId)))
        .returning()

      return reply.send({ success: true, data: updated })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // CUSTOMERS (accounts)
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/customers/:id — customer detail with persons and recent orders */
  fastify.get<{ Params: { id: string } }>(
    '/customers/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!

      const [account] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.venueId, venueId)))

      if (!account) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Customer not found' },
        })
      }

      const memberRows = await db.execute(
        sql`SELECT p.id, p.first_name, p.last_name, p.gender, p.date_of_birth, ap.relationship
            FROM persons p
            INNER JOIN account_persons ap ON ap.person_id = p.id
            WHERE ap.account_id = ${id}`
      )

      const recentOrders = await db.execute(
        sql`SELECT id, order_number, status, source_channel, total_amount, created_at
            FROM orders
            WHERE account_id = ${id} AND venue_id = ${venueId}
            ORDER BY created_at DESC
            LIMIT 10`
      )

      return reply.send({
        success: true,
        data: {
          ...account,
          persons: memberRows,
          recentOrders,
        },
      })
    }
  )

  /** GET /admin/customers — paginated account list */
  fastify.get('/customers', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { search = '', limit = '50', offset = '0' } = request.query as {
      search?: string; limit?: string; offset?: string
    }

    const term = search.trim()
    const rows = await db
      .select({
        id:           accounts.id,
        displayName:  accounts.displayName,
        email:        accounts.email,
        mobileNumber: accounts.mobileNumber,
        isActive:     accounts.isActive,
        createdAt:    accounts.createdAt,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.venueId, venueId),
          term.length >= 2
            ? sql`(${accounts.displayName} ILIKE ${`%${term}%`} OR ${accounts.email} ILIKE ${`%${term}%`} OR ${accounts.mobileNumber} ILIKE ${`%${term}%`})`
            : sql`1=1`
        )
      )
      .orderBy(desc(accounts.createdAt))
      .limit(Number(limit))
      .offset(Number(offset))

    return reply.send({ success: true, data: rows })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // REPORTING
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/reports/summary?from=&to= — aggregated revenue summary */
  fastify.get('/reports/summary', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { from, to } = request.query as { from?: string; to?: string }
    const today = new Date().toISOString().slice(0, 10)
    const dateFrom = from ?? today
    const dateTo = to ?? today

    const [revenue] = await db.execute(
      sql`SELECT
        COUNT(DISTINCT o.id)::int AS order_count,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'paid'), 0) AS total_revenue,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.source_channel = 'pos' AND o.status = 'paid'), 0) AS pos_revenue,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.source_channel = 'online' AND o.status = 'paid'), 0) AS online_revenue,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.source_channel = 'kiosk' AND o.status = 'paid'), 0) AS kiosk_revenue
      FROM orders o
      WHERE o.venue_id = ${venueId}
        AND DATE(o.created_at) >= ${dateFrom}
        AND DATE(o.created_at) <= ${dateTo}`
    )

    const paymentBreakdown = await db.execute(
      sql`SELECT
        op.payment_method,
        COALESCE(SUM(op.amount), 0) AS total
      FROM order_payments op
      INNER JOIN orders o ON op.order_id = o.id
      WHERE o.venue_id = ${venueId}
        AND op.status = 'completed'
        AND DATE(o.created_at) >= ${dateFrom}
        AND DATE(o.created_at) <= ${dateTo}
      GROUP BY op.payment_method`
    )

    return reply.send({
      success: true,
      data: {
        dateRange: { from: dateFrom, to: dateTo },
        revenue: revenue,
        paymentMethods: paymentBreakdown,
      },
    })
  })

  /** GET /admin/reports/daily-trend?from=&to= — day-by-day revenue for line/bar charts */
  fastify.get('/reports/daily-trend', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { from, to } = request.query as { from?: string; to?: string }
    const today = new Date().toISOString().slice(0, 10)
    const dateFrom = from ?? today
    const dateTo   = to   ?? today

    const rows = await db.execute(
      sql`SELECT
        DATE(o.created_at)::text                                                                              AS date,
        COUNT(DISTINCT o.id)::int                                                                             AS order_count,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'paid'), 0)::numeric                           AS total_revenue,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.source_channel = 'pos'    AND o.status = 'paid'), 0)::numeric AS pos_revenue,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.source_channel = 'online' AND o.status = 'paid'), 0)::numeric AS online_revenue,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.source_channel = 'kiosk'  AND o.status = 'paid'), 0)::numeric AS kiosk_revenue
      FROM orders o
      WHERE o.venue_id = ${venueId}
        AND DATE(o.created_at) >= ${dateFrom}
        AND DATE(o.created_at) <= ${dateTo}
      GROUP BY DATE(o.created_at)
      ORDER BY DATE(o.created_at)`
    )

    return reply.send({ success: true, data: { dateRange: { from: dateFrom, to: dateTo }, rows } })
  })

  /** GET /admin/reports/products?from=&to= — product performance table */
  fastify.get('/reports/products', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { from, to } = request.query as { from?: string; to?: string }
    const today = new Date().toISOString().slice(0, 10)
    const dateFrom = from ?? today
    const dateTo   = to   ?? today

    const rows = await db.execute(
      sql`SELECT
        p.id            AS product_id,
        p.name          AS product_name,
        p.product_type,
        SUM(oi.quantity)::int                              AS units_sold,
        COALESCE(SUM(oi.total_amount), 0)::numeric         AS revenue
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.id
      INNER JOIN orders   o ON oi.order_id   = o.id
      WHERE o.venue_id = ${venueId}
        AND o.status   = 'paid'
        AND DATE(o.created_at) >= ${dateFrom}
        AND DATE(o.created_at) <= ${dateTo}
      GROUP BY p.id, p.name, p.product_type
      ORDER BY revenue DESC`
    )

    return reply.send({ success: true, data: { dateRange: { from: dateFrom, to: dateTo }, rows } })
  })

  /** GET /admin/reports/visitor-types?from=&to= — visitor type breakdown */
  fastify.get('/reports/visitor-types', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const { from, to } = request.query as { from?: string; to?: string }
    const today = new Date().toISOString().slice(0, 10)
    const dateFrom = from ?? today
    const dateTo   = to   ?? today

    const rows = await db.execute(
      sql`SELECT
        vt.id           AS visitor_type_id,
        vt.name         AS visitor_type_name,
        SUM(oi.quantity)::int                              AS units_sold,
        COALESCE(SUM(oi.total_amount), 0)::numeric         AS revenue
      FROM order_items oi
      INNER JOIN visitor_types vt ON oi.visitor_type_id = vt.id
      INNER JOIN orders        o  ON oi.order_id        = o.id
      WHERE o.venue_id = ${venueId}
        AND o.status   = 'paid'
        AND DATE(o.created_at) >= ${dateFrom}
        AND DATE(o.created_at) <= ${dateTo}
      GROUP BY vt.id, vt.name
      ORDER BY revenue DESC`
    )

    return reply.send({ success: true, data: { dateRange: { from: dateFrom, to: dateTo }, rows } })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // VENUE SETTINGS & FEATURE FLAGS (edit)
  // ──────────────────────────────────────────────────────────────────────────

  /** PUT /admin/venue/settings — upsert a single setting key */
  fastify.put('/venue/settings', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const venueId = request.venueId!
    const schema = z.object({
      key:   z.string().min(1),
      value: z.string(),
    })
    const { key, value } = schema.parse(request.body)
    const requestUser = (request as any).user

    const existing = await db
      .select({ id: venueSettings.id })
      .from(venueSettings)
      .where(and(eq(venueSettings.venueId, venueId), eq(venueSettings.settingKey, key)))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(venueSettings)
        .set({ settingValue: value, updatedBy: requestUser?.staffId ?? null, updatedAt: new Date() })
        .where(eq(venueSettings.id, existing[0]!.id))
    } else {
      await db.insert(venueSettings).values({
        venueId,
        settingKey:   key,
        settingValue: value,
        updatedBy:    requestUser?.staffId ?? null,
      })
    }

    return reply.send({ success: true })
  })

  /** PUT /admin/venue/flags/:key — toggle a feature flag */
  fastify.put<{ Params: { key: string } }>(
    '/venue/flags/:key',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const { key } = request.params
      const schema = z.object({ enabled: z.boolean() })
      const { enabled } = schema.parse(request.body)
      const requestUser = (request as any).user
      const now = new Date()

      const existingFlag = await db
        .select({ id: venueFeatureFlags.id })
        .from(venueFeatureFlags)
        .where(and(eq(venueFeatureFlags.venueId, venueId), eq(venueFeatureFlags.featureKey, key)))
        .limit(1)

      if (existingFlag.length > 0) {
        await db
          .update(venueFeatureFlags)
          .set({
            isEnabled:  enabled,
            enabledAt:  enabled ? now : undefined,
            disabledAt: enabled ? undefined : now,
            updatedBy:  requestUser?.staffId ?? null,
          })
          .where(eq(venueFeatureFlags.id, existingFlag[0]!.id))
      } else {
        await db.insert(venueFeatureFlags).values({
          venueId,
          featureKey: key,
          isEnabled:  enabled,
          enabledAt:  enabled ? now : null,
          disabledAt: enabled ? null : now,
          updatedBy:  requestUser?.staffId ?? null,
        })
      }

      return reply.send({ success: true, data: { key, enabled } })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // TAX STRUCTURE COMPONENTS (manage)
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/tax/components — all available tax components */
  fastify.get('/tax/components', { preHandler: adminGuard }, async (request, reply) => {
    const db = resolveDb(request)
    const rows = await db
      .select()
      .from(taxComponents)
      .where(eq(taxComponents.isActive, true))
      .orderBy(taxComponents.name)
    return reply.send({ success: true, data: rows })
  })

  /** POST /admin/tax/:id/components — add a component to a tax structure */
  fastify.post<{ Params: { id: string } }>(
    '/tax/:id/components',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const schema = z.object({
        taxComponentId: z.string().uuid(),
        taxRatePercent: z.string().regex(/^\d+(\.\d{1,2})?$/),
      })
      const body = schema.parse(request.body)

      // Verify structure belongs to venue
      const [structure] = await db
        .select({ id: taxStructures.id })
        .from(taxStructures)
        .where(and(eq(taxStructures.id, id), eq(taxStructures.venueId, venueId)))

      if (!structure) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Tax structure not found' },
        })
      }

      const [created] = await db
        .insert(taxStructureComponents)
        .values({ taxStructureId: id, taxComponentId: body.taxComponentId, taxRatePercent: body.taxRatePercent })
        .returning()

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
    }
  )

  /** DELETE /admin/tax/:id/components/:componentId — remove a component */
  fastify.delete<{ Params: { id: string; componentId: string } }>(
    '/tax/:id/components/:componentId',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id, componentId } = request.params
      await db
        .delete(taxStructureComponents)
        .where(
          and(
            eq(taxStructureComponents.taxStructureId, id),
            eq(taxStructureComponents.id, componentId)
          )
        )
      return reply.send({ success: true })
    }
  )

  /** PATCH /admin/tax/:id — update tax structure name/code/active */
  fastify.patch<{ Params: { id: string } }>(
    '/tax/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const schema = z.object({
        name:     z.string().min(1).optional(),
        code:     z.string().optional(),
        isActive: z.boolean().optional(),
      })
      const body = schema.parse(request.body)
      const [updated] = await db
        .update(taxStructures)
        .set(body)
        .where(and(eq(taxStructures.id, id), eq(taxStructures.venueId, venueId)))
        .returning()
      return reply.send({ success: true, data: updated })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // ORDERS (admin detail view)
  // ──────────────────────────────────────────────────────────────────────────

  /** GET /admin/orders/:id — full order detail with items (product names), payments, status history */
  fastify.get<{ Params: { id: string } }>(
    '/orders/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!

      const [order] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.venueId, venueId)))
        .limit(1)

      if (!order) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Order not found' },
        })
      }

      // Items with product name and visitor type name
      const itemRows = await db
        .select({
          id:             orderItems.id,
          productId:      orderItems.productId,
          productName:    products.name,
          productCode:    products.code,
          productType:    products.productType,
          visitorTypeId:  orderItems.visitorTypeId,
          visitorTypeName: visitorTypes.name,
          quantity:       orderItems.quantity,
          unitPrice:      orderItems.unitPrice,
          discountAmount: orderItems.discountAmount,
          taxAmount:      orderItems.taxAmount,
          totalAmount:    orderItems.totalAmount,
          priceOverridden: orderItems.priceOverridden,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(visitorTypes, eq(orderItems.visitorTypeId, visitorTypes.id))
        .where(eq(orderItems.orderId, id))

      // Payments
      const paymentRows = await db
        .select()
        .from(orderPayments)
        .where(eq(orderPayments.orderId, id))
        .orderBy(asc(orderPayments.createdAt))

      // Status history
      const historyRows = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, id))
        .orderBy(asc(orderStatusHistory.changedAt))

      // Customer
      let customer = null
      if (order.accountId) {
        const [acct] = await db
          .select({ id: accounts.id, displayName: accounts.displayName, email: accounts.email, mobileNumber: accounts.mobileNumber })
          .from(accounts)
          .where(eq(accounts.id, order.accountId))
        customer = acct ?? null
      }

      return reply.send({
        success: true,
        data: {
          ...order,
          customer,
          orderItems:    itemRows,
          orderPayments: paymentRows,
          statusHistory: historyRows,
        },
      })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCT PRICES
  // ──────────────────────────────────────────────────────────────────────────

  /** POST /admin/products/:id/prices — add a price row */
  fastify.post<{ Params: { id: string } }>(
    '/products/:id/prices',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const venueId = request.venueId!
      const requestUser = (request as any).user

      const schema = z.object({
        visitorTypeId:  z.string().uuid().optional(),
        basePrice:      z.number().min(0),
        currencyCode:   z.string().min(3).max(3).default('INR'),
        salesChannel:   z.enum(['pos', 'online', 'kiosk', 'all']).optional(),
        effectiveFrom:  z.string().optional(),
        effectiveUntil: z.string().optional(),
        isActive:       z.boolean().default(true),
      })
      const body = schema.parse(request.body)

      // Verify product belongs to venue
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.id, id), eq(products.venueId, venueId)))
        .limit(1)

      if (!product) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Product not found' },
        })
      }

      const [created] = await db
        .insert(productPrices)
        .values({
          productId:     id,
          visitorTypeId: body.visitorTypeId ?? null,
          basePrice:     body.basePrice.toFixed(2),
          currencyCode:  body.currencyCode,
          salesChannel:  (body.salesChannel as any) ?? null,
          effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
          effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : null,
          isActive:      body.isActive,
          createdBy:     requestUser?.staffId ?? null,
        })
        .returning()

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
    }
  )

  /** PATCH /admin/products/:id/prices/:priceId — update a price row */
  fastify.patch<{ Params: { id: string; priceId: string } }>(
    '/products/:id/prices/:priceId',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id, priceId } = request.params

      const schema = z.object({
        visitorTypeId:  z.string().uuid().nullable().optional(),
        basePrice:      z.number().min(0).optional(),
        currencyCode:   z.string().min(3).max(3).optional(),
        salesChannel:   z.enum(['pos', 'online', 'kiosk', 'all']).nullable().optional(),
        effectiveFrom:  z.string().nullable().optional(),
        effectiveUntil: z.string().nullable().optional(),
        isActive:       z.boolean().optional(),
      })
      const body = schema.parse(request.body)

      const updatePayload: Record<string, unknown> = {}
      if (body.visitorTypeId !== undefined)  updatePayload.visitorTypeId  = body.visitorTypeId
      if (body.basePrice     !== undefined)  updatePayload.basePrice      = body.basePrice.toFixed(2)
      if (body.currencyCode  !== undefined)  updatePayload.currencyCode   = body.currencyCode
      if (body.salesChannel  !== undefined)  updatePayload.salesChannel   = body.salesChannel
      if (body.isActive      !== undefined)  updatePayload.isActive       = body.isActive
      if (body.effectiveFrom  !== undefined) updatePayload.effectiveFrom  = body.effectiveFrom  ? new Date(body.effectiveFrom)  : null
      if (body.effectiveUntil !== undefined) updatePayload.effectiveUntil = body.effectiveUntil ? new Date(body.effectiveUntil) : null

      const [updated] = await db
        .update(productPrices)
        .set(updatePayload)
        .where(and(eq(productPrices.id, priceId), eq(productPrices.productId, id)))
        .returning()

      if (!updated) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Price not found' },
        })
      }

      return reply.send({ success: true, data: updated })
    }
  )

  /** DELETE /admin/products/:id/prices/:priceId — remove a price row */
  fastify.delete<{ Params: { id: string; priceId: string } }>(
    '/products/:id/prices/:priceId',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id, priceId } = request.params
      await db
        .delete(productPrices)
        .where(and(eq(productPrices.id, priceId), eq(productPrices.productId, id)))
      return reply.send({ success: true })
    }
  )

  // ──────────────────────────────────────────────────────────────────────────
  // TAX COMPONENTS (global, venue-agnostic master list)
  // ──────────────────────────────────────────────────────────────────────────

  /** POST /admin/tax/components — create a new global tax component */
  fastify.post(
    '/tax/components',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const schema = z.object({
        code:     z.string().min(1).max(20),
        name:     z.string().min(1).max(100),
        isActive: z.boolean().default(true),
      })
      const body = schema.parse(request.body)
      const [created] = await db.insert(taxComponents).values(body).returning()
      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
    }
  )

  /** PATCH /admin/tax/components/:id — update a global tax component */
  fastify.patch<{ Params: { id: string } }>(
    '/tax/components/:id',
    { preHandler: adminGuard },
    async (request, reply) => {
    const db = resolveDb(request)
      const { id } = request.params
      const schema = z.object({
        code:     z.string().min(1).max(20).optional(),
        name:     z.string().min(1).max(100).optional(),
        isActive: z.boolean().optional(),
      })
      const body = schema.parse(request.body)
      const [updated] = await db.update(taxComponents).set(body).where(eq(taxComponents.id, id)).returning()
      if (!updated) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Tax component not found' },
        })
      }
      return reply.send({ success: true, data: updated })
    }
  )
}
