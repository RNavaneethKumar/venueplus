// ============================================================================
// @venueplus/database — Per-Tenant DB Connection Pool
//
// Maintains a process-level cache of Drizzle clients, one per unique database
// URL.  Re-uses existing connections so we don't open a new pool on every
// request (which would exhaust Postgres connection limits).
//
// Usage:
//   import { getTenantDb } from '@venueplus/database'
//   const db = getTenantDb(tenant.dbUrl)
//   const orders = await db.select().from(orders).where(...)
// ============================================================================

import { createDbConnection } from './client/index.js'

// ── Connection cache ──────────────────────────────────────────────────────────
// Keyed by the raw database URL string.
// Each entry is a fully-initialised Drizzle + postgres.js connection pool.

type TenantDb = ReturnType<typeof createDbConnection>['db']

const _pool = new Map<string, TenantDb>()

/**
 * Returns a cached Drizzle instance for the given database URL.
 * Creates a new connection pool on first access, then reuses it.
 *
 * @param dbUrl  Full postgres:// connection string for the tenant's database
 */
export function getTenantDb(dbUrl: string): TenantDb {
  if (!_pool.has(dbUrl)) {
    const { db } = createDbConnection(dbUrl)
    _pool.set(dbUrl, db)
  }
  return _pool.get(dbUrl)!
}

/**
 * Returns the number of active tenant DB connections (useful for monitoring).
 */
export function getTenantDbPoolSize(): number {
  return _pool.size
}
