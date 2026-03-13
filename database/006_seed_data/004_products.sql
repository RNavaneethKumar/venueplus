-- ============================================================================
-- VenuePlus Seed Data — Products, Prices, Reservation Config
-- ============================================================================

\set vid '''c0000000-0000-0000-0000-000000000001'''
\set uid_admin '''a0000000-0000-0000-0000-000000000002'''
\set ts_gst18 '''d2000000-0000-0000-0000-000000000001'''
\set ts_gst12 '''d2000000-0000-0000-0000-000000000002'''
\set ts_gst5  '''d2000000-0000-0000-0000-000000000003'''
\set ts_gst0  '''d2000000-0000-0000-0000-000000000004'''
\set vt_adult    '''d3000000-0000-0000-0000-000000000001'''
\set vt_child    '''d3000000-0000-0000-0000-000000000002'''
\set vt_senior   '''d3000000-0000-0000-0000-000000000003'''
\set vt_toddler  '''d3000000-0000-0000-0000-000000000004'''
\set vt_spectator '''d3000000-0000-0000-0000-000000000005'''
\set res_jump    '''e1000000-0000-0000-0000-000000000001'''
\set res_laser   '''e1000000-0000-0000-0000-000000000002'''
\set res_escape  '''e1000000-0000-0000-0000-000000000003'''
\set res_arcade  '''e1000000-0000-0000-0000-000000000004'''
\set res_softplay '''e1000000-0000-0000-0000-000000000005'''
\set res_zoo     '''e1000000-0000-0000-0000-000000000006'''
\set res_waterslide '''e1000000-0000-0000-0000-000000000007'''
\set res_wavepool '''e1000000-0000-0000-0000-000000000008'''

-- ── Ticket Products ──────────────────────────────────────────────────────────

\set p_jump1hr   '''f1000000-0000-0000-0000-000000000001'''
\set p_jump2hr   '''f1000000-0000-0000-0000-000000000002'''
\set p_laser     '''f1000000-0000-0000-0000-000000000003'''
\set p_escape    '''f1000000-0000-0000-0000-000000000004'''
\set p_softplay  '''f1000000-0000-0000-0000-000000000005'''
\set p_zoo_day   '''f1000000-0000-0000-0000-000000000006'''
\set p_water_day '''f1000000-0000-0000-0000-000000000007'''
\set p_combo_all '''f1000000-0000-0000-0000-000000000008'''
\set p_arcade_card '''f1000000-0000-0000-0000-000000000009'''

-- Membership products
\set p_mem_ind   '''f1000000-0000-0000-0000-000000000010'''
\set p_mem_fam   '''f1000000-0000-0000-0000-000000000011'''

-- Wallet load
\set p_wallet500  '''f1000000-0000-0000-0000-000000000012'''
\set p_wallet1000 '''f1000000-0000-0000-0000-000000000013'''

-- Gift cards
\set p_gc500     '''f1000000-0000-0000-0000-000000000014'''
\set p_gc1000    '''f1000000-0000-0000-0000-000000000015'''
\set p_gc2000    '''f1000000-0000-0000-0000-000000000016'''

-- Donation
\set p_donate    '''f1000000-0000-0000-0000-000000000017'''

-- Adoption
\set p_adopt     '''f1000000-0000-0000-0000-000000000018'''

-- F&B
\set p_burger    '''f1000000-0000-0000-0000-000000000020'''
\set p_pizza     '''f1000000-0000-0000-0000-000000000021'''
\set p_fries     '''f1000000-0000-0000-0000-000000000022'''
\set p_coke      '''f1000000-0000-0000-0000-000000000023'''
\set p_juice     '''f1000000-0000-0000-0000-000000000024'''
\set p_icecream  '''f1000000-0000-0000-0000-000000000025'''
\set p_coffee    '''f1000000-0000-0000-0000-000000000026'''
\set p_nachos    '''f1000000-0000-0000-0000-000000000027'''

-- Retail
\set p_tshirt    '''f1000000-0000-0000-0000-000000000030'''
\set p_cap       '''f1000000-0000-0000-0000-000000000031'''
\set p_mug       '''f1000000-0000-0000-0000-000000000032'''
\set p_plush     '''f1000000-0000-0000-0000-000000000033'''
\set p_keychain  '''f1000000-0000-0000-0000-000000000034'''

