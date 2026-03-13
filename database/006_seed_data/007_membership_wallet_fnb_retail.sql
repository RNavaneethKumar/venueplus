-- ============================================================================
-- VenuePlus Seed Data — Membership, F&B, Retail, Donations, Adoptions
-- ============================================================================

\set vid '''c0000000-0000-0000-0000-000000000001'''
\set uid_admin '''a0000000-0000-0000-0000-000000000002'''
\set uid_cashier1 '''a0000000-0000-0000-0000-000000000004'''
\set uid_kds '''a0000000-0000-0000-0000-000000000009'''
\set uid_retail '''a0000000-0000-0000-0000-00000000000a'''
\set acc01 '''aa000000-0000-0000-0000-000000000001'''
\set acc02 '''aa000000-0000-0000-0000-000000000002'''
\set acc06 '''aa000000-0000-0000-0000-000000000006'''
\set acc07 '''aa000000-0000-0000-0000-000000000007'''
\set per01 '''ab000000-0000-0000-0000-000000000001'''
\set per01_kid1 '''ab000000-0000-0000-0000-000000000011'''
\set per02 '''ab000000-0000-0000-0000-000000000002'''
\set p_mem_ind '''f1000000-0000-0000-0000-000000000010'''
\set p_mem_fam '''f1000000-0000-0000-0000-000000000011'''
\set p_burger '''f1000000-0000-0000-0000-000000000020'''
\set p_pizza '''f1000000-0000-0000-0000-000000000021'''
\set p_fries '''f1000000-0000-0000-0000-000000000022'''
\set p_coke '''f1000000-0000-0000-0000-000000000023'''
\set p_juice '''f1000000-0000-0000-0000-000000000024'''
\set p_icecream '''f1000000-0000-0000-0000-000000000025'''
\set p_coffee '''f1000000-0000-0000-0000-000000000026'''
\set p_nachos '''f1000000-0000-0000-0000-000000000027'''
\set p_tshirt '''f1000000-0000-0000-0000-000000000030'''
\set p_cap '''f1000000-0000-0000-0000-000000000031'''
\set p_mug '''f1000000-0000-0000-0000-000000000032'''
\set p_plush '''f1000000-0000-0000-0000-000000000033'''
\set p_keychain '''f1000000-0000-0000-0000-000000000034'''
\set p_donate '''f1000000-0000-0000-0000-000000000017'''
\set p_adopt '''f1000000-0000-0000-0000-000000000018'''
\set dev_kds1 '''e3000000-0000-0000-0000-000000000008'''
\set dev_kds2 '''e3000000-0000-0000-0000-000000000009'''
\set oi10 '''01100000-0000-0000-0000-000000000017'''
\set oi07 '''01100000-0000-0000-0000-000000000011'''
\set oi08a '''01100000-0000-0000-0000-000000000012'''
\set oi08b '''01100000-0000-0000-0000-000000000013'''
\set ord03 '''01000000-0000-0000-0000-000000000003'''
\set ord09 '''01000000-0000-0000-0000-000000000009'''

-- ══════════════════════════════════════════════════════════════════════════════
-- MEMBERSHIP
-- ══════════════════════════════════════════════════════════════════════════════

\set mp_ind '''f2000000-0000-0000-0000-000000000001'''
\set mp_fam '''f2000000-0000-0000-0000-000000000002'''

INSERT INTO membership_plans (id, product_id, venue_id, name, billing_cycle, price, max_members, is_family_plan, created_by) VALUES
(:mp_ind, :p_mem_ind, :vid, 'FunZone Individual Monthly',  'monthly', 1499.00, 1, false, :uid_admin),
(:mp_fam, :p_mem_fam, :vid, 'FunZone Family Annual',       'annual',  9999.00, 5, true,  :uid_admin);

-- Benefits
INSERT INTO membership_benefits (membership_plan_id, benefit_type, product_category, discount_percent) VALUES
(:mp_ind, 'discount', 'ticket',         15.00),
(:mp_ind, 'discount', 'food_beverage',  10.00),
(:mp_fam, 'discount', 'ticket',         20.00),
(:mp_fam, 'discount', 'food_beverage',  15.00),
(:mp_fam, 'discount', 'retail',         10.00);

INSERT INTO membership_benefits (membership_plan_id, benefit_type, allowance_quantity, allowance_unit, allowance_reset_cycle) VALUES
(:mp_ind, 'allowance', 4,  'visits', 'monthly'),
(:mp_fam, 'allowance', 12, 'visits', 'monthly');

