import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  /** Optional: registry DB for multi-tenant mode. When absent, runs single-tenant. */
  REGISTRY_DATABASE_URL: z.string().optional(),
  /** One-time secret used to seed the first global admin via POST /global-admin/auth/seed */
  GLOBAL_ADMIN_SEED_SECRET: z.string().optional(),
  /**
   * Superuser Postgres URL used to CREATE DATABASE when provisioning a new tenant.
   * Must point to a user with CREATEDB privilege (e.g. the postgres superuser).
   * Example: postgres://postgres:password@localhost:5432/postgres
   * When absent, automatic provisioning is disabled and admins must supply DB URLs manually.
   */
  POSTGRES_ADMIN_URL: z.string().optional(),
  /**
   * Absolute (or process-cwd-relative) path to the root `database/` folder.
   * The provisioner reads run.sql from this directory and inlines referenced SQL files.
   * Defaults to  ../../database  (relative to process.cwd(), which is apps/api/ in dev).
   */
  DATABASE_SCRIPTS_PATH: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001,http://localhost:3002'),
  /**
   * Base domain for multi-tenant subdomain CORS.
   * Any origin whose hostname is exactly this domain, or is a subdomain of it,
   * will be allowed. Example: "venueplus.io" → allows https://greenpark.venueplus.io
   * Leave unset for single-tenant / localhost-only deployments.
   */
  CORS_BASE_DOMAIN: z.string().optional(),
  // OTP
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
  // SMS provider (stub)
  SMS_PROVIDER: z.enum(['console', 'twilio', 'msg91']).default('console'),
  SMS_API_KEY: z.string().optional(),
  // Email provider (stub)
  EMAIL_PROVIDER: z.enum(['console', 'sendgrid', 'ses']).default('console'),
  EMAIL_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().default('noreply@venueplus.io'),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌  Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env: Env = parsed.data
