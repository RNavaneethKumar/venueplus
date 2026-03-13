-- ============================================================================
-- VenuePlus — Registry Database Bootstrap
--
-- Run this against your REGISTRY_DATABASE_URL (the Neon registry database).
-- It is safe to run multiple times (all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING).
--
-- How to run:
--   Option A — Neon Console: open your registry database → SQL Editor → paste & run
--   Option B — psql: psql "$REGISTRY_DATABASE_URL" -f run_registry.sql
-- ============================================================================

-- 0001: tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  db_url           TEXT        NOT NULL,
  default_venue_id UUID        NOT NULL,
  plan             TEXT        NOT NULL DEFAULT 'basic',
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 0002: updated_at column + global_admins table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS global_admins (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tenant seed ───────────────────────────────────────────────────────────────
-- Registers the 'navaneeth' tenant pointing at the venueplus_demo Neon database.
-- default_venue_id matches the venue UUID seeded by database/run.sql.
-- Safe to re-run — ON CONFLICT DO NOTHING skips if the slug already exists.

INSERT INTO tenants (slug, name, db_url, default_venue_id, plan)
VALUES (
  'navaneeth',
  'Navaneeth Demo',
  'postgresql://neondb_owner:npg_SUeWvdo30MBf@ep-winter-hall-a130kqon-pooler.ap-southeast-1.aws.neon.tech/venueplus_demo?sslmode=require',
  'c0000000-0000-0000-0000-000000000001',
  'professional'
)
ON CONFLICT (slug) DO NOTHING;