-- Rajesh's active individual membership
INSERT INTO memberships (order_item_id, membership_plan_id, account_id, status, started_at, current_period_start, current_period_end, next_billing_date) VALUES
(:oi10, :mp_ind, :acc01, 'active', now(), CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days');

-- Link person as member
INSERT INTO membership_members (membership_id, person_id, is_primary)
SELECT m.id, :per01, true FROM memberships m WHERE m.account_id = :acc01 LIMIT 1;

-- Allowance balance
INSERT INTO membership_allowance_balances (membership_id, membership_benefit_id, period_start, period_end, total_allowance, used_allowance, remaining_allowance)
SELECT m.id, mb.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 4, 1, 3
FROM memberships m
JOIN membership_benefits mb ON mb.membership_plan_id = m.membership_plan_id AND mb.benefit_type = 'allowance'
WHERE m.account_id = :acc01;

-- ══════════════════════════════════════════════════════════════════════════════
-- F&B SETUP
-- ══════════════════════════════════════════════════════════════════════════════

-- Categories
\set cat_main '''f3000000-0000-0000-0000-000000000001'''
\set cat_sides '''f3000000-0000-0000-0000-000000000002'''
\set cat_drinks '''f3000000-0000-0000-0000-000000000003'''
\set cat_dessert '''f3000000-0000-0000-0000-000000000004'''

INSERT INTO fnb_categories (id, venue_id, name, display_order) VALUES
(:cat_main,    :vid, 'Main Course',  1),
(:cat_sides,   :vid, 'Sides',        2),
(:cat_drinks,  :vid, 'Beverages',    3),
(:cat_dessert, :vid, 'Desserts',     4);

-- Preparation Stations
\set ps_grill '''f4000000-0000-0000-0000-000000000001'''
\set ps_bev '''f4000000-0000-0000-0000-000000000002'''
\set ps_dessert '''f4000000-0000-0000-0000-000000000003'''

INSERT INTO preparation_stations (id, venue_id, name, device_id) VALUES
(:ps_grill,   :vid, 'Grill Station',      :dev_kds1),
(:ps_bev,     :vid, 'Beverages Station',   :dev_kds2),
(:ps_dessert, :vid, 'Desserts Station',    :dev_kds2);

-- FnB Items
INSERT INTO fnb_items (product_id, venue_id, category_id, preparation_station_id, preparation_time_minutes) VALUES
(:p_burger,   :vid, :cat_main,    :ps_grill,   12),
(:p_pizza,    :vid, :cat_main,    :ps_grill,   15),
(:p_fries,    :vid, :cat_sides,   :ps_grill,   8),
(:p_nachos,   :vid, :cat_sides,   :ps_grill,   10),
(:p_coke,     :vid, :cat_drinks,  :ps_bev,     2),
(:p_juice,    :vid, :cat_drinks,  :ps_bev,     5),
(:p_coffee,   :vid, :cat_drinks,  :ps_bev,     4),
(:p_icecream, :vid, :cat_dessert, :ps_dessert, 3);

-- FnB Inventory
INSERT INTO fnb_inventory (venue_id, fnb_item_id, current_stock, stock_unit, low_stock_threshold)
SELECT :vid, fi.id,
    CASE WHEN fi.product_id IN (:p_coke, :p_juice) THEN 200
         WHEN fi.product_id = :p_coffee THEN 100
         ELSE 50 END,
    CASE WHEN fi.product_id IN (:p_coke, :p_juice) THEN 'bottles'
         WHEN fi.product_id = :p_coffee THEN 'cups'
         ELSE 'units' END,
    CASE WHEN fi.product_id IN (:p_coke, :p_juice) THEN 30
         ELSE 10 END
FROM fnb_items fi;

-- Sample kitchen orders
INSERT INTO kitchen_orders (order_id, preparation_station_id, status, created_at, started_at, ready_at, served_at) VALUES
(:ord03, :ps_grill,  'served', now() - INTERVAL '1 day', now() - INTERVAL '1 day' + INTERVAL '2 minutes', now() - INTERVAL '1 day' + INTERVAL '14 minutes', now() - INTERVAL '1 day' + INTERVAL '18 minutes'),
(:ord09, :ps_grill,  'served', now(), now() + INTERVAL '1 minute', now() + INTERVAL '16 minutes', now() + INTERVAL '20 minutes');

-- ══════════════════════════════════════════════════════════════════════════════
-- RETAIL SETUP
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO retail_items (product_id, venue_id, sku, name, barcode, variant_attributes) VALUES
(:p_tshirt,  :vid, 'RET-TSHIRT-M-BLK', 'FunZone T-Shirt M Black', '8901234500001', '{"size":"M","color":"Black"}'),
(:p_tshirt,  :vid, 'RET-TSHIRT-L-BLK', 'FunZone T-Shirt L Black', '8901234500002', '{"size":"L","color":"Black"}'),
(:p_tshirt,  :vid, 'RET-TSHIRT-M-WHT', 'FunZone T-Shirt M White', '8901234500003', '{"size":"M","color":"White"}'),
(:p_cap,     :vid, 'RET-CAP-BLU',      'FunZone Cap Blue',        '8901234500004', '{"color":"Blue"}'),
(:p_cap,     :vid, 'RET-CAP-RED',      'FunZone Cap Red',         '8901234500005', '{"color":"Red"}'),
(:p_mug,     :vid, 'RET-MUG-STD',      'FunZone Mug Standard',   '8901234500006', NULL),
(:p_plush,   :vid, 'RET-PLUSH-LION',   'Plush Lion',             '8901234500007', '{"animal":"Lion"}'),
(:p_plush,   :vid, 'RET-PLUSH-PANDA',  'Plush Panda',            '8901234500008', '{"animal":"Panda"}'),
(:p_keychain,:vid, 'RET-KEY-METAL',    'FunZone Metal Keychain', '8901234500009', NULL);

-- Retail Inventory
INSERT INTO retail_inventory (retail_item_id, current_stock, low_stock_threshold)
SELECT ri.id,
    CASE WHEN ri.sku LIKE '%TSHIRT%' THEN 25
         WHEN ri.sku LIKE '%CAP%' THEN 40
         WHEN ri.sku LIKE '%MUG%' THEN 30
         WHEN ri.sku LIKE '%PLUSH%' THEN 15
         ELSE 50 END,
    5
FROM retail_items ri;

-- Record retail sale from Order 8
INSERT INTO retail_inventory_transactions (retail_inventory_id, order_item_id, transaction_type, quantity_delta, created_by)
SELECT ri_inv.id, :oi08a, 'sale', -1, :uid_retail
FROM retail_items ri
JOIN retail_inventory ri_inv ON ri_inv.retail_item_id = ri.id
WHERE ri.sku = 'RET-TSHIRT-M-BLK';

INSERT INTO retail_inventory_transactions (retail_inventory_id, order_item_id, transaction_type, quantity_delta, created_by)
SELECT ri_inv.id, :oi08b, 'sale', -1, :uid_retail
FROM retail_items ri
JOIN retail_inventory ri_inv ON ri_inv.retail_item_id = ri.id
WHERE ri.sku = 'RET-PLUSH-LION';

-- ══════════════════════════════════════════════════════════════════════════════
-- DONATIONS & ADOPTIONS
-- ══════════════════════════════════════════════════════════════════════════════

\set dc1 '''f5000000-0000-0000-0000-000000000001'''
\set dc2 '''f5000000-0000-0000-0000-000000000002'''

INSERT INTO donation_causes (id, venue_id, name, description) VALUES
(:dc1, :vid, 'Wildlife Conservation Fund',   'Support endangered species through habitat preservation and breeding programmes'),
(:dc2, :vid, 'Green Planet Initiative',       'Reduce our carbon footprint and promote sustainable entertainment');

INSERT INTO donations (order_item_id, donation_cause_id, account_id, amount, donation_type) VALUES
(:oi07, :dc1, :acc06, 500.00, 'one_time');

-- Adoptees
\set adpt1 '''f6000000-0000-0000-0000-000000000001'''
\set adpt2 '''f6000000-0000-0000-0000-000000000002'''
\set adpt3 '''f6000000-0000-0000-0000-000000000003'''

INSERT INTO adoptees (id, venue_id, name, species, adoptee_type, description) VALUES
(:adpt1, :vid, 'Simba',    'African Lion',   'animal',  'A majestic 5-year-old male lion who loves sunbathing'),
(:adpt2, :vid, 'Bamboo',   'Red Panda',      'animal',  'A playful 3-year-old red panda with a fluffy tail'),
(:adpt3, :vid, 'Butterfly Garden', NULL,      'exhibit', 'A tropical butterfly enclosure with 200+ species');

-- ══════════════════════════════════════════════════════════════════════════════
-- REDEMPTION CARDS
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO redemption_cards (venue_id, account_id, card_type, code, total_visits, remaining_visits) VALUES
(:vid, :acc01, 'visit_based', 'RC-FZ-VIS-00001', 10, 7),
(:vid, :acc02, 'visit_based', 'RC-FZ-VIS-00002', 10, 10),
(:vid, :acc03, 'credit_based','RC-FZ-CRD-00001', NULL, NULL);

UPDATE redemption_cards SET credit_balance = 500.00 WHERE code = 'RC-FZ-CRD-00001';

-- Record some visit punches for acc01
INSERT INTO redemption_card_transactions (redemption_card_id, transaction_type, visits_delta)
SELECT id, 'redemption', -1 FROM redemption_cards WHERE code = 'RC-FZ-VIS-00001';
INSERT INTO redemption_card_transactions (redemption_card_id, transaction_type, visits_delta)
SELECT id, 'redemption', -1 FROM redemption_cards WHERE code = 'RC-FZ-VIS-00001';
INSERT INTO redemption_card_transactions (redemption_card_id, transaction_type, visits_delta)
SELECT id, 'redemption', -1 FROM redemption_cards WHERE code = 'RC-FZ-VIS-00001';
