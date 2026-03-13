-- ============================================================================
-- Migration: 0001_till_management
-- Adds cash_drawers, cash_sessions, and cash_movements tables for
-- the Till Management feature.
--
-- No existing tables are modified. All new feature-flag / venue-setting keys
-- (pos.require_till, pos.till_mode, pos.variance_threshold, etc.) are data
-- rows in the existing venue_feature_flags / venue_settings tables and
-- require no DDL changes.
-- ============================================================================

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "cash_session_status" AS ENUM (
  'open',
  'closed',       -- normal or blind close; cash count provided
  'blind_closed', -- blind close procedure used (recorded for audit)
  'forced',       -- manager force-closed; no cash count
  'auto'          -- system auto-closed at midnight
);

CREATE TYPE "cash_close_type" AS ENUM (
  'normal',
  'blind',
  'forced',
  'auto'
);

CREATE TYPE "cash_movement_type" AS ENUM (
  'drop',     -- cash removed to safe; reduces expected cash
  'paid_in',  -- cash added (e.g. petty cash reimbursement); increases expected cash
  'paid_out'  -- cash removed for an expense; reduces expected cash
);

-- ── cash_drawers ─────────────────────────────────────────────────────────────
-- Named physical or logical tills.
-- Used when pos.till_mode = 'counter' (the default).
-- In user mode, sessions reference the cashier directly; drawer_id is NULL.

CREATE TABLE "cash_drawers" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "venue_id"    UUID NOT NULL REFERENCES "venues"("id"),
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_by"  UUID REFERENCES "users"("id")
);

-- ── cash_sessions ─────────────────────────────────────────────────────────────
-- One row per open-to-close cycle.
--
-- Uniqueness rules (partial indexes):
--   Counter mode: only one open session per drawer.
--   User mode:    only one open session per user.
-- Both are enforced at the application layer; the indexes make them fast.
--
-- expected_amount is ALWAYS computed server-side at close time.
-- It is never accepted from the client.

CREATE TABLE "cash_sessions" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "venue_id"    UUID NOT NULL REFERENCES "venues"("id"),

  -- NULL when pos.till_mode = 'user'
  "drawer_id"   UUID REFERENCES "cash_drawers"("id"),

  "opened_by"   UUID NOT NULL REFERENCES "users"("id"),
  "closed_by"   UUID          REFERENCES "users"("id"),  -- NULL for auto / forced

  "status"      cash_session_status NOT NULL DEFAULT 'open',
  "open_time"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "close_time"  TIMESTAMPTZ,

  -- Float recorded at open
  "opening_amount"         NUMERIC(12, 2) NOT NULL,
  "opening_denominations"  JSONB,   -- e.g. {"500": 3, "100": 5, "50": 2}

  -- Cash count entered by cashier at close
  "actual_amount"          NUMERIC(12, 2),
  "actual_denominations"   JSONB,

  -- Server-computed at close; never trusted from client
  "expected_amount"        NUMERIC(12, 2),

  -- actual_amount - expected_amount (positive = overage, negative = shortage)
  "variance"               NUMERIC(12, 2),

  "close_type"             cash_close_type,

  -- Manager approval when variance is present
  "variance_approved_by"  UUID        REFERENCES "users"("id"),
  "variance_approved_at"  TIMESTAMPTZ,
  "variance_note"         TEXT,

  -- Immutable Z-Report JSON snapshot; written once at close, never mutated
  "z_report_data"  JSONB,

  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce at most one open session per drawer (counter mode)
CREATE UNIQUE INDEX "cash_sessions_drawer_open_unique"
  ON "cash_sessions" ("drawer_id")
  WHERE "status" = 'open' AND "drawer_id" IS NOT NULL;

-- Enforce at most one open session per user (user mode)
CREATE UNIQUE INDEX "cash_sessions_user_open_unique"
  ON "cash_sessions" ("opened_by")
  WHERE "status" = 'open' AND "drawer_id" IS NULL;

-- Fast lookups: sessions by venue + date range
CREATE INDEX "cash_sessions_venue_open_time_idx"
  ON "cash_sessions" ("venue_id", "open_time" DESC);

-- ── orders — add cash_session_id ─────────────────────────────────────────────
-- Links every POS order to the till session that was open when it was placed.
-- NULL for online / kiosk orders and any order placed before this migration.
--
-- Expected cash formula at session close:
--   opening_amount
--   + SUM(op.amount  WHERE op.payment_method = 'cash'
--                      AND o.cash_session_id  = :session_id
--                      AND o.order_type       = 'sale')
--   - SUM(op.amount  WHERE op.payment_method = 'cash'
--                      AND o.cash_session_id  = :session_id
--                      AND o.order_type       = 'refund')
--   + SUM(paid_in movements) - SUM(paid_out movements) - SUM(drop movements)

ALTER TABLE "orders"
  ADD COLUMN "cash_session_id" UUID REFERENCES "cash_sessions"("id");

CREATE INDEX "orders_cash_session_idx"
  ON "orders" ("cash_session_id")
  WHERE "cash_session_id" IS NOT NULL;

-- ── cash_movements ────────────────────────────────────────────────────────────
-- Cash in / out events during an open session.
-- Each movement adjusts the expected closing balance.

CREATE TABLE "cash_movements" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "venue_id"      UUID NOT NULL REFERENCES "venues"("id"),
  "session_id"    UUID NOT NULL REFERENCES "cash_sessions"("id"),
  "movement_type" cash_movement_type NOT NULL,
  "amount"        NUMERIC(12, 2) NOT NULL CHECK ("amount" > 0),
  "reason"        TEXT NOT NULL,
  "recorded_by"   UUID NOT NULL REFERENCES "users"("id"),
  -- Set when amount exceeds pos.cash_movement_approval_threshold
  "approved_by"   UUID REFERENCES "users"("id"),
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "cash_movements_session_idx"
  ON "cash_movements" ("session_id");
