-- ============================================================================
-- VenuePlus Database Setup — Step 2: ENUM Types
-- ============================================================================
-- All custom ENUM types referenced by tables. Run AFTER extensions.
-- ============================================================================

-- ── Platform Governance ──────────────────────────────────────────────────────

CREATE TYPE scope_type AS ENUM ('venue', 'global');

CREATE TYPE venue_status AS ENUM ('active', 'inactive', 'closed');

CREATE TYPE device_type AS ENUM ('pos', 'gate', 'kiosk', 'kds', 'arcade_reader');

CREATE TYPE device_status AS ENUM ('active', 'inactive', 'maintenance');

CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp');

CREATE TYPE api_key_status AS ENUM ('active', 'revoked', 'expired');

CREATE TYPE alert_comparison_operator AS ENUM ('>', '<', '=', '>=', '<=');

CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');

-- ── Customer Identity ────────────────────────────────────────────────────────

CREATE TYPE auth_provider AS ENUM ('email', 'mobile', 'google', 'apple');

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE person_relationship AS ENUM ('self', 'child', 'spouse', 'guardian', 'other');

CREATE TYPE otp_channel AS ENUM ('sms', 'email', 'whatsapp');

CREATE TYPE otp_purpose AS ENUM ('login', 'registration', 'waiver', 'password_reset');

-- ── Ticketing & Resources ────────────────────────────────────────────────────

CREATE TYPE admission_mode AS ENUM ('slot_based', 'rolling_duration', 'open_access');

CREATE TYPE capacity_enforcement_type AS ENUM ('hard', 'soft');

CREATE TYPE slot_recurrence_type AS ENUM ('daily', 'weekly');

CREATE TYPE capacity_hold_status AS ENUM ('active', 'converted', 'released', 'expired');

CREATE TYPE reservation_type AS ENUM ('slot_bound', 'duration_bound', 'access_bound', 'multi_day');

CREATE TYPE usage_type AS ENUM ('single_use', 'multi_entry', 'time_limited', 'per_day');

CREATE TYPE reservation_status AS ENUM ('confirmed', 'consumed', 'cancelled', 'expired');

CREATE TYPE scan_usage_type AS ENUM ('entry', 'exit');

-- ── Products ─────────────────────────────────────────────────────────────────

CREATE TYPE product_type AS ENUM (
    'ticket', 'membership', 'retail', 'wallet_load',
    'gift_card', 'event_package', 'food_beverage',
    'donation', 'adoption'
);

CREATE TYPE sales_channel AS ENUM ('online', 'pos', 'kiosk');

-- ── Orders & Payments ────────────────────────────────────────────────────────

CREATE TYPE order_type AS ENUM ('sale', 'refund');

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'refunded', 'cancelled');

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi', 'wallet', 'gift_card', 'redemption_card');

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TYPE gateway_tx_status AS ENUM ('success', 'failed', 'pending', 'refunded');

CREATE TYPE price_component_type AS ENUM (
    'base_price', 'dynamic_pricing', 'visitor_modifier', 'channel_modifier'
);

CREATE TYPE adjustment_source AS ENUM ('pricing_rule', 'promo_code', 'bundle', 'manual');

CREATE TYPE adjustment_type AS ENUM ('discount', 'surcharge');

-- ── Pricing Engine ───────────────────────────────────────────────────────────

CREATE TYPE pricing_rule_type AS ENUM ('discount', 'surcharge', 'set_price', 'bogo', 'bundle');

CREATE TYPE pricing_condition_type AS ENUM (
    'product', 'visitor_type', 'channel', 'day_of_week',
    'date_range', 'time_of_day', 'quantity', 'booking_lead_time'
);

CREATE TYPE pricing_condition_operator AS ENUM ('=', '>', '<', '>=', '<=', 'IN');

CREATE TYPE pricing_action_type AS ENUM (
    'flat_discount', 'percent_discount', 'flat_surcharge',
    'percent_surcharge', 'set_price', 'free_item'
);

CREATE TYPE discount_type AS ENUM ('flat', 'percent');

CREATE TYPE promo_usage_status AS ENUM ('applied', 'reversed');

CREATE TYPE bundle_type AS ENUM ('bogo', 'combo_discount', 'set_price', 'included_items');

