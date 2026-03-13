-- ============================================================================
-- Registry Database Migration — Tenants Table
-- Run this against REGISTRY_DATABASE_URL (not the per-tenant DATABASE_URL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT        NOT NULL UNIQUE,   -- subdomain: greenpark
  name             TEXT        NOT NULL,          -- display: "Green Park Fun Zone"
  db_url           TEXT        NOT NULL,          -- postgres://... for tenant DB
  default_venue_id UUID        NOT NULL,          -- venue UUID inside tenant DB
  plan             TEXT        NOT NULL DEFAULT 'basic',
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Example seed row for local development:
-- INSERT INTO tenants (slug, name, db_url, default_venue_id)
-- VALUES (
--   'greenpark',
--   'Green Park Fun Zone',
--   'postgres://postgres:password@localhost:5432/venueplus',
--   'c0000000-0000-0000-0000-000000000001'
-- );
