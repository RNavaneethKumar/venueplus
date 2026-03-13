// ============================================================================
// @venueplus/database — Central Tenant Registry
//
// This module manages the "registry" database — a small, shared DB that maps
// tenant slugs (subdomains) to their per-tenant database connection strings.
// It also holds the global_admins table for the super-admin portal.
//
// Usage:
//   import { getRegistryDb, tenants } from '@venueplus/database'
//   const reg = getRegistryDb()
//   if (reg) {
//     const [tenant] = await reg.select().from(tenants).where(eq(tenants.slug, 'greenpark'))
//   }
// ============================================================================

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { eq } from 'drizzle-orm'

// ── Tenants table ─────────────────────────────────────────────────────────────
// Lives in the registry DB (REGISTRY_DATABASE_URL).
// Each row represents one customer (tenant).

export const tenants = pgTable('tenants', {
  id:             uuid('id').primaryKey().defaultRandom(),

  /** URL-safe identifier — becomes the subdomain: greenpark.venueplus.io */
  slug:           text('slug').notNull().unique(),

  /** Human-readable display name shown on the login page */
  name:           text('name').notNull(),

  /** Full postgres:// connection string for this tenant's private database */
  dbUrl:          text('db_url').notNull(),

  /**
   * The UUID of the primary venue row inside this tenant's database.
   * Used to scope role lookups on login without querying the DB first.
   */
  defaultVenueId: uuid('default_venue_id').notNull(),

  plan:           text('plan').notNull().default('basic'),
  isActive:       boolean('is_active').notNull().default(true),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tenant = typeof tenants.$inferSelect

// ── Global Admins table ────────────────────────────────────────────────────────
// Super-admins who can provision / manage tenants via the global admin portal.
// Completely separate from per-tenant staff users.

export const globalAdmins = pgTable('global_admins', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type GlobalAdmin = typeof globalAdmins.$inferSelect

// ── Registry DB singleton ─────────────────────────────────────────────────────

const registrySchema = { tenants, globalAdmins }
type RegistryDb = ReturnType<typeof drizzle<typeof registrySchema>>

let _registryDb: RegistryDb | null = null

/**
 * Returns the registry Drizzle instance, or null when REGISTRY_DATABASE_URL
 * is not configured (single-tenant / local development mode).
 */
export function getRegistryDb(): RegistryDb | null {
  const url = process.env['REGISTRY_DATABASE_URL']
  if (!url) return null

  if (!_registryDb) {
    const sql = postgres(url, {
      max: 5,
      idle_timeout: 30,
      connect_timeout: 10,
    })
    _registryDb = drizzle(sql, { schema: registrySchema })
  }

  return _registryDb
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Look up a tenant by slug. Returns null if not found or inactive.
 * Exported as a convenience so middleware doesn't need to import drizzle operators.
 */
export async function findTenantBySlug(slug: string): Promise<Tenant | null> {
  const reg = getRegistryDb()
  if (!reg) return null

  const [tenant] = await reg
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1)

  return tenant?.isActive ? tenant : null
}
