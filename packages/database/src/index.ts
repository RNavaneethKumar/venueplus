// ============================================================================
// @venueplus/database — Public API
// ============================================================================

export * from './client/index.js'
export * from './schema/index.js'

// ─── Multi-tenancy
export * from './registry.js'
export * from './tenantDb.js'

// ─── Re-export Drizzle query operators so consumers don't need to import
// drizzle-orm directly (keeps a single database package as the entry point).
export {
  eq,
  ne,
  and,
  or,
  not,
  gt,
  gte,
  lt,
  lte,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  like,
  ilike,
  sql,
  asc,
  desc,
  count,
  sum,
  avg,
  max,
  min,
} from 'drizzle-orm'
