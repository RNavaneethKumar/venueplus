-- ============================================================================
-- VenuePlus Database — Drop Everything (for clean re-runs)
-- ============================================================================
-- WARNING: This drops ALL VenuePlus tables, types, functions, and sequences.
-- ============================================================================

BEGIN;

-- Drop all tables (reverse dependency order)
DROP TABLE IF EXISTS marketing_campaign_sends CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS customer_notes CASCADE;
DROP TABLE IF EXISTS customer_tags CASCADE;
DROP TABLE IF EXISTS customer_segment_members CASCADE;
DROP TABLE IF EXISTS customer_segments CASCADE;
DROP TABLE IF EXISTS customer_activities CASCADE;
DROP TABLE IF EXISTS hourly_occupancy_stats CASCADE;
DROP TABLE IF EXISTS daily_revenue_stats CASCADE;
DROP TABLE IF EXISTS retail_inventory_transactions CASCADE;
DROP TABLE IF EXISTS retail_inventory CASCADE;
DROP TABLE IF EXISTS retail_items CASCADE;
DROP TABLE IF EXISTS fnb_inventory_adjustments CASCADE;
DROP TABLE IF EXISTS fnb_inventory CASCADE;
DROP TABLE IF EXISTS kitchen_order_items CASCADE;
DROP TABLE IF EXISTS kitchen_orders CASCADE;
DROP TABLE IF EXISTS fnb_items CASCADE;
DROP TABLE IF EXISTS preparation_stations CASCADE;
DROP TABLE IF EXISTS fnb_categories CASCADE;
DROP TABLE IF EXISTS adoptions CASCADE;
DROP TABLE IF EXISTS adoptees CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS donation_causes CASCADE;
DROP TABLE IF EXISTS redemption_card_transactions CASCADE;
DROP TABLE IF EXISTS redemption_cards CASCADE;
DROP TABLE IF EXISTS gift_card_transactions CASCADE;
DROP TABLE IF EXISTS gift_cards CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS membership_allowance_transactions CASCADE;
DROP TABLE IF EXISTS membership_allowance_balances CASCADE;
DROP TABLE IF EXISTS membership_members CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS membership_benefits CASCADE;
DROP TABLE IF EXISTS membership_plans CASCADE;
DROP TABLE IF EXISTS waiver_signature_persons CASCADE;
DROP TABLE IF EXISTS waiver_signatures CASCADE;
DROP TABLE IF EXISTS product_waiver_mapping CASCADE;
DROP TABLE IF EXISTS waiver_templates CASCADE;
DROP TABLE IF EXISTS bundle_promotion_items CASCADE;
DROP TABLE IF EXISTS bundle_promotions CASCADE;
DROP TABLE IF EXISTS promo_code_usages CASCADE;
DROP TABLE IF EXISTS promo_code_applicability CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;
DROP TABLE IF EXISTS pricing_rule_actions CASCADE;
DROP TABLE IF EXISTS pricing_rule_conditions CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS reservation_usage_logs CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS reservation_groups CASCADE;
DROP TABLE IF EXISTS capacity_holds CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS device_resource_mapping CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS order_payments CASCADE;
DROP TABLE IF EXISTS order_item_tax_components CASCADE;
DROP TABLE IF EXISTS order_item_adjustments CASCADE;
DROP TABLE IF EXISTS order_item_price_components CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_resource_mapping CASCADE;
DROP TABLE IF EXISTS product_reservation_config CASCADE;
DROP TABLE IF EXISTS product_tax_structures CASCADE;
DROP TABLE IF EXISTS product_prices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS resource_slots CASCADE;
DROP TABLE IF EXISTS resource_slot_templates CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS visitor_types CASCADE;
DROP TABLE IF EXISTS tax_structure_components CASCADE;
DROP TABLE IF EXISTS tax_structures CASCADE;
DROP TABLE IF EXISTS tax_components CASCADE;
DROP TABLE IF EXISTS account_otp_log CASCADE;
DROP TABLE IF EXISTS account_persons CASCADE;
DROP TABLE IF EXISTS persons CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS alerts_log CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS venue_feature_flags CASCADE;
DROP TABLE IF EXISTS venue_settings CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_venue_setting CASCADE;
DROP FUNCTION IF EXISTS get_slot_available_capacity CASCADE;
DROP FUNCTION IF EXISTS get_resource_available_capacity CASCADE;
DROP FUNCTION IF EXISTS generate_order_number CASCADE;
DROP FUNCTION IF EXISTS expire_stale_holds CASCADE;
DROP FUNCTION IF EXISTS get_live_headcount CASCADE;
DROP FUNCTION IF EXISTS is_feature_enabled CASCADE;
DROP FUNCTION IF EXISTS trigger_set_updated_at CASCADE;

-- Drop sequence
DROP SEQUENCE IF EXISTS order_number_seq;

-- Drop all custom ENUM types
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

COMMIT;

\echo 'VenuePlus database dropped successfully.'
