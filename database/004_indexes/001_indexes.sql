-- ============================================================================
-- VenuePlus Database Setup — Step 4: Indexes
-- ============================================================================
-- Performance indexes for queries, lookups, and reporting.
-- Unique constraints defined inline with tables are NOT repeated here.
-- ============================================================================

-- ── Governance ───────────────────────────────────────────────────────────────

CREATE INDEX idx_user_roles_user        ON user_roles (user_id) WHERE is_active = true;
CREATE INDEX idx_user_roles_venue       ON user_roles (venue_id) WHERE is_active = true;
CREATE INDEX idx_venue_settings_key     ON venue_settings (venue_id, setting_key);
CREATE INDEX idx_audit_logs_venue_ts    ON audit_logs (venue_id, timestamp DESC);
CREATE INDEX idx_audit_logs_entity      ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_user        ON audit_logs (user_id, timestamp DESC);
CREATE INDEX idx_devices_venue          ON devices (venue_id) WHERE status = 'active';
CREATE INDEX idx_alert_rules_venue      ON alert_rules (venue_id) WHERE is_active = true;
CREATE INDEX idx_alerts_log_venue       ON alerts_log (venue_id, triggered_at DESC);

-- ── Customer Identity ────────────────────────────────────────────────────────

CREATE INDEX idx_accounts_venue         ON accounts (venue_id) WHERE is_active = true;
CREATE INDEX idx_accounts_email         ON accounts (email) WHERE email IS NOT NULL;
CREATE INDEX idx_accounts_mobile        ON accounts (mobile_number) WHERE mobile_number IS NOT NULL;
CREATE INDEX idx_persons_venue          ON persons (venue_id);
CREATE INDEX idx_account_persons_acct   ON account_persons (account_id);
CREATE INDEX idx_account_persons_person ON account_persons (person_id);
CREATE INDEX idx_otp_log_recipient      ON account_otp_log (recipient, created_at DESC);
CREATE INDEX idx_otp_log_account        ON account_otp_log (account_id) WHERE account_id IS NOT NULL;

-- ── Resources & Slots ────────────────────────────────────────────────────────

CREATE INDEX idx_resources_venue        ON resources (venue_id) WHERE is_active = true;
CREATE INDEX idx_resource_slots_date    ON resource_slots (resource_id, slot_date, start_time);
CREATE INDEX idx_resource_slots_active  ON resource_slots (resource_id, slot_date) WHERE is_active = true;

-- ── Products ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_products_venue_type    ON products (venue_id, product_type) WHERE is_active = true;
CREATE INDEX idx_product_prices_lookup  ON product_prices (product_id, visitor_type_id, sales_channel) WHERE is_active = true;
CREATE INDEX idx_product_resource_map   ON product_resource_mapping (product_id);

