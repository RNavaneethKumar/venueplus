-- ============================================================================
-- VenuePlus — Drawer ↔ Device Link Migration
--
-- Links each cash drawer to the POS terminal (device) that uses it.
-- Enables automatic drawer selection when a terminal is activated.
--
-- Run against your per-tenant database (venueplus_demo):
--   Option A — Neon Console: SQL Editor → paste & run
--   Option B — psql: psql "$DATABASE_URL" -f add_drawer_device_link.sql
--
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE cash_drawers
  ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES devices(id) ON DELETE SET NULL;

-- Optional index for fast lookup of "which drawer belongs to device X"
CREATE UNIQUE INDEX IF NOT EXISTS cash_drawers_device_id_idx
  ON cash_drawers (device_id)
  WHERE device_id IS NOT NULL;