CREATE TYPE bundle_item_role AS ENUM ('qualifier', 'reward');

-- ── Waivers ──────────────────────────────────────────────────────────────────

-- (uses existing types: no new enums needed)

-- ── Membership ───────────────────────────────────────────────────────────────

CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual', 'one_time');

CREATE TYPE membership_benefit_type AS ENUM ('discount', 'allowance');

CREATE TYPE allowance_unit AS ENUM ('visits', 'hours', 'credits');

CREATE TYPE allowance_reset_cycle AS ENUM ('monthly', 'annual');

CREATE TYPE membership_status AS ENUM ('active', 'past_due', 'cancelled', 'expired');

CREATE TYPE allowance_tx_type AS ENUM ('deduction', 'reversal', 'reset');

-- ── Wallet ───────────────────────────────────────────────────────────────────

CREATE TYPE wallet_tx_type AS ENUM ('credit', 'debit', 'refund', 'expiry', 'adjustment');

CREATE TYPE wallet_balance_type AS ENUM ('real_cash', 'bonus_cash', 'redemption_points');

-- ── Gift Cards ───────────────────────────────────────────────────────────────

CREATE TYPE gift_card_status AS ENUM ('active', 'redeemed', 'expired', 'cancelled');

CREATE TYPE gift_card_tx_type AS ENUM ('issue', 'redemption', 'refund', 'expiry', 'adjustment');

-- ── Redemption Cards ─────────────────────────────────────────────────────────

CREATE TYPE redemption_card_type AS ENUM ('visit_based', 'credit_based');

CREATE TYPE redemption_card_status AS ENUM ('active', 'exhausted', 'expired', 'cancelled');

CREATE TYPE redemption_card_tx_type AS ENUM ('issue', 'redemption', 'top_up', 'expiry');

-- ── Donations ────────────────────────────────────────────────────────────────

CREATE TYPE donation_type AS ENUM ('one_time', 'recurring');

CREATE TYPE donation_recurrence AS ENUM ('monthly', 'annual');

-- ── Adoptions ────────────────────────────────────────────────────────────────

CREATE TYPE adoptee_type AS ENUM ('animal', 'exhibit', 'project');

CREATE TYPE adoption_status AS ENUM ('active', 'expired', 'cancelled');

-- ── F&B ──────────────────────────────────────────────────────────────────────

CREATE TYPE kitchen_order_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'cancelled');

CREATE TYPE kitchen_item_status AS ENUM ('pending', 'preparing', 'ready', 'served');

CREATE TYPE fnb_adjustment_type AS ENUM ('sale', 'manual_add', 'manual_remove', 'waste', 'receive');

-- ── Retail ───────────────────────────────────────────────────────────────────

CREATE TYPE retail_tx_type AS ENUM ('sale', 'refund', 'adjustment', 'receive', 'waste');

-- ── CRM ──────────────────────────────────────────────────────────────────────

CREATE TYPE customer_activity_type AS ENUM (
    'purchase', 'entry_scan', 'waiver_signed', 'membership_activated',
    'membership_cancelled', 'refund', 'gift_card_redeemed', 'donation'
);

CREATE TYPE segment_type AS ENUM ('static', 'dynamic');

CREATE TYPE tag_source AS ENUM ('system', 'staff');

CREATE TYPE campaign_channel AS ENUM ('email', 'sms', 'whatsapp', 'push');

CREATE TYPE campaign_trigger_type AS ENUM ('scheduled', 'event_based');

CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'completed', 'cancelled');

CREATE TYPE campaign_send_status AS ENUM ('pending', 'sent', 'failed', 'bounced');

-- ── Till Management ───────────────────────────────────────────────────────────

CREATE TYPE cash_session_status AS ENUM (
    'open',
    'closed',       -- normal or blind close; cash count provided
    'blind_closed', -- blind close procedure used (recorded for audit)
    'forced',       -- manager force-closed; no cash count
    'auto'          -- system auto-closed at midnight
);

CREATE TYPE cash_close_type AS ENUM ('normal', 'blind', 'forced', 'auto');

CREATE TYPE cash_movement_type AS ENUM (
    'drop',     -- cash removed to safe; reduces expected cash
    'paid_in',  -- cash added (e.g. petty cash reimbursement)
    'paid_out'  -- cash removed for an expense
);
