# VenuePlus

**Multi-channel Venue Management Platform**

A full-stack, production-ready monorepo for managing a family entertainment centre across four channels: online ecommerce, self-service kiosk, POS terminal, and mobile app.

---

## Repository Structure

```
VenuePlus/
├── database/                   PostgreSQL scripts (run in order)
│   ├── 001_extensions/         uuid-ossp, pgcrypto
│   ├── 002_enums/              67 custom ENUM types
│   ├── 003_tables/             90 tables across 18 domain files
│   ├── 004_indexes/            84 performance indexes
│   ├── 005_functions/          8 PL/pgSQL functions + 3 triggers
│   ├── 006_seed_data/          FunZone demo data (8 files)
│   ├── run.sql                 Master orchestrator — run this
│   └── drop.sql                Full teardown / reset
│
├── apps/
│   ├── api/                    Fastify + TypeScript REST API (port 4000)
│   ├── ecommerce/              Next.js 14 customer booking site (port 3000)
│   ├── pos/                    Next.js 14 POS terminal (port 3001)
│   ├── kiosk/                  Next.js 14 self-service kiosk (port 3002)
│   └── mobile/                 React Native (Expo Router)
│
└── packages/
    ├── shared/                 Shared TypeScript types, constants, utilities
    └── database/               Drizzle ORM schema + DB client
```

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Monorepo    | Turborepo + pnpm workspaces                     |
| Database    | PostgreSQL 15+ (pgcrypto, uuid-ossp)            |
| ORM         | Drizzle ORM                                     |
| API         | Fastify 4 + TypeScript + Zod validation         |
| Web apps    | Next.js 14 (App Router) + Tailwind CSS          |
| Mobile      | React Native + Expo (SDK 51) + Expo Router      |
| State mgmt  | Zustand                                         |
| Auth        | JWT (staff PIN login) + OTP (customer mobile)   |

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL 15+ (local or cloud)

### 1. Install dependencies

Run this from the **VenuePlus root folder** (the folder containing `package.json` and `pnpm-workspace.yaml`). pnpm will install all workspaces in one go.

```bash
cd VenuePlus        # the repo root — not any subfolder
pnpm install        # installs all apps and packages at once
```

### 2. Set up environment variables

Each app ships with a `.env.example` file. Copy it to the correct filename for that app, then fill in the values.

```bash
# API — copies to .env
cp apps/api/.env.example apps/api/.env

# Next.js web apps — Next.js reads .env.local (not .env)
cp apps/ecommerce/.env.example apps/ecommerce/.env.local
cp apps/pos/.env.example         apps/pos/.env.local
cp apps/kiosk/.env.example       apps/kiosk/.env.local

# Mobile (Expo) — copies to .env
cp apps/mobile/.env.example apps/mobile/.env
```

**Required environment variables for `apps/api/.env`:**

```env
DATABASE_URL=postgresql://user:password@host:5432/venueplus
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=development
PORT=4000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

**Required for web apps (`.env.local`):**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_VENUE_ID=c0000000-0000-0000-0000-000000000001
```

### 3. Run database scripts

Connect to your PostgreSQL instance and run the master script:

```bash
psql $DATABASE_URL -f database/run.sql
```

This executes all 32 SQL files in order:
1. Extensions (uuid-ossp, pgcrypto)
2. 67 ENUM types
3. 90 tables across all domains
4. 84 performance indexes
5. 8 PL/pgSQL functions + 3 triggers
6. Full FunZone demo seed data

To reset and re-run:

```bash
psql $DATABASE_URL -f database/drop.sql
psql $DATABASE_URL -f database/run.sql
```

### 4. Start all apps

```bash
# Start everything in parallel
pnpm dev

# Or start individually:
pnpm --filter @venueplus/api dev          # API on :4000
pnpm --filter @venueplus/ecommerce dev    # Customer site on :3000
pnpm --filter @venueplus/pos dev          # POS on :3001
pnpm --filter @venueplus/kiosk dev        # Kiosk on :3002
pnpm --filter @venueplus/mobile dev       # Mobile (Expo)
```

---

## Seed Data — FunZone Family Entertainment Centre

The demo database is pre-populated with realistic data:

### Staff Accounts (PIN: `1234` for all)

| Username         | Role          |
|-----------------|---------------|
| superadmin       | Super Admin   |
| venue_admin      | Venue Admin   |
| manager          | Manager       |
| cashier1/2       | Cashier       |
| gate_op1/2       | Gate Operator |
| reporter         | Reporter      |
| kitchen_staff    | Kitchen Staff |
| retail_staff     | Retail Staff  |