-- ── Orders ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_orders_venue_date      ON orders (venue_id, created_at DESC);
CREATE INDEX idx_orders_account         ON orders (account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_orders_number          ON orders (order_number);
CREATE INDEX idx_orders_status          ON orders (venue_id, status);
CREATE INDEX idx_orders_channel         ON orders (venue_id, source_channel, created_at DESC);
CREATE INDEX idx_order_items_order      ON order_items (order_id);
CREATE INDEX idx_order_items_product    ON order_items (product_id);
CREATE INDEX idx_order_payments_order   ON order_payments (order_id);
CREATE INDEX idx_payment_tx_payment     ON payment_transactions (order_payment_id);
CREATE INDEX idx_order_tax_item         ON order_item_tax_components (order_item_id);
CREATE INDEX idx_order_adjustments_item ON order_item_adjustments (order_item_id);

-- ── Capacity Holds ───────────────────────────────────────────────────────────

CREATE INDEX idx_capacity_holds_active  ON capacity_holds (resource_id, status, expires_at)
    WHERE status = 'active';
CREATE INDEX idx_capacity_holds_slot    ON capacity_holds (resource_slot_id)
    WHERE status = 'active';
CREATE INDEX idx_capacity_holds_session ON capacity_holds (session_token)
    WHERE status = 'active';

-- ── Reservations ─────────────────────────────────────────────────────────────

CREATE INDEX idx_reservations_order_item    ON reservations (order_item_id);
CREATE INDEX idx_reservations_resource      ON reservations (resource_id, status);
CREATE INDEX idx_reservations_slot          ON reservations (resource_slot_id)
    WHERE status = 'confirmed';
CREATE INDEX idx_reservations_person        ON reservations (person_id)
    WHERE person_id IS NOT NULL;
CREATE INDEX idx_reservations_validity      ON reservations (resource_id, valid_from, valid_until)
    WHERE status = 'confirmed';
CREATE INDEX idx_usage_logs_reservation     ON reservation_usage_logs (reservation_id, timestamp);
CREATE INDEX idx_usage_logs_device          ON reservation_usage_logs (device_id, timestamp DESC);

-- ── Pricing ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_pricing_rules_venue    ON pricing_rules (venue_id, priority) WHERE is_active = true;
CREATE INDEX idx_pricing_conditions     ON pricing_rule_conditions (pricing_rule_id);
CREATE INDEX idx_pricing_actions        ON pricing_rule_actions (pricing_rule_id);
CREATE INDEX idx_promo_codes_code       ON promo_codes (code) WHERE is_active = true;
CREATE INDEX idx_promo_usages_code      ON promo_code_usages (promo_code_id);
CREATE INDEX idx_promo_usages_account   ON promo_code_usages (account_id) WHERE account_id IS NOT NULL;

-- ── Waivers ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_waiver_templates_venue ON waiver_templates (venue_id) WHERE is_active = true;
CREATE INDEX idx_waiver_sigs_account    ON waiver_signatures (signed_by_account_id);
CREATE INDEX idx_waiver_sig_persons     ON waiver_signature_persons (person_id);

-- ── Membership ───────────────────────────────────────────────────────────────

CREATE INDEX idx_memberships_account    ON memberships (account_id, status);
CREATE INDEX idx_memberships_plan       ON memberships (membership_plan_id);
CREATE INDEX idx_membership_members     ON membership_members (membership_id) WHERE removed_at IS NULL;
CREATE INDEX idx_membership_balances    ON membership_allowance_balances (membership_id, period_start);

-- ── Wallet ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_wallets_account        ON wallets (account_id, venue_id);
CREATE INDEX idx_wallet_tx_wallet       ON wallet_transactions (wallet_id, created_at DESC);

-- ── Gift Cards ───────────────────────────────────────────────────────────────

CREATE INDEX idx_gift_cards_code        ON gift_cards (code) WHERE status = 'active';
CREATE INDEX idx_gift_cards_venue       ON gift_cards (venue_id, status);
CREATE INDEX idx_gift_card_tx           ON gift_card_transactions (gift_card_id);

-- ── Redemption Cards ─────────────────────────────────────────────────────────

CREATE INDEX idx_redemption_cards_acct  ON redemption_cards (account_id, status);
CREATE INDEX idx_redemption_cards_code  ON redemption_cards (code) WHERE status = 'active';
CREATE INDEX idx_redemption_tx          ON redemption_card_transactions (redemption_card_id);

-- ── Donations & Adoptions ────────────────────────────────────────────────────

CREATE INDEX idx_donations_cause        ON donations (donation_cause_id);
CREATE INDEX idx_donations_account      ON donations (account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_adoptions_adoptee      ON adoptions (adoptee_id);
CREATE INDEX idx_adoptions_account      ON adoptions (account_id);

-- ── F&B ──────────────────────────────────────────────────────────────────────

CREATE INDEX idx_fnb_items_venue        ON fnb_items (venue_id) WHERE is_available = true;
CREATE INDEX idx_fnb_items_category     ON fnb_items (category_id);
CREATE INDEX idx_kitchen_orders_order   ON kitchen_orders (order_id);
CREATE INDEX idx_kitchen_orders_station ON kitchen_orders (preparation_station_id, status);
CREATE INDEX idx_fnb_inventory_item     ON fnb_inventory (fnb_item_id);

-- ── Retail ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_retail_items_venue     ON retail_items (venue_id) WHERE is_active = true;
CREATE INDEX idx_retail_items_sku       ON retail_items (sku);
CREATE INDEX idx_retail_inventory_item  ON retail_inventory (retail_item_id);

-- ── CRM ──────────────────────────────────────────────────────────────────────

CREATE INDEX idx_customer_activities    ON customer_activities (account_id, created_at DESC);
CREATE INDEX idx_customer_activities_v  ON customer_activities (venue_id, activity_type, created_at DESC);
CREATE INDEX idx_customer_tags_acct     ON customer_tags (account_id);
CREATE INDEX idx_segment_members        ON customer_segment_members (segment_id) WHERE removed_at IS NULL;
CREATE INDEX idx_campaign_sends         ON marketing_campaign_sends (campaign_id, status);

-- ── Reporting ────────────────────────────────────────────────────────────────

CREATE INDEX idx_daily_revenue_date     ON daily_revenue_stats (venue_id, stat_date, channel);
CREATE INDEX idx_hourly_occupancy       ON hourly_occupancy_stats (venue_id, resource_id, stat_date);

-- ── Till Management ───────────────────────────────────────────────────────────

-- At most one open session per drawer (counter mode)
CREATE UNIQUE INDEX cash_sessions_drawer_open_unique
    ON cash_sessions (drawer_id)
    WHERE status = 'open' AND drawer_id IS NOT NULL;

-- At most one open session per user (user mode)
CREATE UNIQUE INDEX cash_sessions_user_open_unique
    ON cash_sessions (opened_by)
    WHERE status = 'open' AND drawer_id IS NULL;

-- Fast range queries: sessions by venue + date
CREATE INDEX idx_cash_sessions_venue_time  ON cash_sessions (venue_id, open_time DESC);

-- Link orders to their till session
CREATE INDEX idx_orders_cash_session       ON orders (cash_session_id)
    WHERE cash_session_id IS NOT NULL;

-- Movement lookup by session
CREATE INDEX idx_cash_movements_session    ON cash_movements (session_id);