INSERT INTO products (id, venue_id, name, code, product_type, created_by) VALUES
-- Tickets
(:p_jump1hr,    :vid, '1-Hour Jump Pass',         'JUMP-1HR',    'ticket',         :uid_admin),
(:p_jump2hr,    :vid, '2-Hour Jump Pass',         'JUMP-2HR',    'ticket',         :uid_admin),
(:p_laser,      :vid, 'Laser Tag Session',        'LASER-30',    'ticket',         :uid_admin),
(:p_escape,     :vid, 'Escape Room Adventure',    'ESCAPE-60',   'ticket',         :uid_admin),
(:p_softplay,   :vid, 'Soft Play Pass',           'SOFT-2HR',    'ticket',         :uid_admin),
(:p_zoo_day,    :vid, 'Mini Zoo Day Pass',        'ZOO-DAY',     'ticket',         :uid_admin),
(:p_water_day,  :vid, 'Water Zone Day Pass',      'WATER-DAY',   'ticket',         :uid_admin),
(:p_combo_all,  :vid, 'FunZone All Access Pass',  'COMBO-ALL',   'ticket',         :uid_admin),
(:p_arcade_card,:vid, 'Arcade Play Card',         'ARC-CARD',    'ticket',         :uid_admin),
-- Membership
(:p_mem_ind,    :vid, 'Individual Monthly',        'MEM-IND-M',  'membership',     :uid_admin),
(:p_mem_fam,    :vid, 'Family Annual',             'MEM-FAM-A',  'membership',     :uid_admin),
-- Wallet
(:p_wallet500,  :vid, 'Wallet Load ₹500',         'WAL-500',    'wallet_load',    :uid_admin),
(:p_wallet1000, :vid, 'Wallet Load ₹1000',        'WAL-1000',   'wallet_load',    :uid_admin),
-- Gift Cards
(:p_gc500,      :vid, 'Gift Card ₹500',           'GC-500',     'gift_card',      :uid_admin),
(:p_gc1000,     :vid, 'Gift Card ₹1000',          'GC-1000',    'gift_card',      :uid_admin),
(:p_gc2000,     :vid, 'Gift Card ₹2000',          'GC-2000',    'gift_card',      :uid_admin),
-- Donations
(:p_donate,     :vid, 'Conservation Donation',     'DONATE',     'donation',       :uid_admin),
-- Adoptions
(:p_adopt,      :vid, 'Animal Sponsorship',        'ADOPT',      'adoption',       :uid_admin),
-- F&B
(:p_burger,     :vid, 'Classic Burger',            'FNB-BURG',   'food_beverage',  :uid_admin),
(:p_pizza,      :vid, 'Margherita Pizza',          'FNB-PIZZA',  'food_beverage',  :uid_admin),
(:p_fries,      :vid, 'French Fries',              'FNB-FRIES',  'food_beverage',  :uid_admin),
(:p_coke,       :vid, 'Coca-Cola 350ml',           'FNB-COKE',   'food_beverage',  :uid_admin),
(:p_juice,      :vid, 'Fresh Orange Juice',        'FNB-JUICE',  'food_beverage',  :uid_admin),
(:p_icecream,   :vid, 'Ice Cream Sundae',          'FNB-ICE',    'food_beverage',  :uid_admin),
(:p_coffee,     :vid, 'Cappuccino',                'FNB-COFFEE', 'food_beverage',  :uid_admin),
(:p_nachos,     :vid, 'Loaded Nachos',             'FNB-NACH',   'food_beverage',  :uid_admin),
-- Retail
(:p_tshirt,     :vid, 'FunZone T-Shirt',           'RET-TSHIRT', 'retail',         :uid_admin),
(:p_cap,        :vid, 'FunZone Cap',               'RET-CAP',    'retail',         :uid_admin),
(:p_mug,        :vid, 'FunZone Mug',               'RET-MUG',    'retail',         :uid_admin),
(:p_plush,      :vid, 'Plush Animal Toy',          'RET-PLUSH',  'retail',         :uid_admin),
(:p_keychain,   :vid, 'FunZone Keychain',          'RET-KEY',    'retail',         :uid_admin);

-- ── Product Prices (per visitor type and channel) ────────────────────────────

