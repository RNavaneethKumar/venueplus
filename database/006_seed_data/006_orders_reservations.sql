-- ============================================================================
-- VenuePlus Seed Data — Orders, Payments, Reservations
-- ============================================================================
-- Mix of POS, Online, and Kiosk orders across ticket types, F&B, and retail
-- ============================================================================

\set vid '''c0000000-0000-0000-0000-000000000001'''
\set uid_cashier1 '''a0000000-0000-0000-0000-000000000004'''
\set uid_cashier2 '''a0000000-0000-0000-0000-000000000005'''
\set tc_cgst '''d1000000-0000-0000-0000-000000000001'''
\set tc_sgst '''d1000000-0000-0000-0000-000000000002'''
\set vt_adult '''d3000000-0000-0000-0000-000000000001'''
\set vt_child '''d3000000-0000-0000-0000-000000000002'''
\set res_jump '''e1000000-0000-0000-0000-000000000001'''
\set res_laser '''e1000000-0000-0000-0000-000000000002'''
\set res_zoo '''e1000000-0000-0000-0000-000000000006'''
\set acc01 '''aa000000-0000-0000-0000-000000000001'''
\set acc02 '''aa000000-0000-0000-0000-000000000002'''
\set acc03 '''aa000000-0000-0000-0000-000000000003'''
\set acc04 '''aa000000-0000-0000-0000-000000000004'''
\set acc05 '''aa000000-0000-0000-0000-000000000005'''
\set acc06 '''aa000000-0000-0000-0000-000000000006'''
\set acc07 '''aa000000-0000-0000-0000-000000000007'''
\set per01 '''ab000000-0000-0000-0000-000000000001'''
\set per01_kid1 '''ab000000-0000-0000-0000-000000000011'''
\set per02 '''ab000000-0000-0000-0000-000000000002'''
\set per02_kid1 '''ab000000-0000-0000-0000-000000000014'''
\set per03 '''ab000000-0000-0000-0000-000000000003'''
\set per04 '''ab000000-0000-0000-0000-000000000004'''
\set per05 '''ab000000-0000-0000-0000-000000000005'''
\set per06 '''ab000000-0000-0000-0000-000000000006'''
\set per07 '''ab000000-0000-0000-0000-000000000007'''

\set p_jump1hr '''f1000000-0000-0000-0000-000000000001'''
\set p_laser '''f1000000-0000-0000-0000-000000000003'''
\set p_zoo_day '''f1000000-0000-0000-0000-000000000006'''
\set p_water_day '''f1000000-0000-0000-0000-000000000007'''
\set p_combo_all '''f1000000-0000-0000-0000-000000000008'''
\set p_burger '''f1000000-0000-0000-0000-000000000020'''
\set p_coke '''f1000000-0000-0000-0000-000000000023'''
\set p_pizza '''f1000000-0000-0000-0000-000000000021'''
\set p_fries '''f1000000-0000-0000-0000-000000000022'''
\set p_tshirt '''f1000000-0000-0000-0000-000000000030'''
\set p_plush '''f1000000-0000-0000-0000-000000000033'''
\set p_gc1000 '''f1000000-0000-0000-0000-000000000015'''
\set p_wallet500 '''f1000000-0000-0000-0000-000000000012'''
\set p_donate '''f1000000-0000-0000-0000-000000000017'''
\set p_mem_ind '''f1000000-0000-0000-0000-000000000010'''

-- ── Order 1: Online — Rajesh family buys Jump 1HR (2 adults + 1 child) ───────

