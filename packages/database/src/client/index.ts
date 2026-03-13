import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../schema/index.js'

// ─── Connection ────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env['DATABASE_URL']

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Shared connection pool — single instance per process
const queryClient = postgres(DATABASE_URL, {
  max: process.env['NODE_ENV'] === 'test' ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(queryClient, {
  schema,
  logger: process.env['NODE_ENV'] === 'development',
})

// ─── Type exports ──────────────────────────────────────────────────────────────

export type DB = typeof db

// ─── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Creates a standalone db connection (useful for scripts/migrations).
 * Caller is responsible for closing via sql.end().
 */
export function createDbConnection(url: string) {
  const sql = postgres(url, { max: 1 })
  return {
    db: drizzle(sql, { schema }),
    sql,
  }
}