-- Ticket prices: online slightly cheaper than POS/kiosk
INSERT INTO product_prices (product_id, visitor_type_id, base_price, currency_code, sales_channel, created_by) VALUES
-- Jump 1HR
(:p_jump1hr, :vt_adult,   599.00,  'INR', 'online',  :uid_admin),
(:p_jump1hr, :vt_adult,   699.00,  'INR', 'pos',     :uid_admin),
(:p_jump1hr, :vt_adult,   649.00,  'INR', 'kiosk',   :uid_admin),
(:p_jump1hr, :vt_child,   449.00,  'INR', 'online',  :uid_admin),
(:p_jump1hr, :vt_child,   549.00,  'INR', 'pos',     :uid_admin),
(:p_jump1hr, :vt_child,   499.00,  'INR', 'kiosk',   :uid_admin),
(:p_jump1hr, :vt_toddler, 199.00,  'INR', NULL,      :uid_admin),
-- Jump 2HR
(:p_jump2hr, :vt_adult,   899.00,  'INR', 'online',  :uid_admin),
(:p_jump2hr, :vt_adult,   999.00,  'INR', 'pos',     :uid_admin),
(:p_jump2hr, :vt_child,   649.00,  'INR', 'online',  :uid_admin),
(:p_jump2hr, :vt_child,   749.00,  'INR', 'pos',     :uid_admin),
-- Laser Tag
(:p_laser,   :vt_adult,   399.00,  'INR', 'online',  :uid_admin),
(:p_laser,   :vt_adult,   449.00,  'INR', 'pos',     :uid_admin),
(:p_laser,   :vt_child,   299.00,  'INR', 'online',  :uid_admin),
(:p_laser,   :vt_child,   349.00,  'INR', 'pos',     :uid_admin),
-- Escape Room
(:p_escape,  :vt_adult,   799.00,  'INR', NULL,      :uid_admin),
(:p_escape,  :vt_child,   599.00,  'INR', NULL,      :uid_admin),
-- Soft Play
(:p_softplay,:vt_child,   349.00,  'INR', NULL,      :uid_admin),
(:p_softplay,:vt_toddler, 249.00,  'INR', NULL,      :uid_admin),
-- Zoo Day
(:p_zoo_day, :vt_adult,   299.00,  'INR', NULL,      :uid_admin),
(:p_zoo_day, :vt_child,   199.00,  'INR', NULL,      :uid_admin),
(:p_zoo_day, :vt_senior,  199.00,  'INR', NULL,      :uid_admin),
(:p_zoo_day, :vt_toddler, 0.00,    'INR', NULL,      :uid_admin),
-- Water Day
(:p_water_day, :vt_adult,   799.00, 'INR', NULL,     :uid_admin),
(:p_water_day, :vt_child,   599.00, 'INR', NULL,     :uid_admin),
-- Combo All Access
(:p_combo_all, :vt_adult,  1999.00, 'INR', 'online', :uid_admin),
(:p_combo_all, :vt_adult,  2299.00, 'INR', 'pos',    :uid_admin),
(:p_combo_all, :vt_child,  1499.00, 'INR', 'online', :uid_admin),
(:p_combo_all, :vt_child,  1799.00, 'INR', 'pos',    :uid_admin),
-- Arcade Card (no visitor type)
(:p_arcade_card, NULL,      200.00, 'INR', NULL,      :uid_admin),
-- Wallet loads
(:p_wallet500,  NULL, 500.00,  'INR', NULL, :uid_admin),
(:p_wallet1000, NULL, 1000.00, 'INR', NULL, :uid_admin),
-- Gift cards
(:p_gc500,  NULL, 500.00,  'INR', NULL, :uid_admin),
(:p_gc1000, NULL, 1000.00, 'INR', NULL, :uid_admin),
(:p_gc2000, NULL, 2000.00, 'INR', NULL, :uid_admin),
-- F&B
(:p_burger,   NULL, 249.00, 'INR', NULL, :uid_admin),
(:p_pizza,    NULL, 349.00, 'INR', NULL, :uid_admin),
(:p_fries,    NULL, 129.00, 'INR', NULL, :uid_admin),
(:p_coke,     NULL, 79.00,  'INR', NULL, :uid_admin),
(:p_juice,    NULL, 149.00, 'INR', NULL, :uid_admin),
(:p_icecream, NULL, 199.00, 'INR', NULL, :uid_admin),
(:p_coffee,   NULL, 179.00, 'INR', NULL, :uid_admin),
(:p_nachos,   NULL, 229.00, 'INR', NULL, :uid_admin),
-- Retail
(:p_tshirt,   NULL, 799.00, 'INR', NULL, :uid_admin),
(:p_cap,      NULL, 399.00, 'INR', NULL, :uid_admin),
(:p_mug,      NULL, 349.00, 'INR', NULL, :uid_admin),
(:p_plush,    NULL, 599.00, 'INR', NULL, :uid_admin),
(:p_keychain, NULL, 149.00, 'INR', NULL, :uid_admin);

