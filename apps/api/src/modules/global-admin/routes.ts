// ============================================================================
// Global Admin Routes
//
// These routes are accessible ONLY to super-admins (global_admins table in
// the registry DB). They are completely tenant-independent — no x-tenant-slug
// header is required or honoured.
//
// Route map:
//   POST   /api/v1/global-admin/auth/login      — issue a global-admin JWT
//   POST   /api/v1/global-admin/auth/seed        — seed first admin (only when table empty)
//   GET    /api/v1/global-admin/tenants           — list all tenants
//   POST   /api/v1/global-admin/tenants           — provision a new tenant
//   PATCH  /api/v1/global-admin/tenants/:id       — update tenant fields
//   DELETE /api/v1/global-admin/tenants/:id       — soft-delete (deactivate)
// ============================================================================

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  getRegistryDb,
  tenants,
  globalAdmins,
  type Tenant,
  eq,
  desc,
} from '@venueplus/database'
import bcrypt from 'bcryptjs'
import { HTTP_STATUS } from '@venueplus/shared'
import { requireGlobalAdmin } from '../../middleware/globalAdmin.js'
import { createDatabase, runMigrations, createVenue } from './provisioner.js'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const LoginBody = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

const CreateTenantBody = z.object({
  slug:           z.string().min(2).max(63).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  name:           z.string().min(1).max(100),
  dbUrl:          z.string().min(10),
  defaultVenueId: z.string().uuid(),
  plan:           z.enum(['basic', 'professional', 'enterprise']).default('basic'),
})

const UpdateTenantBody = z.object({
  name:           z.string().min(1).max(100).optional(),
  dbUrl:          z.string().min(10).optional(),
  defaultVenueId: z.string().uuid().optional(),
  plan:           z.enum(['basic', 'professional', 'enterprise']).optional(),
  isActive:       z.boolean().optional(),
})

const SeedAdminBody = z.object({
  email:    z.string().email(),
  name:     z.string().min(1),
  password: z.string().min(8),
  /** One-time seed secret configured in env to prevent unauthorised seeding */
  seedSecret: z.string(),
})

const ProvisionTenantBody = z.object({
  /** Subdomain slug — becomes part of the generated database name */
  slug:      z.string().min(2).max(63).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  /** Human-readable name for the tenant entry in the registry */
  name:      z.string().min(1).max(100),
  /** Display name for the first venue row inserted into the tenant DB */
  venueName: z.string().min(1).max(200).default('Main Venue'),
  plan:      z.enum(['basic', 'professional', 'enterprise']).default('basic'),
  /** IANA timezone string, e.g. "UTC" or "Asia/Kolkata" */
  timezone:  z.string().min(1).max(60).default('UTC'),
  /** ISO 4217 currency code, e.g. "USD" */
  currency:  z.string().min(3).max(3).default('USD'),
  /** ISO 3166-1 alpha-2 country code, e.g. "US" */
  country:   z.string().min(2).max(2).default('US'),
})

// ─── Route handler ────────────────────────────────────────────────────────────

