-- Migration: 0002_create_global_admins
-- Creates the global_admins table in the registry database.
-- Also adds updated_at to the tenants table.

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

-- Example: seed the first global admin (replace hash with bcrypt of your chosen password)
-- INSERT INTO global_admins (email, name, password_hash)
-- VALUES ('admin@venueplus.io', 'Super Admin', '$2b$10$...');