\set ord01 '''01000000-0000-0000-0000-000000000001'''
\set oi01a '''01100000-0000-0000-0000-000000000001'''
\set oi01b '''01100000-0000-0000-0000-000000000002'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_at) VALUES
(:ord01, 'ORD-20260305-000001', :vid, :acc01, 'sale', 'paid', 'INR', 1647.00, 0, 296.46, 1943.46, 'online', now() - INTERVAL '1 day');

INSERT INTO order_items (id, order_id, product_id, visitor_type_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi01a, :ord01, :p_jump1hr, :vt_adult, 2, 599.00, 0, 215.64, 1413.64),
(:oi01b, :ord01, :p_jump1hr, :vt_child, 1, 449.00, 0, 80.82,  529.82);

INSERT INTO order_item_tax_components (order_item_id, tax_component_id, tax_rate_percent, tax_amount) VALUES
(:oi01a, :tc_cgst, 9.00, 107.82),
(:oi01a, :tc_sgst, 9.00, 107.82),
(:oi01b, :tc_cgst, 9.00, 40.41),
(:oi01b, :tc_sgst, 9.00, 40.41);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord01, 'upi', 1943.46, 'completed');

-- Reservations for Jump
INSERT INTO reservations (order_item_id, product_id, resource_id, visitor_type_id, person_id, reservation_type, usage_type, duration_minutes, valid_from, valid_until, status) VALUES
(:oi01a, :p_jump1hr, :res_jump, :vt_adult, :per01,      'duration_bound', 'time_limited', 60, now() - INTERVAL '1 day' + INTERVAL '10 hours', now() - INTERVAL '1 day' + INTERVAL '11 hours', 'consumed'),
(:oi01a, :p_jump1hr, :res_jump, :vt_adult, NULL,         'duration_bound', 'time_limited', 60, now() - INTERVAL '1 day' + INTERVAL '10 hours', now() - INTERVAL '1 day' + INTERVAL '11 hours', 'confirmed'),
(:oi01b, :p_jump1hr, :res_jump, :vt_child, :per01_kid1,  'duration_bound', 'time_limited', 60, now() - INTERVAL '1 day' + INTERVAL '10 hours', now() - INTERVAL '1 day' + INTERVAL '11 hours', 'consumed');

-- ── Order 2: POS — Walk-in Laser Tag (anonymous, 4 adults) ──────────────────

\set ord02 '''01000000-0000-0000-0000-000000000002'''
\set oi02 '''01100000-0000-0000-0000-000000000003'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_by, created_at) VALUES
(:ord02, 'ORD-20260305-000002', :vid, NULL, 'sale', 'paid', 'INR', 1796.00, 0, 323.28, 2119.28, 'pos', :uid_cashier1, now() - INTERVAL '1 day');

INSERT INTO order_items (id, order_id, product_id, visitor_type_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi02, :ord02, :p_laser, :vt_adult, 4, 449.00, 0, 323.28, 2119.28);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord02, 'card', 2119.28, 'completed');

-- Reservations for laser tag (slot-bound, pick first available slot today-1)
INSERT INTO reservations (order_item_id, product_id, resource_id, resource_slot_id, visitor_type_id, reservation_type, usage_type, valid_from, valid_until, status)
SELECT :oi02, :p_laser, :res_laser, rs.id, :vt_adult,
       'slot_bound', 'single_use',
       (rs.slot_date || ' ' || rs.start_time)::TIMESTAMPTZ,
       (rs.slot_date || ' ' || rs.end_time)::TIMESTAMPTZ,
       'consumed'
FROM resource_slots rs
WHERE rs.resource_id = :res_laser
  AND rs.slot_date = CURRENT_DATE - 1
  AND rs.start_time = '14:00'
LIMIT 1;

-- ── Order 3: Kiosk — Zoo Day + F&B combo ────────────────────────────────────

\set ord03 '''01000000-0000-0000-0000-000000000003'''
\set oi03a '''01100000-0000-0000-0000-000000000004'''
\set oi03b '''01100000-0000-0000-0000-000000000005'''
\set oi03c '''01100000-0000-0000-0000-000000000006'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_at) VALUES
(:ord03, 'ORD-20260305-000003', :vid, :acc03, 'sale', 'paid', 'INR', 627.00, 0, 57.79, 684.79, 'kiosk', now() - INTERVAL '1 day');

INSERT INTO order_items (id, order_id, product_id, visitor_type_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi03a, :ord03, :p_zoo_day, :vt_adult,  1, 299.00, 0, 53.82, 352.82),
(:oi03b, :ord03, :p_burger,  NULL,        1, 249.00, 0, 12.45, 261.45),
(:oi03c, :ord03, :p_coke,    NULL,        1, 79.00,  0, 3.95,  82.95);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord03, 'upi', 684.79, 'completed');

INSERT INTO reservations (order_item_id, product_id, resource_id, visitor_type_id, person_id, reservation_type, usage_type, valid_from, valid_until, status) VALUES
(:oi03a, :p_zoo_day, :res_zoo, :vt_adult, :per03, 'access_bound', 'multi_entry', (CURRENT_DATE - 1)::TIMESTAMPTZ, (CURRENT_DATE - 1 + INTERVAL '23 hours 59 minutes')::TIMESTAMPTZ, 'consumed');

-- ── Order 4: Online — Priya buys Water Day for family ────────────────────────

\set ord04 '''01000000-0000-0000-0000-000000000004'''
\set oi04a '''01100000-0000-0000-0000-000000000007'''
\set oi04b '''01100000-0000-0000-0000-000000000008'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_at) VALUES
(:ord04, 'ORD-20260306-000004', :vid, :acc02, 'sale', 'paid', 'INR', 1398.00, 0, 251.64, 1649.64, 'online', now());

