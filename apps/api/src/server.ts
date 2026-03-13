import Fastify from 'fastify'
import corsPlugin from '@fastify/cors'
import helmetPlugin from '@fastify/helmet'
import jwtPlugin from '@fastify/jwt'
import rateLimitPlugin from '@fastify/rate-limit'
import swaggerPlugin from '@fastify/swagger'
import swaggerUiPlugin from '@fastify/swagger-ui'

import { authRoutes } from './modules/auth/routes.js'
import { venueRoutes } from './modules/venue/routes.js'
import { productRoutes } from './modules/product/routes.js'
import { availabilityRoutes } from './modules/availability/routes.js'
import { orderRoutes } from './modules/order/routes.js'
import { gateRoutes } from './modules/gate/routes.js'
import { membershipRoutes } from './modules/membership/routes.js'
import { walletRoutes } from './modules/wallet/routes.js'
import { giftCardRoutes } from './modules/giftcard/routes.js'
import { fnbRoutes } from './modules/fnb/routes.js'
import { retailRoutes } from './modules/retail/routes.js'
import { crmRoutes } from './modules/crm/routes.js'
import { reportRoutes } from './modules/report/routes.js'
import { accountRoutes } from './modules/account/routes.js'
import { tillRoutes } from './modules/till/routes.js'
import { adminRoutes } from './modules/admin/routes.js'
import { globalAdminRoutes } from './modules/global-admin/routes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { resolveTenant } from './middleware/tenant.js'
import { env } from './config/env.js'

// ─── Bootstrap ─────────────────────────────────────────────────────────────────

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === 'development' && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, singleLine: true },
      },
    }),
  },
  trustProxy: true,
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: 'array',
      useDefaults: true,
    },
  },
})

// ─── Plugins ──────────────────────────────────────────────────────────────────

await app.register(helmetPlugin, {
  global: true,
  // Swagger UI uses inline scripts/styles — CSP must be relaxed in non-production
  contentSecurityPolicy: env.NODE_ENV === 'production',
})

await app.register(corsPlugin, {
  credentials: true,
  origin: (origin, callback) => {
    // No Origin header — same-origin request or non-browser client (curl, etc.)
    if (!origin) return callback(null, true)

    // Explicit allowlist from env (used in all environments)
    const allowlist = env.CORS_ORIGINS.split(',').map((o) => o.trim())
    if (allowlist.includes(origin)) return callback(null, true)

    // In development also allow any *.localhost origin so tenant subdomains
    // (e.g. navaneeth.localhost:3001) work without listing every slug explicitly.
    if (env.NODE_ENV !== 'production') {
      try {
        const { hostname } = new URL(origin)
        if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
          return callback(null, true)
        }
      } catch {
        // Malformed origin — fall through to reject
      }
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`), false)
  },
})

await app.register(rateLimitPlugin, {
  max: 300,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers['x-venue-id'] as string ?? req.ip,
})

await app.register(jwtPlugin, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: env.JWT_EXPIRES_IN },
})

// OpenAPI docs (dev only)
if (env.NODE_ENV !== 'production') {
  await app.register(swaggerPlugin, {
    openapi: {
      info: { title: 'VenuePlus API', version: '1.0.0', description: 'Multi-channel venue API' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  await app.register(swaggerUiPlugin, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  })
}

// ─── Error handler ────────────────────────────────────────────────────────────

app.setErrorHandler(errorHandler)

// ─── Tenant resolution (multi-tenant mode) ────────────────────────────────────
// Runs on every request. In single-tenant mode (no REGISTRY_DATABASE_URL) this
// is a no-op. In multi-tenant mode it resolves x-tenant-slug → per-tenant DB.

app.addHook('onRequest', resolveTenant)

// ─── Routes ───────────────────────────────────────────────────────────────────

const API = '/api/v1'

await app.register(authRoutes,         { prefix: `${API}/auth` })
await app.register(accountRoutes,      { prefix: `${API}/accounts` })
await app.register(venueRoutes,        { prefix: `${API}/venue` })
await app.register(productRoutes,      { prefix: `${API}/products` })
await app.register(availabilityRoutes, { prefix: `${API}/availability` })
await app.register(orderRoutes,        { prefix: `${API}/orders` })
await app.register(gateRoutes,         { prefix: `${API}/gate` })
await app.register(membershipRoutes,   { prefix: `${API}/memberships` })
await app.register(walletRoutes,       { prefix: `${API}/wallet` })
await app.register(giftCardRoutes,     { prefix: `${API}/gift-cards` })
await app.register(fnbRoutes,          { prefix: `${API}/fnb` })
await app.register(retailRoutes,       { prefix: `${API}/retail` })
await app.register(crmRoutes,          { prefix: `${API}/crm` })
await app.register(reportRoutes,       { prefix: `${API}/reports` })
await app.register(tillRoutes,         { prefix: `${API}/till` })
await app.register(adminRoutes,        { prefix: `${API}/admin` })
await app.register(globalAdminRoutes,  { prefix: `${API}/global-admin` })

// Health check
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

// ─── Start ────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`VenuePlus API running on port ${env.PORT}`)
    if (env.NODE_ENV !== 'production') {
      app.log.info(`Swagger UI: http://localhost:${env.PORT}/docs`)
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
