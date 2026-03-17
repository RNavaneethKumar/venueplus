-- ============================================================================
-- Migration 002: Add missing columns to promo_codes
-- Run this against any existing database that was set up before these columns
-- were added to the initial schema.
-- ============================================================================

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS minimum_order_amount  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS current_uses          INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT now();

-- Fix max_uses_per_customer default (was nullable, now defaults to 1)
ALTER TABLE promo_codes
  ALTER COLUMN max_uses_per_customer SET DEFAULT 1;

UPDATE promo_codes SET max_uses_per_customer = 1 WHERE max_uses_per_customer IS NULL;

ALTER TABLE promo_codes
  ALTER COLUMN max_uses_per_customer SET NOT NULL;

-- Fix effective_from default
ALTER TABLE promo_codes
  ALTER COLUMN effective_from SET DEFAULT now();
