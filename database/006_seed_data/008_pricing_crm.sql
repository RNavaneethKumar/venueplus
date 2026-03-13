-- ============================================================================
-- VenuePlus Seed Data — Pricing Rules, Promos, CRM, Campaigns
-- ============================================================================

\set vid '''c0000000-0000-0000-0000-000000000001'''
\set uid_admin '''a0000000-0000-0000-0000-000000000002'''
\set vt_child '''d3000000-0000-0000-0000-000000000002'''
\set acc01 '''aa000000-0000-0000-0000-000000000001'''
\set acc02 '''aa000000-0000-0000-0000-000000000002'''
\set acc03 '''aa000000-0000-0000-0000-000000000003'''
\set acc04 '''aa000000-0000-0000-0000-000000000004'''
\set acc05 '''aa000000-0000-0000-0000-000000000005'''
\set acc06 '''aa000000-0000-0000-0000-000000000006'''
\set acc07 '''aa000000-0000-0000-0000-000000000007'''
\set p_jump1hr '''f1000000-0000-0000-0000-000000000001'''
\set p_laser '''f1000000-0000-0000-0000-000000000003'''
\set p_fries '''f1000000-0000-0000-0000-000000000022'''

-- ══════════════════════════════════════════════════════════════════════════════
-- PRICING RULES
-- ══════════════════════════════════════════════════════════════════════════════

-- Weekend surcharge (10% on Sat/Sun)
\set pr_weekend '''f7000000-0000-0000-0000-000000000001'''

INSERT INTO pricing_rules (id, venue_id, name, rule_type, priority, is_stackable, created_by) VALUES
(:pr_weekend, :vid, 'Weekend Surcharge 10%', 'surcharge', 1, true, :uid_admin);

INSERT INTO pricing_rule_conditions (pricing_rule_id, condition_type, operator, value) VALUES
(:pr_weekend, 'day_of_week', 'IN', '[6,7]');

INSERT INTO pricing_rule_actions (pricing_rule_id, action_type, value) VALUES
(:pr_weekend, 'percent_surcharge', 10.00);

-- Early bird discount (15% off for 7+ days advance)
\set pr_early '''f7000000-0000-0000-0000-000000000002'''

INSERT INTO pricing_rules (id, venue_id, name, rule_type, priority, is_stackable, created_by) VALUES
(:pr_early, :vid, 'Early Bird 15% Off', 'discount', 2, false, :uid_admin);

INSERT INTO pricing_rule_conditions (pricing_rule_id, condition_type, operator, value) VALUES
(:pr_early, 'booking_lead_time', '>=', '7'),
(:pr_early, 'channel', '=', 'online');

INSERT INTO pricing_rule_actions (pricing_rule_id, action_type, value) VALUES
(:pr_early, 'percent_discount', 15.00);

-- Bulk discount (5+ tickets → 10% off)
\set pr_bulk '''f7000000-0000-0000-0000-000000000003'''

INSERT INTO pricing_rules (id, venue_id, name, rule_type, priority, is_stackable, created_by) VALUES
(:pr_bulk, :vid, 'Group Booking 10% Off (5+)', 'discount', 3, true, :uid_admin);

INSERT INTO pricing_rule_conditions (pricing_rule_id, condition_type, operator, value) VALUES
(:pr_bulk, 'quantity', '>=', '5');

INSERT INTO pricing_rule_actions (pricing_rule_id, action_type, value) VALUES
(:pr_bulk, 'percent_discount', 10.00);

-- Peak hours surcharge (5pm-8pm, 5%)
\set pr_peak '''f7000000-0000-0000-0000-000000000004'''

INSERT INTO pricing_rules (id, venue_id, name, rule_type, priority, is_stackable, created_by) VALUES
(:pr_peak, :vid, 'Peak Hours 5% Surcharge', 'surcharge', 1, true, :uid_admin);

