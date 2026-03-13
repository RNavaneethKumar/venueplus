import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  accounts,
  persons,
  accountPersons,
  orders,
  memberships,
  wallets,
  eq,
  and,
  or,
  ilike,
  type DB,
} from '@venueplus/database'
import { requireAuth, requireStaff, requireVenueHeader } from '../../middleware/auth.js'
import { HTTP_STATUS, ERROR_CODES } from '@venueplus/shared'

// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns the per-tenant Drizzle DB in multi-tenant mode, global DB otherwise. */
function resolveDb(req: import('fastify').FastifyRequest): DB {
  return req.tenantDb ?? globalDb
}


export async function accountRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/accounts/search?q=  (staff only)
   * Search accounts by name, email, or mobile number.
   */
  fastify.get(
    '/search',
    { preHandler: [requireStaff, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const { q } = request.query as { q?: string }
      const venueId = request.venueId!

      if (!q || q.trim().length < 2) {
        return reply.send({ success: true, data: [] })
      }

      const term = `%${q.trim()}%`
      const results = await db
        .select({
          id:            accounts.id,
          displayName:   accounts.displayName,
          email:         accounts.email,
          mobileNumber:  accounts.mobileNumber,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.venueId, venueId),
            eq(accounts.isActive, true),
            or(
              ilike(accounts.displayName,  term),
              ilike(accounts.email,        term),
              ilike(accounts.mobileNumber, term),
            ),
          ),
        )
        .limit(8)

      return reply.send({ success: true, data: results })
    },
  )

  /**
   * POST /api/v1/accounts  (staff only)
   * Quick-create a customer account from the POS.
   */
  fastify.post(
    '/',
    { preHandler: [requireStaff, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const venueId = request.venueId!
      const staffUserId = (request.user as any).userId as string | undefined

      const body = z
        .object({
          displayName:  z.string().min(1, 'Name is required'),
          mobileNumber: z.string().optional(),
          email:        z.string().email().optional().or(z.literal('')),
        })
        .parse(request.body)

      const [account] = await db
        .insert(accounts)
        .values({
          venueId,
          displayName:  body.displayName.trim(),
          mobileNumber: body.mobileNumber?.trim() || null,
          email:        body.email?.trim() || null,
          authProvider: 'mobile',
          createdBy:    staffUserId ?? null,
        })
        .returning({
          id:           accounts.id,
          displayName:  accounts.displayName,
          email:        accounts.email,
          mobileNumber: accounts.mobileNumber,
        })

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: account })
    },
  )

  /**
   * GET /api/v1/accounts/me
   * Get current authenticated account profile.
   */
  fastify.get(
    '/me',
    { preHandler: [requireAuth, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const accountId = (request.user as any).accountId
      if (!accountId) {
        return reply.status(HTTP_STATUS.FORBIDDEN).send({
          success: false,
          error: { code: ERROR_CODES.INSUFFICIENT_PERMISSIONS, message: 'Customer account required' },
        })
      }

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        with: { persons: true },
      })

      if (!account) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' },
        })
      }

      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.accountId, accountId),
      })

      const activeMembership = await db.query.memberships.findFirst({
        where: and(eq(memberships.accountId, accountId), eq(memberships.status, 'active')),
        with: { plan: true },
      })

      return reply.send({
        success: true,
        data: {
          ...account,
          wallet: wallet ?? null,
          membership: activeMembership ?? null,
        },
      })
    }
  )

  /**
   * PUT /api/v1/accounts/me
   * Update profile (display name + email only; stored on accounts table).
   */
  fastify.put(
    '/me',
    { preHandler: [requireAuth, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const accountId = (request.user as any).accountId
      const body = z
        .object({
          displayName: z.string().min(1).optional(),
          email: z.string().email().optional(),
        })
        .parse(request.body)

      await db
        .update(accounts)
        .set({
          ...(body.displayName !== undefined && { displayName: body.displayName }),
          ...(body.email !== undefined && { email: body.email }),
        })
        .where(eq(accounts.id, accountId))

      return reply.send({ success: true, data: { updated: true } })
    }
  )

  /**
   * GET /api/v1/accounts/me/persons
   * List linked persons (family/group members).
   */
  fastify.get(
    '/me/persons',
    { preHandler: [requireAuth, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const accountId = (request.user as any).accountId
      const rows = await db
        .select({ person: persons, link: accountPersons })
        .from(accountPersons)
        .innerJoin(persons, eq(accountPersons.personId, persons.id))
        .where(eq(accountPersons.accountId, accountId))

      return reply.send({ success: true, data: rows })
    }
  )

  /**
   * POST /api/v1/accounts/me/persons
   * Add a person to the account.
   */
  fastify.post(
    '/me/persons',
    { preHandler: [requireAuth, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const accountId = (request.user as any).accountId
      const venueId = request.venueId!
      const body = z
        .object({
          firstName: z.string().min(1),
          lastName: z.string().optional(),
          relationship: z
            .enum(['self', 'child', 'spouse', 'guardian', 'other'])
            .optional(),
          dateOfBirth: z.string().optional(),
          gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
        })
        .parse(request.body)

      const [person] = await db
        .insert(persons)
        .values({
          venueId,
          firstName: body.firstName,
          lastName: body.lastName,
          dateOfBirth: body.dateOfBirth,
          gender: body.gender as any,
        })
        .returning()

      await db.insert(accountPersons).values({
        accountId,
        personId: person!.id,
        relationship: body.relationship,
        isPrimary: false,
      })

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: person })
    }
  )

  /**
   * GET /api/v1/accounts/me/orders
   * Order history for current account.
   */
  fastify.get(
    '/me/orders',
    { preHandler: [requireAuth, requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const accountId = (request.user as any).accountId
      const venueId = request.venueId!
      const { page = '1', limit = '10' } = request.query as Record<string, string>
      const pageNum = parseInt(page, 10)
      const pageSize = Math.min(parseInt(limit, 10), 50)

      const rows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.accountId, accountId), eq(orders.venueId, venueId)))
        .orderBy(orders.createdAt)
        .limit(pageSize)
        .offset((pageNum - 1) * pageSize)

      return reply.send({
        success: true,
        data: rows,
        meta: { page: pageNum, limit: pageSize },
      })
    }
  )

  /**
   * GET /api/v1/accounts/:id  (staff only)
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [requireVenueHeader] },
    async (request, reply) => {
    const db = resolveDb(request)
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, request.params.id),
        with: { persons: true },
      })

      if (!account) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' },
        })
      }

      return reply.send({ success: true, data: account })
    }
  )
}