export async function globalAdminRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /auth/login ──────────────────────────────────────────────────────
  fastify.post('/auth/login', async (request, reply) => {
    const body = LoginBody.parse(request.body)

    const reg = getRegistryDb()
    if (!reg) {
      return reply.status(503).send({
        success: false,
        error: { code: 'REGISTRY_UNAVAILABLE', message: 'Registry database not configured' },
      })
    }

    const [admin] = await reg
      .select()
      .from(globalAdmins)
      .where(eq(globalAdmins.email, body.email))
      .limit(1)

    if (!admin || !admin.isActive) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      })
    }

    const valid = await bcrypt.compare(body.password, admin.passwordHash)
    if (!valid) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      })
    }

    const token = fastify.jwt.sign({
      sub:   admin.id,
      email: admin.email,
      name:  admin.name,
      role:  'global_admin',
    })

    return reply.send({
      success: true,
      data: {
        token,
        admin: { id: admin.id, email: admin.email, name: admin.name },
      },
    })
  })

  // ── POST /auth/seed ───────────────────────────────────────────────────────
  // Creates the very first global admin. Protected by a seed secret.
  // Disabled once any admin exists.
  fastify.post('/auth/seed', async (request, reply) => {
    const body = SeedAdminBody.parse(request.body)

    const expectedSecret = process.env['GLOBAL_ADMIN_SEED_SECRET']
    if (!expectedSecret || body.seedSecret !== expectedSecret) {
      return reply.status(HTTP_STATUS.FORBIDDEN).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Invalid seed secret' },
      })
    }

    const reg = getRegistryDb()
    if (!reg) {
      return reply.status(503).send({
        success: false,
        error: { code: 'REGISTRY_UNAVAILABLE', message: 'Registry database not configured' },
      })
    }

    // Only allow seeding when no admins exist yet
    const existing = await reg.select({ id: globalAdmins.id }).from(globalAdmins).limit(1)
    if (existing.length > 0) {
      return reply.status(HTTP_STATUS.CONFLICT).send({
        success: false,
        error: { code: 'ALREADY_SEEDED', message: 'Global admin already exists — use login instead' },
      })
    }

    const passwordHash = await bcrypt.hash(body.password, 12)
    const [created] = await reg
      .insert(globalAdmins)
      .values({ email: body.email, name: body.name, passwordHash })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: { id: created!.id, email: created!.email, name: created!.name },
    })
  })

  // ── GET /tenants ──────────────────────────────────────────────────────────
  fastify.get('/tenants', { preHandler: [requireGlobalAdmin] }, async (request, reply) => {
    const reg = getRegistryDb()
    if (!reg) {
      return reply.status(503).send({
        success: false,
        error: { code: 'REGISTRY_UNAVAILABLE', message: 'Registry database not configured' },
      })
    }

    const rows = await reg
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt))

    // Mask the DB URL so credentials aren't fully exposed in list view
    const data = rows.map((t) => ({ ...t, dbUrl: maskDbUrl(t.dbUrl) }))

    return reply.send({ success: true, data })
  })

  // ── GET /tenants/:id ──────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>(
    '/tenants/:id',
    { preHandler: [requireGlobalAdmin] },
    async (request, reply) => {
      const reg = getRegistryDb()
      if (!reg) return registryUnavailable(reply)

      const [tenant] = await reg
        .select()
        .from(tenants)
        .where(eq(tenants.id, request.params.id))
        .limit(1)

      if (!tenant) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        })
      }

      // Full dbUrl exposed in detail view (global admin only)
      return reply.send({ success: true, data: tenant })
    }
  )

  // ── POST /tenants ─────────────────────────────────────────────────────────
  fastify.post('/tenants', { preHandler: [requireGlobalAdmin] }, async (request, reply) => {
    const body = CreateTenantBody.parse(request.body)

    const reg = getRegistryDb()
    if (!reg) return registryUnavailable(reply)

    // Check slug uniqueness
    const [existing] = await reg
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, body.slug))
      .limit(1)

    if (existing) {
      return reply.status(HTTP_STATUS.CONFLICT).send({
        success: false,
        error: { code: 'SLUG_TAKEN', message: `Slug '${body.slug}' is already in use` },
      })
    }

    const [created] = await reg
      .insert(tenants)
      .values({
        slug:           body.slug,
        name:           body.name,
        dbUrl:          body.dbUrl,
        defaultVenueId: body.defaultVenueId,
        plan:           body.plan,
      })
      .returning()

    return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
  })

  // ── PATCH /tenants/:id ────────────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    '/tenants/:id',
    { preHandler: [requireGlobalAdmin] },
    async (request, reply) => {
      const body = UpdateTenantBody.parse(request.body)

      const reg = getRegistryDb()
      if (!reg) return registryUnavailable(reply)

      const [existing] = await reg
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, request.params.id))
        .limit(1)

      if (!existing) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        })
      }

      const updateData: Partial<Tenant> = { updatedAt: new Date() }
      if (body.name           !== undefined) updateData.name           = body.name
      if (body.dbUrl          !== undefined) updateData.dbUrl          = body.dbUrl
      if (body.defaultVenueId !== undefined) updateData.defaultVenueId = body.defaultVenueId
      if (body.plan           !== undefined) updateData.plan           = body.plan
      if (body.isActive       !== undefined) updateData.isActive       = body.isActive

      const [updated] = await reg
        .update(tenants)
        .set(updateData)
        .where(eq(tenants.id, request.params.id))
        .returning()

      return reply.send({ success: true, data: updated })
    }
  )

  // ── DELETE /tenants/:id ───────────────────────────────────────────────────
  // Soft-delete: sets isActive = false. The tenant row + DB are preserved.
  fastify.delete<{ Params: { id: string } }>(
    '/tenants/:id',
    { preHandler: [requireGlobalAdmin] },
    async (request, reply) => {
      const reg = getRegistryDb()
      if (!reg) return registryUnavailable(reply)

      const [existing] = await reg
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, request.params.id))
        .limit(1)

      if (!existing) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        })
      }

      await reg
        .update(tenants)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(tenants.id, request.params.id))

      return reply.send({ success: true, data: { deactivated: true } })
    }
  )

  // ── POST /tenants/provision ───────────────────────────────────────────────
  // Fully automated tenant onboarding:
  //   1. CREATE DATABASE  venueplus_<slug>  on the configured Postgres server
  //   2. Run DDL migrations (extensions → enums → tables → indexes → functions)
  //   3. INSERT a minimal venue row; capture its UUID as defaultVenueId
  //   4. Register the new tenant in the registry
  //
  // Requires POSTGRES_ADMIN_URL env var (superuser connection) and
  // DATABASE_SCRIPTS_PATH pointing to the root database/ folder.
  //
  // On success returns the same shape as POST /tenants (the tenant registry row).
  fastify.post('/tenants/provision', { preHandler: [requireGlobalAdmin] }, async (request, reply) => {
    const body = ProvisionTenantBody.parse(request.body)

    // Ensure the provisioner is configured
    const adminUrl = process.env['POSTGRES_ADMIN_URL']
    if (!adminUrl) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'PROVISION_NOT_CONFIGURED',
          message:
            'POSTGRES_ADMIN_URL is not set. ' +
            'Automatic provisioning is unavailable — add a database URL manually instead.',
        },
      })
    }

    const reg = getRegistryDb()
    if (!reg) return registryUnavailable(reply)

    // Check slug uniqueness before doing any DB work
    const [existing] = await reg
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, body.slug))
      .limit(1)

    if (existing) {
      return reply.status(HTTP_STATUS.CONFLICT).send({
        success: false,
        error: { code: 'SLUG_TAKEN', message: `Slug '${body.slug}' is already in use` },
      })
    }

    // Derive the new database name from the slug
    const dbName = `venueplus_${body.slug.replace(/-/g, '_')}`

    // Build the tenant DB URL: same server as the admin URL, different database
    let tenantDbUrl: string
    try {
      const parsed = new URL(adminUrl)
      parsed.pathname = `/${dbName}`
      tenantDbUrl = parsed.toString()
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'INVALID_ADMIN_URL', message: 'POSTGRES_ADMIN_URL is not a valid URL' },
      })
    }

    try {
      // Step 1: Create the database
      await createDatabase(adminUrl, dbName)

      // Step 2: Run DDL migrations (schema only, no seed data)
      await runMigrations(tenantDbUrl)

      // Step 3: Insert the default venue row
      const venueId = await createVenue(tenantDbUrl, {
        name:         body.venueName,
        timezone:     body.timezone,
        currencyCode: body.currency.toUpperCase(),
        countryCode:  body.country.toUpperCase(),
      })

      // Step 4: Register the tenant in the registry
      const [created] = await reg
        .insert(tenants)
        .values({
          slug:           body.slug,
          name:           body.name,
          dbUrl:          tenantDbUrl,
          defaultVenueId: venueId,
          plan:           body.plan,
        })
        .returning()

      return reply.status(HTTP_STATUS.CREATED).send({ success: true, data: created })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      fastify.log.error({ err }, 'Tenant provisioning failed')
      return reply.status(500).send({
        success: false,
        error: { code: 'PROVISION_FAILED', message: `Provisioning failed: ${message}` },
      })
    }
  })
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Masks credentials in a postgres:// URL for safe list display */
function maskDbUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.password) u.password = '****'
    return u.toString()
  } catch {
    return url.slice(0, 25) + '...'
  }
}

function registryUnavailable(reply: import('fastify').FastifyReply) {
  return reply.status(503).send({
    success: false,
    error: { code: 'REGISTRY_UNAVAILABLE', message: 'Registry database not configured' },
  })
}
