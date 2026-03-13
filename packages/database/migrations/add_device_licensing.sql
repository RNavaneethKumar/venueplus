-- ============================================================================
-- VenuePlus — Device Licensing Migration
--
-- Adds license key and activation tracking columns to the devices table.
--
-- Run this against your per-tenant database (venueplus_demo):
--   Option A — Neon Console: open venueplus_demo → SQL Editor → paste & run
--   Option B — psql: psql "$DATABASE_URL" -f add_device_licensing.sql
--
-- Safe to run multiple times (all statements use IF NOT EXISTS).
-- ============================================================================

-- License key displayed in admin panel and entered on the terminal (e.g. VP-XXXX-XXXX-XXXX)
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS license_key TEXT UNIQUE;

-- SHA-256 hash of the device token issued at activation time (stored server-side)
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS device_token_hash TEXT;

-- Timestamp of when this terminal was first activated
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Whether the terminal has been activated via the license key
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS is_activated BOOLEAN NOT NULL DEFAULT FALSE;
