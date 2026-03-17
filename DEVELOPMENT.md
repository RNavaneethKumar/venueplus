# VenuePlus — Local Debugging & Distribution Guide

This document covers running the stack locally for development, debugging inside Docker containers, and building distributable packages for each app.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development (no Docker)](#local-development-no-docker)
3. [Docker — Local Debugging](#docker--local-debugging)
4. [Docker — Building & Publishing Images](#docker--building--publishing-images)
5. [Companion (Electron) — Development](#companion-electron--development)
6. [Companion (Electron) — Distribution](#companion-electron--distribution)
7. [Database Setup](#database-setup)
8. [Environment Variable Reference](#environment-variable-reference)

---

## Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Node.js | 20.x | https://nodejs.org |
| pnpm | 9.x | `corepack enable` |
| Docker Desktop | 24.x | https://www.docker.com/products/docker-desktop |
| PostgreSQL | 15+ | https://www.postgresql.org or use Neon/Render |

> **Companion only:** Building the Electron app on macOS also produces a notarised `.dmg` if you have an Apple Developer account. Windows cross-compilation from macOS requires Wine — build natively on Windows instead.

---

## Local Development (no Docker)

The fastest way to iterate. All apps run on the host with hot-reload.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment files

Each app reads its own `.env` file (or `.env.local` for Next.js apps):

```bash
# API
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL, JWT_SECRET, etc.

# POS
cp apps/pos/.env.local.example apps/pos/.env.local
# Edit NEXT_PUBLIC_API_URL, NEXT_PUBLIC_VENUE_ID

# Kiosk
cp apps/kiosk/.env.local.example apps/kiosk/.env.local

# Ecommerce
cp apps/ecommerce/.env.local.example apps/ecommerce/.env.local
```

Minimum required values:
```bash
# API (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/venueplus
JWT_SECRET=<openssl rand -hex 32>

# Next.js apps (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_VENUE_ID=<venue UUID from the admin UI>
```

### 3. Initialise the database

```bash
# Run the full schema + seed against your local Postgres
psql $DATABASE_URL -f database/run.sql
```

### 4. Start everything

```bash
# All apps in parallel (Turborepo TUI)
pnpm dev

# Or individual apps:
pnpm api:dev        # API only     → http://localhost:4000
pnpm pos:dev        # POS only     → http://localhost:3001
pnpm kiosk:dev      # Kiosk only   → http://localhost:3002
pnpm ecommerce:dev  # Ecommerce    → http://localhost:3000
```

### 5. Typecheck and lint

```bash
pnpm typecheck   # all packages in dependency order
pnpm lint        # ESLint across all Next.js apps
```

---

## Docker — Local Debugging

Use the build compose file to run containers built from your local source code. This is useful for testing production-mode behaviour, validating the Docker builds, or running on a machine without a Node.js toolchain.

### Environment file

```bash
cp .env.docker .env.docker.local
# Edit .env.docker.local — fill in DATABASE_URL, JWT_SECRET, etc.
```

Key values in `.env.docker.local`:

```bash
DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/venueplus
# Use host.docker.internal instead of localhost — containers can't reach
# the host via 127.0.0.1. On Linux use your machine's LAN IP instead.

JWT_SECRET=<openssl rand -hex 32>

# URL the browser uses to reach the API — must be reachable from the
# user's machine, NOT from inside the Docker network.
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Build and start

```bash
# Build images from source + start containers
docker compose -f docker-compose.build.yml --env-file .env.docker.local up --build

# Rebuild only a specific service after code changes
docker compose -f docker-compose.build.yml --env-file .env.docker.local up --build api
docker compose -f docker-compose.build.yml --env-file .env.docker.local up --build pos
```

### Common debugging commands

```bash
# Follow logs for all services
docker compose -f docker-compose.build.yml logs -f

# Follow logs for a single service
docker compose -f docker-compose.build.yml logs -f api
docker compose -f docker-compose.build.yml logs -f pos

# Open a shell inside a running container
docker compose -f docker-compose.build.yml exec api  sh
docker compose -f docker-compose.build.yml exec pos  sh

# Inspect the API health endpoint
curl http://localhost:4000/health

# Check container status and health
docker compose -f docker-compose.build.yml ps

# Stop all services
docker compose -f docker-compose.build.yml down

# Stop and remove volumes (full reset)
docker compose -f docker-compose.build.yml down -v
```

### Rebuilding after code changes

The Dockerfiles are structured for maximum layer caching. Only the layers that change are rebuilt:

- Changing `package.json` or `pnpm-lock.yaml` → reinstalls dependencies (slow, ~60 s)
- Changing source files only → skips the deps layer, recompiles only (fast, ~15 s)
- Changing a single file in `apps/api/src` → only the API builder stage reruns

```bash
# Fast rebuild — no dependency changes
docker compose -f docker-compose.build.yml up --build api
```

### Running the pre-built distribution images locally

To test the exact images from Docker Hub without building:

```bash
# Uses docker-compose.yml (pre-built images, hardcoded Neon DB)
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

---

## Docker — Building & Publishing Images

### Single image build (manual)

```bash
# Build from repo root — context must be the repo root
docker build -f apps/api/Dockerfile -t venueplus-api:local .
docker build -f apps/pos/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1 \
  --build-arg NEXT_PUBLIC_VENUE_ID=<your-venue-uuid> \
  --build-arg NEXT_PUBLIC_TENANT_SLUG=demo \
  -t venueplus-pos:local .
```

> **Note:** `NEXT_PUBLIC_*` variables for the POS are **baked into the JavaScript bundle** at build time. You must pass them as `--build-arg` during `docker build`. Changing them after the image is built requires a rebuild.

### Multi-platform build with Docker Bake

`docker-bake.hcl` builds both images in parallel for `linux/amd64` and `linux/arm64`:

```bash
# Build and push to Docker Hub (requires docker login)
docker buildx bake --push

# Build a specific target only
docker buildx bake api --push
docker buildx bake pos --push

# Override the registry or tag
REGISTRY=myregistry TAG=v1.2.3 docker buildx bake --push

# Build with custom POS variables
NEXT_PUBLIC_API_URL=https://api.yourvenue.io \
NEXT_PUBLIC_VENUE_ID=<uuid> \
NEXT_PUBLIC_TENANT_SLUG=yourvenue \
docker buildx bake --push
```

### Image sizes (approximate)

| Image | Compressed size | Base |
|-------|----------------|------|
| `venueplus-api` | ~180 MB | Node 20 Alpine |
| `venueplus-pos` | ~130 MB | Node 20 Alpine |

---

## Companion (Electron) — Development

The Companion app is a standalone Electron application located in `apps/companion/`. It uses `npm` independently (not managed by the pnpm workspace).

### First-time setup

```bash
cd apps/companion
npm install
```

### Run in development mode

```bash
npm run dev
```

This compiles TypeScript once, then starts two concurrent processes:
- `tsc --watch` — recompiles TypeScript on every file save
- `electron .` — runs the Electron process pointing at `dist/main.js`

> **Hot reload:** Electron does not automatically restart when TypeScript recompiles. After saving a source file, wait for `tsc` to finish (you'll see no errors in the terminal), then quit and relaunch via `npm run dev`, or use the app's tray menu → Quit and re-run the command.

### Open DevTools

From the Electron app tray menu, there is no built-in DevTools shortcut. To open the Chromium DevTools for the settings window, add a temporary keyboard shortcut in `src/main.ts`:

```typescript
// Add inside createSettingsWindow() for debugging
settingsWindow.webContents.openDevTools({ mode: 'detach' })
```

Or open DevTools from within the settings window HTML page via:
```javascript
// In the browser console (if nodeIntegration is enabled):
require('electron').ipcRenderer.invoke('open-devtools')
```

### Inspect the Express server

The Companion runs a local Express server (default port `49152`) that handles print jobs and peripheral commands from the POS. To inspect it directly:

```bash
# Check what the companion server is listening on
curl http://localhost:49152/health

# Send a test print job
curl -X POST http://localhost:49152/print/receipt \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test"}'
```

### Logs and persistent store

- **Print log:** Stored in Electron's userData directory. View from the Settings window → Print Log tab, or clear via the UI.
- **Settings store:** Uses `electron-store` — stored at:
  - macOS: `~/Library/Application Support/VenuePlus Companion/config.json`
  - Windows: `%APPDATA%\VenuePlus Companion\config.json`
  - Linux: `~/.config/VenuePlus Companion/config.json`

```bash
# View the live settings file (macOS example)
cat ~/Library/Application\ Support/VenuePlus\ Companion/config.json
```

---

## Companion (Electron) — Distribution

### Build TypeScript first

All package commands compile TypeScript automatically, but you can also build manually:

```bash
cd apps/companion
npm run build          # compiles src/ → dist/
```

### Package for the current platform

```bash
npm run package        # detects current OS automatically
```

Output is placed in `apps/companion/release/`:
- **macOS** → `release/VenuePlus Companion-x.y.z.dmg`
- **Windows** → `release/VenuePlus Companion Setup x.y.z.exe`
- **Linux** → `release/VenuePlus Companion-x.y.z.AppImage`

### Package for a specific platform

```bash
npm run package:mac     # → DMG (macOS only)
npm run package:win     # → NSIS installer (Windows or with Wine on macOS)
npm run package:linux   # → AppImage
```

### Installer behaviour

| Platform | Format | Behaviour |
|----------|--------|-----------|
| Windows | NSIS | One-click silent install, runs app after finish |
| macOS | DMG | Drag-to-Applications, macOS Gatekeeper check on first launch |
| Linux | AppImage | Single portable executable, no install required |

### macOS Gatekeeper (unsigned build)

If you haven't set up Apple Developer code signing, macOS will block the DMG with "App can't be opened because it's from an unidentified developer." Users can bypass this once:

```
System Settings → Privacy & Security → scroll down → "Open Anyway"
```

To sign and notarise for distribution, add to `package.json` under `"build"`:

```json
"mac": {
  "target": "dmg",
  "icon": "assets/icon.icns",
  "category": "public.app-category.utilities",
  "identity": "Developer ID Application: Your Name (TEAMID)",
  "notarize": {
    "teamId": "TEAMID"
  }
}
```

Then set environment variables before packaging:

```bash
export APPLE_ID=your@apple.id
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=YOURTEAMID
npm run package:mac
```

### Windows code signing

Add to `package.json` under `"win"`:

```json
"win": {
  "target": "nsis",
  "icon": "assets/icon.ico",
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "${env.WIN_CERT_PASSWORD}"
}
```

### Version bumping

The installer version is read from `apps/companion/package.json` → `"version"`. Update it before packaging:

```bash
cd apps/companion
npm version patch   # e.g. 1.0.0 → 1.0.1
npm version minor   # e.g. 1.0.1 → 1.1.0
```

---

## Database Setup

### Fresh setup (schema + seed data)

```bash
# Full setup: extensions, enums, tables, indexes, functions, seed data
psql $DATABASE_URL -f database/run.sql

# Drop everything and start over
psql $DATABASE_URL -f database/drop.sql
psql $DATABASE_URL -f database/run.sql
```

### Apply a migration to an existing database

```bash
# Example: apply the promo_codes column migration
psql $DATABASE_URL -f database/007_migrations/002_promo_codes_add_columns.sql
```

### Drizzle ORM commands

Run from the repo root (or `packages/database/`):

```bash
pnpm db:generate   # generate SQL migrations from schema changes
pnpm db:migrate    # apply pending migrations
pnpm db:studio     # open Drizzle Studio browser UI at localhost:4983
```

---

## Environment Variable Reference

### API

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string for the main DB |
| `REGISTRY_DATABASE_URL` | Multi-tenant only | Maps tenant slugs to per-tenant DBs |
| `POSTGRES_ADMIN_URL` | Provisioning only | Superuser URL with `CREATEDB` privilege |
| `JWT_SECRET` | ✅ | ≥32-char random string — `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | No (default: `7d`) | Token lifespan, e.g. `1h`, `7d`, `30d` |
| `GLOBAL_ADMIN_SEED_SECRET` | First run only | One-time secret to create the first admin account |
| `CORS_ORIGINS` | No (default: `http://localhost:3001`) | Comma-separated allowed frontend origins |
| `CORS_BASE_DOMAIN` | Production | Base domain for `*.yourdomain.com` wildcard CORS |
| `SMS_PROVIDER` | No (default: `console`) | `console` logs to stdout; use `twilio` in production |
| `EMAIL_PROVIDER` | No (default: `console`) | `console` logs to stdout; use `sendgrid` in production |
| `FROM_EMAIL` | No | Sender address for transactional emails |
| `LOG_LEVEL` | No (default: `info`) | `trace`, `debug`, `info`, `warn`, `error` |
| `PORT` | No (default: `4000`) | HTTP port the API listens on |

### POS / Kiosk / Ecommerce (Next.js)

| Variable | When set | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Build time | API base URL visible from the browser |
| `NEXT_PUBLIC_VENUE_ID` | Build time | UUID of the venue this terminal belongs to |
| `NEXT_PUBLIC_TENANT_SLUG` | Build time | Fallback tenant slug for plain `localhost` access |
| `TENANT_SLUG` | Runtime | Overrides tenant resolution without rebuilding (Docker only) |
| `DEVICE_LICENSE_KEY` | Runtime (optional) | Auto-activates the POS device on first load |

> **Build-time vs runtime:** `NEXT_PUBLIC_*` variables are inlined into the JavaScript bundle during `next build`. They cannot be changed after the image is built. Variables without the prefix (`TENANT_SLUG`, `DEVICE_LICENSE_KEY`) are read at server startup and can be changed via Docker environment without rebuilding.