INSERT INTO order_items (id, order_id, product_id, visitor_type_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi04a, :ord04, :p_water_day, :vt_adult, 1, 799.00, 0, 143.82, 942.82),
(:oi04b, :ord04, :p_water_day, :vt_child, 1, 599.00, 0, 107.82, 706.82);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord04, 'card', 1649.64, 'completed');

INSERT INTO reservations (order_item_id, product_id, resource_id, visitor_type_id, person_id, reservation_type, usage_type, valid_from, valid_until, status) VALUES
(:oi04a, :p_water_day, :res_jump, :vt_adult, :per02, 'access_bound', 'multi_entry', CURRENT_DATE::TIMESTAMPTZ, (CURRENT_DATE + INTERVAL '23 hours 59 minutes')::TIMESTAMPTZ, 'confirmed'),
(:oi04b, :p_water_day, :res_jump, :vt_child, :per02_kid1, 'access_bound', 'multi_entry', CURRENT_DATE::TIMESTAMPTZ, (CURRENT_DATE + INTERVAL '23 hours 59 minutes')::TIMESTAMPTZ, 'confirmed');

-- ── Order 5: POS — Gift Card purchase ────────────────────────────────────────

\set ord05 '''01000000-0000-0000-0000-000000000005'''
\set oi05 '''01100000-0000-0000-0000-000000000009'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_by, created_at) VALUES
(:ord05, 'ORD-20260306-000005', :vid, :acc04, 'sale', 'paid', 'INR', 1000.00, 0, 180.00, 1180.00, 'pos', :uid_cashier1, now());

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi05, :ord05, :p_gc1000, 1, 1000.00, 0, 180.00, 1180.00);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord05, 'cash', 1180.00, 'completed');

-- Gift card issued
INSERT INTO gift_cards (venue_id, code, order_item_id, issued_to_account_id, face_value, current_balance, currency_code) VALUES
(:vid, 'GC-FZ-2026-00001', :oi05, :acc04, 1000.00, 1000.00, 'INR');

INSERT INTO gift_card_transactions (gift_card_id, transaction_type, amount, balance_after)
SELECT id, 'issue', 1000.00, 1000.00 FROM gift_cards WHERE code = 'GC-FZ-2026-00001';

-- ── Order 6: Online — Wallet Load ────────────────────────────────────────────

\set ord06 '''01000000-0000-0000-0000-000000000006'''
\set oi06 '''01100000-0000-0000-0000-000000000010'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_at) VALUES
(:ord06, 'ORD-20260306-000006', :vid, :acc05, 'sale', 'paid', 'INR', 500.00, 0, 90.00, 590.00, 'online', now());

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi06, :ord06, :p_wallet500, 1, 500.00, 0, 90.00, 590.00);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord06, 'upi', 590.00, 'completed');

-- Create wallet and credit
INSERT INTO wallets (account_id, venue_id, real_cash_balance) VALUES
(:acc05, :vid, 500.00);

INSERT INTO wallet_transactions (wallet_id, order_item_id, transaction_type, balance_type, amount, balance_after, reference)
SELECT w.id, :oi06, 'credit', 'real_cash', 500.00, 500.00, 'Wallet load via order ORD-20260306-000006'
FROM wallets w WHERE w.account_id = :acc05;

-- ── Order 7: POS — Donation ─────────────────────────────────────────────────

\set ord07 '''01000000-0000-0000-0000-000000000007'''
\set oi07 '''01100000-0000-0000-0000-000000000011'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_by, created_at) VALUES
(:ord07, 'ORD-20260306-000007', :vid, :acc06, 'sale', 'paid', 'INR', 500.00, 0, 0, 500.00, 'pos', :uid_cashier2, now());

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi07, :ord07, :p_donate, 1, 500.00, 0, 0, 500.00);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord07, 'cash', 500.00, 'completed');

-- ── Order 8: POS — Retail purchase (T-shirt + plush) ─────────────────────────

\set ord08 '''01000000-0000-0000-0000-000000000008'''
\set oi08a '''01100000-0000-0000-0000-000000000012'''
\set oi08b '''01100000-0000-0000-0000-000000000013'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_by, created_at) VALUES
(:ord08, 'ORD-20260306-000008', :vid, :acc07, 'sale', 'paid', 'INR', 1398.00, 0, 167.76, 1565.76, 'pos', :uid_cashier1, now());

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi08a, :ord08, :p_tshirt, 1, 799.00, 0, 95.88, 894.88),
(:oi08b, :ord08, :p_plush,  1, 599.00, 0, 71.88, 670.88);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord08, 'card', 1565.76, 'completed');

