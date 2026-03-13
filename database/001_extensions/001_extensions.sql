-- ============================================================================
-- VenuePlus Database Setup — Step 1: Extensions
-- ============================================================================
-- Required PostgreSQL extensions for UUID generation and cryptographic hashing.
-- Run this FIRST before any other scripts.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- gen_random_bytes(), crypt(), gen_salt()
