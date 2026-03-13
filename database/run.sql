-- ============================================================================
-- VenuePlus Database — Master Run Script
-- ============================================================================
--
-- Usage:
--   psql -h <host> -U <user> -d <database> -f run.sql
--
-- Or on Postgres Cloud (Neon, Supabase, RDS, etc.):
--   Upload and execute in order, or run this single file.
--
-- This script executes all DDL and seed data in the correct dependency order.
-- It is SAFE to re-run only on a fresh/empty database.
-- ============================================================================

\echo '════════════════════════════════════════════════════════════════'
\echo '  VenuePlus Database Setup — Starting...'
\echo '════════════════════════════════════════════════════════════════'

BEGIN;

\echo '→ Step 1/6: Extensions'
\i 001_extensions/001_extensions.sql

\echo '→ Step 2/6: ENUM Types'
\i 002_enums/001_enums.sql

\echo '→ Step 3/6: Tables'
\i 003_tables/001_governance.sql
\i 003_tables/002_customer_identity.sql
\i 003_tables/003_taxation.sql
\i 003_tables/004_resources.sql
\i 003_tables/005_products.sql
\i 003_tables/006_orders.sql
\i 003_tables/007_reservations.sql
\i 003_tables/008_pricing_engine.sql
\i 003_tables/009_waivers.sql
\i 003_tables/010_membership.sql
\i 003_tables/011_wallet.sql
\i 003_tables/012_gift_cards.sql
\i 003_tables/013_redemption_cards.sql
\i 003_tables/014_donations_adoptions.sql
\i 003_tables/015_fnb.sql
\i 003_tables/016_retail.sql
\i 003_tables/017_crm.sql
\i 003_tables/018_reporting.sql
\i 003_tables/019_till.sql

\echo '→ Step 4/6: Indexes'
\i 004_indexes/001_indexes.sql

\echo '→ Step 5/6: Functions & Triggers'
\i 005_functions/001_functions.sql

\echo '→ Step 6/6: Seed Data'
\i 006_seed_data/001_governance.sql
\i 006_seed_data/002_taxation_visitors.sql
\i 006_seed_data/003_resources_devices.sql
\i 006_seed_data/004_products.sql
\i 006_seed_data/005_customers_waivers.sql
\i 006_seed_data/006_orders_reservations.sql
\i 006_seed_data/007_membership_wallet_fnb_retail.sql
\i 006_seed_data/008_pricing_crm.sql
\i 006_seed_data/009_till.sql

COMMIT;

\echo ''
\echo '════════════════════════════════════════════════════════════════'
\echo '  VenuePlus Database Setup — COMPLETE'
\echo '════════════════════════════════════════════════════════════════'
\echo ''
\echo '  Venue: FunZone Family Entertainment Centre'
\echo '  Tables created:  ~73'
\echo '  Seed data:       10 staff, 50 customers, 100+ orders, 3 cash drawers'
\echo '  Modules:         All enabled (ticketing, membership, wallet,'
\echo '                   gift cards, redemption, F&B, retail, CRM,'
\echo '                   waivers, donations, adoptions, reporting, till)'
\echo '  Channels:        POS, Online (ecommerce/mobile), Kiosk'
\echo ''