-- ── Order 9: Online — F&B only (Pizza + Fries + Coke) ───────────────────────

\set ord09 '''01000000-0000-0000-0000-000000000009'''
\set oi09a '''01100000-0000-0000-0000-000000000014'''
\set oi09b '''01100000-0000-0000-0000-000000000015'''
\set oi09c '''01100000-0000-0000-0000-000000000016'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_at) VALUES
(:ord09, 'ORD-20260306-000009', :vid, :acc01, 'sale', 'paid', 'INR', 557.00, 0, 27.85, 584.85, 'online', now());

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi09a, :ord09, :p_pizza, 1, 349.00, 0, 17.45, 366.45),
(:oi09b, :ord09, :p_fries, 1, 129.00, 0, 6.45,  135.45),
(:oi09c, :ord09, :p_coke,  1, 79.00,  0, 3.95,  82.95);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord09, 'wallet', 584.85, 'completed');

-- ── Order 10: Online — Membership purchase ───────────────────────────────────

\set ord10 '''01000000-0000-0000-0000-000000000010'''
\set oi10 '''01100000-0000-0000-0000-000000000017'''

INSERT INTO orders (id, order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_at) VALUES
(:ord10, 'ORD-20260306-000010', :vid, :acc01, 'sale', 'paid', 'INR', 1499.00, 0, 269.82, 1768.82, 'online', now());

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, discount_amount, tax_amount, total_amount) VALUES
(:oi10, :ord10, :p_mem_ind, 1, 1499.00, 0, 269.82, 1768.82);

INSERT INTO order_payments (order_id, payment_method, amount, status) VALUES
(:ord10, 'card', 1768.82, 'completed');

-- ── Generate 90 more mixed orders for volume ─────────────────────────────────

INSERT INTO orders (order_number, venue_id, account_id, order_type, status, currency_code, subtotal_amount, discount_amount, tax_amount, total_amount, source_channel, created_at)
SELECT
    'ORD-' || to_char(CURRENT_DATE - (s % 7), 'YYYYMMDD') || '-' || lpad((s + 10)::TEXT, 6, '0'),
    :vid,
    (SELECT id FROM accounts WHERE venue_id = :vid ORDER BY random() LIMIT 1),
    'sale',
    'paid',
    'INR',
    (300 + (random() * 2000))::NUMERIC(12,2),
    0,
    ((300 + (random() * 2000)) * 0.18)::NUMERIC(12,2),
    ((300 + (random() * 2000)) * 1.18)::NUMERIC(12,2),
    (ARRAY['pos','online','kiosk']::sales_channel[])[1 + (s % 3)],
    now() - ((s % 7)::TEXT || ' days')::INTERVAL - ((s * 37 % 720)::TEXT || ' minutes')::INTERVAL
FROM generate_series(1, 90) AS s;

-- Add order items for the generated orders
INSERT INTO order_items (order_id, product_id, visitor_type_id, quantity, unit_price, discount_amount, tax_amount, total_amount)
SELECT
    o.id,
    (SELECT id FROM products WHERE venue_id = :vid AND product_type = 'ticket' ORDER BY random() LIMIT 1),
    :vt_adult,
    1 + (row_number() OVER () % 3)::INT,
    o.subtotal_amount,
    0,
    o.tax_amount,
    o.total_amount
FROM orders o
WHERE o.order_number LIKE 'ORD-%-0000%'
  AND o.id NOT IN (:ord01,:ord02,:ord03,:ord04,:ord05,:ord06,:ord07,:ord08,:ord09,:ord10);

-- Add payments for generated orders
INSERT INTO order_payments (order_id, payment_method, amount, status)
SELECT
    o.id,
    (ARRAY['cash','card','upi']::payment_method[])[1 + (row_number() OVER () % 3)],
    o.total_amount,
    'completed'
FROM orders o
WHERE o.id NOT IN (SELECT order_id FROM order_payments);

-- Order status history for all paid orders
INSERT INTO order_status_history (order_id, previous_status, new_status, changed_at)
SELECT id, 'pending', 'paid', created_at FROM orders WHERE status = 'paid';