-- ── Product Tax Structures ───────────────────────────────────────────────────

INSERT INTO product_tax_structures (product_id, tax_structure_id, created_by)
SELECT p.id, :ts_gst18, :uid_admin
FROM products p WHERE p.product_type IN ('ticket', 'membership');

INSERT INTO product_tax_structures (product_id, tax_structure_id, created_by)
SELECT p.id, :ts_gst5, :uid_admin
FROM products p WHERE p.product_type = 'food_beverage';

INSERT INTO product_tax_structures (product_id, tax_structure_id, created_by)
SELECT p.id, :ts_gst12, :uid_admin
FROM products p WHERE p.product_type = 'retail';

INSERT INTO product_tax_structures (product_id, tax_structure_id, created_by)
SELECT p.id, :ts_gst18, :uid_admin
FROM products p WHERE p.product_type IN ('wallet_load', 'gift_card');

INSERT INTO product_tax_structures (product_id, tax_structure_id, created_by)
SELECT p.id, :ts_gst0, :uid_admin
FROM products p WHERE p.product_type IN ('donation', 'adoption');

-- ── Product Reservation Config ───────────────────────────────────────────────

INSERT INTO product_reservation_config (product_id, reservation_type, usage_type, duration_minutes, requires_waiver, allows_reentry, created_by) VALUES
(:p_jump1hr,   'duration_bound', 'time_limited',  60,  true,  false, :uid_admin),
(:p_jump2hr,   'duration_bound', 'time_limited',  120, true,  false, :uid_admin),
(:p_laser,     'slot_bound',     'single_use',    NULL,true,  false, :uid_admin),
(:p_escape,    'slot_bound',     'single_use',    NULL,true,  false, :uid_admin),
(:p_softplay,  'duration_bound', 'time_limited',  120, true,  true,  :uid_admin),
(:p_zoo_day,   'access_bound',   'multi_entry',   NULL,false, true,  :uid_admin),
(:p_water_day, 'access_bound',   'multi_entry',   NULL,true,  true,  :uid_admin),
(:p_combo_all, 'access_bound',   'multi_entry',   NULL,true,  true,  :uid_admin),
(:p_arcade_card,'access_bound',  'multi_entry',   NULL,false, true,  :uid_admin);

-- ── Product–Resource Mapping ─────────────────────────────────────────────────

INSERT INTO product_resource_mapping (product_id, resource_id, is_primary, created_by) VALUES
(:p_jump1hr,    :res_jump,       true,  :uid_admin),
(:p_jump2hr,    :res_jump,       true,  :uid_admin),
(:p_laser,      :res_laser,      true,  :uid_admin),
(:p_escape,     :res_escape,     true,  :uid_admin),
(:p_softplay,   :res_softplay,   true,  :uid_admin),
(:p_zoo_day,    :res_zoo,        true,  :uid_admin),
(:p_water_day,  :res_waterslide, true,  :uid_admin),
(:p_water_day,  :res_wavepool,   false, :uid_admin),
(:p_arcade_card,:res_arcade,     true,  :uid_admin),
-- Combo maps to multiple resources
(:p_combo_all,  :res_jump,       true,  :uid_admin),
(:p_combo_all,  :res_laser,      false, :uid_admin),
(:p_combo_all,  :res_softplay,   false, :uid_admin),
(:p_combo_all,  :res_zoo,        false, :uid_admin),
(:p_combo_all,  :res_waterslide, false, :uid_admin),
(:p_combo_all,  :res_wavepool,   false, :uid_admin),
(:p_combo_all,  :res_arcade,     false, :uid_admin);