### Venue ID

```
c0000000-0000-0000-0000-000000000001
```

Use this as the `x-venue-id` header and `NEXT_PUBLIC_VENUE_ID`.

### Attractions / Resources

| Resource      | Mode             | Capacity |
|---------------|-----------------|----------|
| Jump Arena     | Rolling duration | 50       |
| Laser Tag Room | Slot-based       | 12       |
| Escape Room    | Slot-based       | 6        |
| Arcade Floor   | Open access      | —        |
| Soft Play Zone | Rolling duration | 30       |
| Mini Zoo       | Open access      | —        |
| Water Slides   | Rolling duration | 40       |
| Wave Pool      | Open access      | 100      |

### Sample Customers

10 named accounts + 40 generated (mobile format: `98001XXXXX` for named, `98010NNNNN` for generated).

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

All requests require the `x-venue-id` header.

### Authentication

| Method | Endpoint                | Description               |
|--------|------------------------|---------------------------|
| POST   | `/auth/staff/login`     | Staff PIN login → JWT     |
| POST   | `/auth/otp/request`     | Customer OTP request      |
| POST   | `/auth/otp/verify`      | Customer OTP verify → JWT |
| POST   | `/auth/logout`          | Logout (stateless)        |

### Core

| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/venue`                         | Venue info + settings + flags  |
| GET    | `/products`                      | Products (`?channel=pos`)      |
| GET    | `/availability/slots`            | Slot availability by date      |
| POST   | `/availability/hold`             | Create capacity hold (15 min)  |
| DELETE | `/availability/hold/:id`         | Release hold                   |
| POST   | `/orders`                        | Create order + process payment |
| GET    | `/orders/:id`                    | Order details                  |
| POST   | `/orders/:id/refund`             | Refund order                   |

### Gate

| Method | Endpoint                   | Description                      |
|--------|---------------------------|----------------------------------|
| POST   | `/gate/scan`               | Entry/exit QR scan               |
| GET    | `/gate/headcount/:resId`   | Live headcount for resource      |
| GET    | `/gate/validate/:qrPayload`| Non-destructive QR validation    |

### Customer

| Method | Endpoint                | Description            |
|--------|------------------------|------------------------|
| GET    | `/accounts/me`          | Current account + wallet + membership |
| PUT    | `/accounts/me`          | Update profile         |
| GET    | `/accounts/me/persons`  | Linked persons         |
| POST   | `/accounts/me/persons`  | Add linked person      |
| GET    | `/accounts/me/orders`   | Order history          |

### Commerce

| Method | Endpoint                      | Description               |
|--------|------------------------------|---------------------------|
| GET    | `/memberships/plans`          | Membership plans          |
| GET    | `/memberships/me`             | Current membership        |
| POST   | `/memberships/:id/pause`      | Pause membership          |
| POST   | `/memberships/:id/cancel`     | Cancel membership         |
| GET    | `/wallet/me`                  | Wallet balance            |
| GET    | `/wallet/me/transactions`     | Wallet history            |
| POST   | `/wallet/topup`               | Top up wallet             |
| GET    | `/gift-cards/:code`           | Gift card lookup          |
| GET    | `/fnb/menu`                   | F&B menu by category      |
| GET    | `/fnb/kitchen`                | Kitchen display orders    |
| POST   | `/fnb/kitchen/:id/status`     | Update kitchen order      |
| GET    | `/retail/items`               | Retail items + inventory  |
| GET    | `/retail/items/barcode/:code` | Barcode lookup            |

### CRM & Reporting

| Method | Endpoint                         | Description            |
|--------|----------------------------------|------------------------|
| GET    | `/crm/segments`                  | Customer segments      |
| GET    | `/crm/accounts/:id/timeline`     | Activity timeline      |
| POST   | `/crm/accounts/:id/tags`         | Add customer tag       |
| POST   | `/crm/accounts/:id/notes`        | Add staff note         |
| GET    | `/crm/campaigns`                 | Marketing campaigns    |
| GET    | `/crm/alerts`                    | Alert log              |
| GET    | `/reports/revenue/live`          | Today's live revenue   |
| GET    | `/reports/revenue/daily`         | Daily revenue stats    |
| GET    | `/reports/occupancy/:resourceId` | Hourly occupancy       |
| GET    | `/reports/payments/summary`      | Payment method summary |

---

## App Capabilities

### POS Terminal (`apps/pos` · port 3001)
- Staff PIN login with JWT
- Product browser by tab: Tickets / F&B / Retail / Wallet / Memberships
- Cart with quantity controls
- Payment methods: Cash, UPI, Card, Wallet, Gift Card
- Live revenue display in topbar
- Order confirmation with order number

### Self-Service Kiosk (`apps/kiosk` · port 3002)
- Touch-optimised full-screen UI
- Buy tickets with date selector
- Order food & drinks with category sidebar
- Wallet top-up flow (mobile number → amount → confirm)
- Collect booked ticket by reference number (QR display)
- Auto-return to home after confirmation

### Customer Ecommerce (`apps/ecommerce` · port 3000)
- Public: Home page, Attractions, Plan Your Visit
- Ticket booking with date selection and qty controls
- Membership plans with benefit comparison
- OTP-based login → account profile
- Order confirmation page with booking reference

### Mobile App (`apps/mobile` · Expo)
- 5-tab layout: Explore / Book / Wallet / My Tickets / Account
- Explore: Attraction cards, membership banner
- Book: Product listing + quantity controls + UPI checkout
- Wallet: Balance card, quick top-up, transaction history
- My Tickets: Order list → QR code display
- Account: OTP login → profile → membership card

---

## Database Domain Map

| Domain              | Tables | Key Concepts                                   |
|--------------------|--------|------------------------------------------------|
| Governance          | 11     | Users, roles, permissions, venues, devices     |
| Customer Identity   | 4      | Accounts, persons, OTP log                     |
| Taxation            | 3      | CGST/SGST components, structures               |
| Resources           | 4      | Attractions, slot templates, generated slots   |
| Products            | 5      | Products, prices, reservation config           |
| Orders              | 8      | Immutable financial records, snapshots         |
| Reservations        | 5      | Holds, groups, reservations, usage logs        |
| Pricing Engine      | 7      | Rules, conditions, actions, promo codes        |
| Waivers             | 4      | Templates, product mappings, signatures        |
| Membership          | 6      | Plans, benefits, memberships, allowances       |
| Wallet              | 2      | Wallets, transactions (burn bonus first)       |
| Gift Cards          | 2      | Cards, transactions                            |
| Redemption Cards    | 2      | Visit-based and credit-based                   |
| Donations/Adoptions | 4      | Causes, donations, adoptees, adoptions         |
| F&B                 | 7      | Categories, stations, items, kitchen orders    |
| Retail              | 3      | Items, inventory, transactions                 |
| CRM                 | 9      | Activities, segments, tags, campaigns, alerts  |
| Reporting           | 3      | Daily revenue, hourly occupancy, payment stats |

---

## Key Design Decisions

**Immutable financial records** — Orders and payments are never modified after creation. Refunds are new payment records with negative amounts.

**Snapshot pricing** — `unit_price_snapshot` captures the price at time of purchase; price table changes don't affect existing orders.

**Capacity holds** — 15-minute TTL holds prevent overselling during concurrent checkout. The `expire_stale_holds()` function should be called by a cron job every minute.

**Wallet burn order** — When paying with wallet, `bonus_cash` is consumed before `real_cash`.

**Deferred person assignment** — Reservations can be created before specific visitors are named; persons can be added/assigned after checkout.

**GST tax structure** — CGST + SGST components at 18%, 12%, 5%, and 0% rates. Tax is always calculated on the post-discount price and stored immutably on each order item.

**Shared capacity pool** — All channels draw from the same slot capacity table. Holds are created across all channels before payment is confirmed.

---

## Development Commands

```bash
# Full build
pnpm build

# Type-check all packages
pnpm typecheck

# Lint
pnpm lint

# Generate Drizzle migrations
pnpm --filter @venueplus/database db:generate

# Push schema directly (dev only)
pnpm --filter @venueplus/database db:push

# Open Drizzle Studio
pnpm --filter @venueplus/database db:studio
```

---

## Deployment Notes

- **API**: Deploy as a Node.js service. Set `NODE_ENV=production`. Run behind a reverse proxy (nginx/Caddy) with TLS.
- **Ecommerce**: Deploy to Vercel or any Next.js-compatible host. Enable SSR.
- **POS / Kiosk**: Deploy as static Next.js exports or on a local intranet server for offline resilience.
- **Mobile**: Build with `expo build` or EAS Build. Distribute via App Store / Play Store.
- **Database**: PostgreSQL 15+ on Neon, Supabase, Railway, RDS, or self-hosted. Run `run.sql` once per new venue database.
- **Cron job**: Schedule `SELECT expire_stale_holds();` every 60 seconds to release timed-out capacity holds.

---

*Built with VenuePlus Product Specification v2.0 — FunZone Family Entertainment Centre demo*
