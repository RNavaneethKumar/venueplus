// ============================================================================
// Tenant Provisioner
//
// Handles the three steps required to bring a brand-new tenant database online:
//
//   1. createDatabase  — CREATE DATABASE on the Postgres server
//   2. runMigrations   — Execute all DDL SQL files from the database/ folder
//                        (extensions → enums → tables → indexes → functions).
//                        Seed data is intentionally skipped; each tenant starts
//                        with an empty dataset.
//   3. createVenue     — INSERT a minimal venue row and return its UUID
//
// These steps are orchestrated by the POST /tenants/provision endpoint.
//
// Configuration:
//   POSTGRES_ADMIN_URL    — superuser connection string used to CREATE DATABASE
//   DATABASE_SCRIPTS_PATH — path to the repo's `database/` folder
//                           (defaults to ../../database relative to process.cwd())
// ============================================================================

import path from 'path'
import { readFileSync } from 'fs'
import postgres, { type TransactionSql } from 'postgres'
import { env } from '../../config/env.js'

// ── SQL preprocessor ──────────────────────────────────────────────────────────
// Strips psql client-side directives that are not valid SQL and cannot be sent
// through a libpq connection.  Specifically:
//   \echo  — prints a message in psql, no-op in our runner
//   \set   — client-side variable, only used in seed data (which we skip)
//   BEGIN; / COMMIT; — we wrap the whole migration in our own transaction
//
function stripPsqlMeta(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => {
      const trimmed = line.trimStart()
      if (trimmed.startsWith('\\echo'))  return false
      if (trimmed.startsWith('\\set'))   return false
      if (trimmed.startsWith('\\cd'))    return false
      if (trimmed.startsWith('\\ir'))    return false
      if (trimmed === 'BEGIN;')          return false
      if (trimmed === 'COMMIT;')         return false
      return true
    })
    .join('\n')
}

// ── Resolve the database/ scripts folder ─────────────────────────────────────
function resolveScriptsDir(): string {
  if (env.DATABASE_SCRIPTS_PATH) {
    return path.isAbsolute(env.DATABASE_SCRIPTS_PATH)
      ? env.DATABASE_SCRIPTS_PATH
      : path.resolve(process.cwd(), env.DATABASE_SCRIPTS_PATH)
  }
  // Default: go up two directories from apps/api/ to reach the repo root,
  // then descend into database/.  Assumes `pnpm dev` is launched from apps/api/.
  return path.resolve(process.cwd(), '../../database')
}

// ── Load and concatenate all DDL SQL files ───────────────────────────────────
// Reads run.sql to discover file order, inlines each referenced file, and
// returns the combined DDL as a single SQL string ready to execute.
export function loadDdlSql(): string {
  const scriptsDir = resolveScriptsDir()
  const runSqlPath = path.join(scriptsDir, 'run.sql')

  let runContent: string
  try {
    runContent = readFileSync(runSqlPath, 'utf-8')
  } catch {
    throw new Error(
      `Cannot read ${runSqlPath}. ` +
      `Set DATABASE_SCRIPTS_PATH in env to the absolute path of the database/ folder.`
    )
  }

  const parts: string[] = []
  for (const rawLine of runContent.split('\n')) {
    const match = rawLine.trim().match(/^\\i\s+(.+)$/)
    if (!match) continue

    const relativePath = match[1]!.trim()

    // Skip seed data — every tenant starts with an empty dataset.
    // The global admin creates a minimal venue record via createVenue() instead.
    if (relativePath.startsWith('006_seed_data')) continue

    const fullPath = path.join(scriptsDir, relativePath)
    let content: string
    try {
      content = readFileSync(fullPath, 'utf-8')
    } catch {
      throw new Error(`SQL file not found: ${fullPath}`)
    }

    parts.push(`-- ── ${relativePath} ─────────────────────────────`)
    parts.push(stripPsqlMeta(content))
  }

  if (parts.length === 0) {
    throw new Error(
      `No SQL files found via ${runSqlPath}. ` +
      `Verify DATABASE_SCRIPTS_PATH points to the correct directory.`
    )
  }

  return parts.join('\n\n')
}

// ── Step 1 — Create the Postgres database ────────────────────────────────────
// Connects using the superuser URL (POSTGRES_ADMIN_URL) and issues
// CREATE DATABASE.  This cannot run inside a transaction, which is fine since
// postgres.js defaults to autocommit for raw queries.
export async function createDatabase(adminUrl: string, dbName: string): Promise<void> {
  // Connect to the admin database (usually 'postgres') to issue CREATE DATABASE
  const sql = postgres(adminUrl, { max: 1, onnotice: () => undefined })
  try {
    // Identifiers must not be parameterised — use sql() helper for safe quoting
    await sql.unsafe(`CREATE DATABASE "${dbName}"`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

// ── Step 2 — Run DDL migrations ──────────────────────────────────────────────
// Applies the full schema (extensions → enums → tables → indexes → functions)
// to the freshly created database, wrapped in a single transaction so any
// failure rolls back cleanly.
export async function runMigrations(dbUrl: string): Promise<void> {
  const ddl = loadDdlSql()
  const sql = postgres(dbUrl, { max: 1, onnotice: () => undefined })
  try {
    // sql.begin wraps the callback in BEGIN / COMMIT automatically
    await sql.begin((tx: TransactionSql) => [tx.unsafe(ddl)])
  } finally {
    await sql.end({ timeout: 5 })
  }
}

// ── Step 3 — Create the default venue ────────────────────────────────────────
// Inserts a minimal venue row into the newly migrated database and returns
// the generated UUID.  This UUID becomes defaultVenueId in the registry tenant
// record, allowing the API to route requests to the correct venue by default.
export interface VenueParams {
  name:         string   // Display name, e.g. "Green Park Arena"
  timezone:     string   // IANA timezone, e.g. "UTC" or "Asia/Kolkata"
  currencyCode: string   // ISO 4217, e.g. "USD"
  countryCode:  string   // ISO 3166-1 alpha-2, e.g. "US"
}

export async function createVenue(dbUrl: string, params: VenueParams): Promise<string> {
  const sql = postgres(dbUrl, { max: 1, onnotice: () => undefined })
  try {
    const rows = await sql<{ id: string }[]>`
      INSERT INTO venues (name, timezone, currency_code, country_code, status)
      VALUES (
        ${params.name},
        ${params.timezone},
        ${params.currencyCode},
        ${params.countryCode},
        'active'
      )
      RETURNING id
    `
    const id = rows[0]?.id
    if (!id) throw new Error('INSERT INTO venues returned no id')
    return id
  } finally {
    await sql.end({ timeout: 5 })
  }
}
