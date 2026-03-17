# =============================================================================
# VenuePlus API — Dockerfile
#
# Build context: repo root  (docker build -f apps/api/Dockerfile .)
#
# Stages:
#   deps    — install all workspace dependencies (cached layer)
#   builder — compile TypeScript + produce pnpm deploy bundle
#   runner  — lean production image (~180 MB)
# =============================================================================

# ── Base: Node 20 + pnpm ──────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate


# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests only — maximises Docker layer cache.
# A rebuild is only triggered when these files change.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json   ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json          ./apps/api/

RUN pnpm install --frozen-lockfile


# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copy source files
COPY tsconfig.base.json         ./
COPY packages/shared            ./packages/shared
COPY packages/database          ./packages/database
COPY apps/api                   ./apps/api

# Copy database SQL scripts (needed at runtime for tenant provisioning)
COPY database                   ./database

# Build dependency packages first, then the API
RUN pnpm --filter @venueplus/shared   build \
 && pnpm --filter @venueplus/database build \
 && pnpm --filter @venueplus/api      build

# Produce a self-contained production bundle.
# pnpm deploy resolves all workspace dependencies and copies their built
# dist/ directories into /deploy/node_modules/@venueplus/* — no symlinks.
RUN pnpm deploy --legacy --filter=@venueplus/api --prod /deploy


# ── Stage 3: production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Self-contained app bundle (dist/ + node_modules/ with workspace deps resolved)
COPY --from=builder /deploy ./

# Database SQL scripts for on-demand tenant provisioning via the admin UI
COPY --from=builder /app/database ./database

EXPOSE 4000

# Run the compiled entry point directly — no tsx, no .env file required.
# All configuration is supplied via environment variables (see docker-compose).
CMD ["node", "dist/server.js"]