INSERT INTO pricing_rule_conditions (pricing_rule_id, condition_type, operator, value) VALUES
(:pr_peak, 'time_of_day', 'IN', '{"from":"17:00","to":"20:00"}');

INSERT INTO pricing_rule_actions (pricing_rule_id, action_type, value) VALUES
(:pr_peak, 'percent_surcharge', 5.00);

-- ══════════════════════════════════════════════════════════════════════════════
-- PROMO CODES
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO promo_codes (venue_id, code, description, discount_type, discount_value, max_uses, max_uses_per_customer, effective_from, effective_until, created_by) VALUES
(:vid, 'WELCOME10',  'New customer 10% off',        'percent', 10.00, 1000, 1, now(), now() + INTERVAL '90 days', :uid_admin),
(:vid, 'SUMMER20',   'Summer season 20% off',       'percent', 20.00, 500,  2, now(), now() + INTERVAL '60 days', :uid_admin),
(:vid, 'FLAT200',    'Flat ₹200 off on ₹1000+',     'flat',    200.00, 200,  1, now(), now() + INTERVAL '30 days', :uid_admin),
(:vid, 'FAMILY15',   'Family special 15% off',       'percent', 15.00, 300,  3, now(), now() + INTERVAL '45 days', :uid_admin);

-- Promo applicability (WELCOME10 = online only, tickets only)
INSERT INTO promo_code_applicability (promo_code_id, sales_channel)
SELECT id, 'online' FROM promo_codes WHERE code = 'WELCOME10';

-- ══════════════════════════════════════════════════════════════════════════════
-- BUNDLE PROMOTIONS
-- ══════════════════════════════════════════════════════════════════════════════

\set bp_bogo '''f8000000-0000-0000-0000-000000000001'''

INSERT INTO bundle_promotions (id, venue_id, name, bundle_type, max_applications_per_order, created_by) VALUES
(:bp_bogo, :vid, 'Laser Tag BOGO Fridays', 'bogo', 2, :uid_admin);

INSERT INTO bundle_promotion_items (bundle_promotion_id, product_id, role, required_quantity, reward_quantity, discount_value) VALUES
(:bp_bogo, :p_laser, 'qualifier', 2, NULL, NULL),
(:bp_bogo, :p_laser, 'reward',    NULL, 1, 0.00);

-- Combo: Jump + Fries free
\set bp_combo '''f8000000-0000-0000-0000-000000000002'''

INSERT INTO bundle_promotions (id, venue_id, name, bundle_type, created_by) VALUES
(:bp_combo, :vid, 'Jump & Munch Combo', 'included_items', :uid_admin);

INSERT INTO bundle_promotion_items (bundle_promotion_id, product_id, role, required_quantity, is_auto_added, is_removable) VALUES
(:bp_combo, :p_jump1hr, 'qualifier', 1, false, false),
(:bp_combo, :p_fries,   'reward',    NULL, true, true);

-- ══════════════════════════════════════════════════════════════════════════════
-- CRM — Customer Activities, Segments, Tags, Campaigns
-- ══════════════════════════════════════════════════════════════════════════════

-- Customer activities (auto-generated from orders)
INSERT INTO customer_activities (account_id, venue_id, activity_type, entity_type, entity_id, metadata)
SELECT o.account_id, o.venue_id, 'purchase', 'order', o.id,
    jsonb_build_object('total', o.total_amount, 'channel', o.source_channel)
FROM orders o
WHERE o.account_id IS NOT NULL AND o.status = 'paid';

-- Customer Segments
\set seg_vip '''f9000000-0000-0000-0000-000000000001'''
\set seg_new '''f9000000-0000-0000-0000-000000000002'''
\set seg_lapsed '''f9000000-0000-0000-0000-000000000003'''
\set seg_members '''f9000000-0000-0000-0000-000000000004'''

