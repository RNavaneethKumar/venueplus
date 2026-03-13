# =============================================================================
# VenuePlus POS — Dockerfile
#
# Build context: repo root  (docker build -f apps/pos/Dockerfile .)
#
# NEXT_PUBLIC_* variables are baked into the JS bundle at build time.
# Pass them as --build-arg flags or via docker-compose build.args.
#
# Stages:
#   deps    — install all workspace dependencies (cached layer)
#   builder — compile shared package + Next.js standalone bundle
#   runner  — lean production image (~130 MB) using Next.js standalone server
# =============================================================================

# ── Base: Node 20 + pnpm ──────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate


# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests only — maximises Docker layer cache.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/pos/package.json        ./apps/pos/

RUN pnpm install --frozen-lockfile


# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# NEXT_PUBLIC_* vars must be provided at build time — they are inlined into
# the static JS bundle by the Next.js compiler and cannot be changed at runtime.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_VENUE_ID=
ARG NEXT_PUBLIC_TENANT_SLUG=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_VENUE_ID=$NEXT_PUBLIC_VENUE_ID
ENV NEXT_PUBLIC_TENANT_SLUG=$NEXT_PUBLIC_TENANT_SLUG

# Copy source files
COPY tsconfig.base.json ./
COPY packages/shared    ./packages/shared
COPY apps/pos           ./apps/pos

# Build shared package first (transpilePackages bundles it into Next.js output,
# but the types are required for the Next.js TypeScript compilation pass)
RUN pnpm --filter @venueplus/shared build \
 && pnpm --filter @venueplus/pos    build


# ── Stage 3: production runtime ──────────────────────────────────────────────
# Next.js standalone output (output: 'standalone' in next.config.js) produces
# a self-contained server at .next/standalone/apps/pos/server.js that replaces
# `next start`. It includes all required node_modules — no separate install step.

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# PORT and HOSTNAME are read by the Next.js standalone server
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Run as non-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# The standalone directory mirrors the monorepo structure:
#   apps/pos/.next/standalone/
#     apps/pos/server.js   ← entry point
#     node_modules/        ← all runtime npm deps
#
# Static assets and public files are NOT included in standalone — copy separately.
COPY --from=builder --chown=nextjs:nodejs /app/apps/pos/.next/standalone         ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/pos/.next/static             ./apps/pos/.next/static
# apps/pos has no public/ directory currently; uncomment if one is added:
# COPY --from=builder --chown=nextjs:nodejs /app/apps/pos/public                 ./apps/pos/public

USER nextjs

EXPOSE 3001

# The standalone server.js lives at apps/pos/server.js relative to the
# standalone root (which is now /app in this image).
CMD ["node", "apps/pos/server.js"]
