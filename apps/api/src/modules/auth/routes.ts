import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  db as globalDb,
  users,
  accounts,
  accountOtpLog,
  userRoles,
  roles,
  rolePermissions,
  permissions,
  eq,
  and,
  or,
  gt,
  type DB,
} from '@venueplus/database'
import bcrypt from 'bcryptjs'
import { HTTP_STATUS, ERROR_CODES } from '@venueplus/shared'


// ─── DB resolver ─────────────────────────────────────────────────────────────

/** Returns tenant DB in multi-tenant mode, global DB in single-tenant mode. */
function resolveDb(tenantDb: DB | undefined): DB {
  return tenantDb ?? globalDb
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const StaffLoginBody = z.object({
  identifier: z.string().min(1),  // username or email
  pin: z.string().length(4).regex(/^\d{4}$/),
  /** In multi-tenant mode venueId comes from the tenant registry; in single-tenant dev it is sent by the frontend. */
  venueId: z.string().uuid().optional(),
})

const RequestOtpBody = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  venueId: z.string().uuid(),
})

const VerifyOtpBody = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6),
  venueId: z.string().uuid(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendOtp(mobile: string, otp: string): Promise<void> {
  // Stubbed — replace with real SMS provider
  console.log(`[OTP] Mobile: ${mobile} → OTP: ${otp}`)
}

/**
 * Load all role names and permission keys for a user at a specific venue.
 * Joins: user_roles → roles → role_permissions → permissions
 */
async function loadUserRolesAndPermissions(
  activeDb: DB,
  userId: string,
  venueId: string
): Promise<{ roles: string[]; permissions: string[] }> {
  // Get active role assignments for this user at this venue
  const roleRows = await activeDb
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.venueId, venueId),
        eq(userRoles.isActive, true)
      )
    )

  const roleNames = roleRows.map((r) => r.roleName)

  if (roleNames.length === 0) {
    return { roles: [], permissions: [] }
  }

  // Get all granted permissions for those roles
  const permRows = await activeDb
    .selectDistinct({ permName: permissions.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.venueId, venueId),
        eq(userRoles.isActive, true),
        eq(rolePermissions.granted, true)
      )
    )

  return {
    roles: roleNames,
    permissions: permRows.map((p) => p.permName),
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/auth/staff/login
   * Staff login with username + 4-digit PIN.
   * Returns JWT with real roles and permissions loaded from the DB.
   */
  fastify.post('/staff/login', async (request, reply) => {
    const body = StaffLoginBody.parse(request.body)

    // Resolve which DB to query:
    //   - Multi-tenant mode: request.tenantDb (set by resolveTenant middleware)
    //   - Single-tenant mode: global db import
    const activeDb = resolveDb(request.tenantDb)

    // Resolve venueId:
    //   - Multi-tenant: comes from the tenant registry via middleware
    //   - Single-tenant dev: sent explicitly in the request body
    const venueId = request.tenantVenueId ?? body.venueId
    if (!venueId) {
      return reply.status(HTTP_STATUS.BAD_REQUEST).send({
        success: false,
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'venueId is required in single-tenant mode' },
      })
    }

    // Find user by username or email (users are global within the tenant DB)
    const [user] = await activeDb
      .select()
      .from(users)
      .where(
        and(
          or(eq(users.username, body.identifier), eq(users.email, body.identifier)),
          eq(users.isActive, true)
        )
      )
      .limit(1)

    if (!user || !(await bcrypt.compare(body.pin, user.pinHash ?? ''))) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: { code: ERROR_CODES.INVALID_CREDENTIALS, message: 'Invalid credentials' },
      })
    }

    // Load real roles and permissions from DB
    const { roles: userRoleNames, permissions: userPermissions } =
      await loadUserRolesAndPermissions(activeDb, user.id, venueId)

    const token = fastify.jwt.sign({
      sub: user.id,
      staffId: user.id,
      venueId,
      displayName: user.displayName,
      roles: userRoleNames,
      permissions: userPermissions,
      channel: 'staff' as const,
    })

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.displayName,
          email: user.email,
          venueId,
          roles: userRoleNames,
          permissions: userPermissions,
        },
      },
    })
  })

  /**
   * POST /api/v1/auth/otp/request
   * Request OTP for customer mobile login.
   */
  fastify.post('/otp/request', async (request, reply) => {
    const body = RequestOtpBody.parse(request.body)
    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 min

    // Upsert account
    let account = await globalDb.query.accounts.findFirst({
      where: and(eq(accounts.mobileNumber, body.mobile), eq(accounts.venueId, body.venueId)),
    })

    if (!account) {
      const [created] = await globalDb
        .insert(accounts)
        .values({
          venueId: body.venueId,
          mobileNumber: body.mobile,
          displayName: body.mobile, // default display name until profile is updated
          authProvider: 'mobile',
        })
        .returning()
      account = created
    }

    // Store OTP (bcrypt hash)
    const otpHash = await bcrypt.hash(otp, 6)
    await globalDb.insert(accountOtpLog).values({
      accountId: account!.id,
      channel: 'sms',
      recipient: body.mobile,
      purpose: 'login',
      otpHash,
      expiresAt,
    })

    await sendOtp(body.mobile, otp)

    return reply.status(HTTP_STATUS.OK).send({
      success: true,
      data: { message: 'OTP sent', expiresAt },
    })
  })

  /**
   * POST /api/v1/auth/otp/verify
   * Verify OTP and issue JWT.
   */
  fastify.post('/otp/verify', async (request, reply) => {
    const body = VerifyOtpBody.parse(request.body)

    const account = await globalDb.query.accounts.findFirst({
      where: and(eq(accounts.mobileNumber, body.mobile), eq(accounts.venueId, body.venueId)),
    })

    if (!account) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: { code: ERROR_CODES.INVALID_OTP, message: 'Invalid OTP' },
      })
    }

    // Find latest valid OTP
    const otpRecord = await globalDb.query.accountOtpLog.findFirst({
      where: and(
        eq(accountOtpLog.accountId, account.id),
        eq(accountOtpLog.purpose, 'login'),
        eq(accountOtpLog.isUsed, false),
        gt(accountOtpLog.expiresAt, new Date())
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })

    if (!otpRecord || !(await bcrypt.compare(body.otp, otpRecord.otpHash ?? ''))) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: { code: ERROR_CODES.INVALID_OTP, message: 'Invalid or expired OTP' },
      })
    }

    // Mark OTP used
    await globalDb
      .update(accountOtpLog)
      .set({ isUsed: true })
      .where(eq(accountOtpLog.id, otpRecord.id))

    // Update last login
    await globalDb
      .update(accounts)
      .set({ lastLoginAt: new Date() })
      .where(eq(accounts.id, account.id))

    const token = fastify.jwt.sign({
      sub: account.id,
      accountId: account.id,
      venueId: body.venueId,
      channel: 'customer' as const,
    })

    return reply.send({
      success: true,
      data: {
        token,
        account: {
          id: account.id,
          mobile: account.mobileNumber,
          email: account.email,
          name: account.displayName,
          isNewAccount: account.displayName === account.mobileNumber,
        },
      },
    })
  })

  /**
   * POST /api/v1/auth/logout
   */
  fastify.post('/logout', async (_request, reply) => {
    // Stateless JWT — client drops token; server can blacklist if needed
    return reply.send({ success: true, data: { message: 'Logged out' } })
  })
}