INSERT INTO customer_segments (id, venue_id, name, description, segment_type, rules, created_by) VALUES
(:seg_vip,     :vid, 'VIP Spenders',          'Customers who spent > ₹5000 total',             'dynamic', '{"total_spend": {">": 5000}}',                    :uid_admin),
(:seg_new,     :vid, 'New Visitors',           'First-time customers with only 1 visit',        'dynamic', '{"visit_count": {"=": 1}}',                       :uid_admin),
(:seg_lapsed,  :vid, 'Lapsed Customers',       'No visit in 60+ days with prior spend > ₹1000', 'dynamic', '{"last_visit_days": {">": 60}, "total_spend": {">": 1000}}', :uid_admin),
(:seg_members, :vid, 'Active Members',         'Customers with active memberships',              'dynamic', '{"membership_status": "active"}',                 :uid_admin);

-- Static segment membership for VIPs
INSERT INTO customer_segment_members (segment_id, account_id) VALUES
(:seg_vip, :acc01),
(:seg_vip, :acc02),
(:seg_members, :acc01);

-- Customer Tags
INSERT INTO customer_tags (account_id, tag, applied_by) VALUES
(:acc01, 'member',      'system'),
(:acc01, 'vip',         'system'),
(:acc01, 'repeat-buyer','system'),
(:acc02, 'family',      'system'),
(:acc03, 'first-timer', 'system'),
(:acc04, 'gift-buyer',  'system'),
(:acc06, 'donor',       'system');

-- Notification Templates
INSERT INTO notification_templates (venue_id, channel, template_key, subject, body) VALUES
(:vid, 'email', 'booking.confirmation', 'Your FunZone Booking Confirmation - {{order_number}}',
    'Hi {{customer_name}},\n\nThank you for your booking at FunZone! Your order {{order_number}} is confirmed.\n\nVisit date: {{visit_date}}\nTotal: ₹{{total_amount}}\n\nSee you soon!\nTeam FunZone'),
(:vid, 'sms', 'booking.confirmation', NULL,
    'FunZone: Booking {{order_number}} confirmed for {{visit_date}}. Total: Rs.{{total_amount}}. Show QR at entry. Enjoy!'),
(:vid, 'email', 'waiver.reminder', 'Complete Your Waiver Before Your Visit',
    'Hi {{customer_name}},\n\nDon''t forget to sign your activity waiver before visiting FunZone tomorrow. Sign here: {{waiver_link}}\n\nTeam FunZone'),
(:vid, 'sms', 'waiver.reminder', NULL,
    'FunZone: Please complete your activity waiver before your visit tomorrow. Sign at {{waiver_link}}'),
(:vid, 'email', 'membership.welcome', 'Welcome to FunZone Membership!',
    'Hi {{customer_name}},\n\nWelcome to FunZone {{plan_name}}! Your membership is now active.\n\nBenefits:\n- {{benefits_summary}}\n\nValid until: {{period_end}}\n\nTeam FunZone');

-- Marketing Campaign
INSERT INTO marketing_campaigns (venue_id, name, channel, segment_id, notification_template_id, trigger_type, scheduled_at, status, created_by)
SELECT :vid, 'Win Back Lapsed VIPs', 'email', :seg_lapsed,
    nt.id, 'scheduled', now() + INTERVAL '7 days', 'scheduled', :uid_admin
FROM notification_templates nt
WHERE nt.template_key = 'booking.confirmation' AND nt.channel = 'email'
LIMIT 1;

-- ══════════════════════════════════════════════════════════════════════════════
-- ALERT RULES
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO alert_rules (venue_id, alert_type, threshold_value, comparison_operator, time_window_minutes, updated_by) VALUES
(:vid, 'device.offline',       5,   '>=', 10,   :uid_admin),
(:vid, 'capacity.threshold',   90,  '>=', NULL, :uid_admin),
(:vid, 'inventory.low_stock',  NULL, NULL, NULL, :uid_admin);
